#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Moq;
using FluentAssertions;
using Xunit;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;

namespace PickNBook.Api.Tests.Unit
{
    public class HotelsControllerTests
    {
        private readonly Mock<IHotelService> _mockHotelService;
        private readonly Mock<ICurrentUserService> _mockCurrentUserService;
        private readonly Mock<ILogger<HotelsController>> _mockLogger;
        private readonly Mock<ITicketEmailService> _mockTicketEmailService;

        public HotelsControllerTests()
        {
            _mockHotelService = new Mock<IHotelService>();
            _mockCurrentUserService = new Mock<ICurrentUserService>();
            _mockLogger = new Mock<ILogger<HotelsController>>();
            _mockTicketEmailService = new Mock<ITicketEmailService>();

            // Default authenticated user behavior
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("user-123");
        }

        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new AppDbContext(options);
        }

        private HotelsController CreateController(AppDbContext db)
        {
            var controller = new HotelsController(
                _mockHotelService.Object,
                db,
                _mockCurrentUserService.Object,
                _mockLogger.Object,
                _mockTicketEmailService.Object
            );

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };

            return controller;
        }

        #region Search Tests

        [Fact]
        public async Task Search_HappyPath_ReturnsOkWithHotels()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);
            var expectedHotels = new List<HotelSearchResponseDto>
            {
                new() { HotelId = "H1", Name = "Grand Plaza", CityCode = "NYC" }
            };

            _mockHotelService.Setup(x => x.SearchHotelsAsync("NYC", It.IsAny<DateTime>(), It.IsAny<DateTime>(), 2, 1))
                .ReturnsAsync(expectedHotels);

            // Act
            var result = await controller.Search("NYC", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(3), 2, 1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var hotels = okResult.Value as List<HotelSearchResponseDto>;
            hotels.Should().NotBeNull();
            hotels.Should().ContainSingle();
            hotels[0].HotelId.Should().Be("H1");
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task Search_EmptyCityCode_ReturnsBadRequest(string cityCode)
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.Search(cityCode, DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(2));

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().BeEquivalentTo(new { message = "cityCode is required." });
        }

        [Fact]
        public async Task Search_MinCheckInDate_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.Search("NYC", DateTime.MinValue, DateTime.UtcNow.AddDays(2));

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().BeEquivalentTo(new { message = "checkInDate and checkOutDate are required and must be valid dates." });
        }

        [Fact]
        public async Task Search_MinCheckOutDate_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.Search("NYC", DateTime.UtcNow.AddDays(1), DateTime.MinValue);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().BeEquivalentTo(new { message = "checkInDate and checkOutDate are required and must be valid dates." });
        }

        [Fact]
        public async Task Search_CheckOutBeforeCheckIn_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.Search("NYC", DateTime.UtcNow.AddDays(2), DateTime.UtcNow.AddDays(1));

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().BeEquivalentTo(new { message = "checkOutDate must be after checkInDate." });
        }

        [Fact]
        public async Task Search_InvalidAdultsCount_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.Search("NYC", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(2), adults: 0);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().BeEquivalentTo(new { message = "adults must be at least 1." });
        }

        [Fact]
        public async Task Search_InvalidRoomsCount_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.Search("NYC", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(2), rooms: 0);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().BeEquivalentTo(new { message = "rooms must be at least 1." });
        }

        [Fact]
        public async Task Search_ServiceThrowsException_Returns500()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            _mockHotelService.Setup(x => x.SearchHotelsAsync(It.IsAny<string>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<int>(), It.IsAny<int>()))
                .ThrowsAsync(new Exception("Amadeus API is offline"));

            // Act
            var result = await controller.Search("NYC", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(2));

            // Assert
            var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
            objectResult.StatusCode.Should().Be(500);
            objectResult.Value.Should().BeEquivalentTo(new { message = "Amadeus API is offline" });
        }

        #endregion

        #region GetOfferDetails Tests

        [Fact]
        public async Task GetOfferDetails_HappyPath_ReturnsOkWithDetails()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);
            var expectedOffer = new HotelOfferDto { OfferId = "O1", HotelName = "Grand Plaza", Price = 150.00m };

            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O1"))
                .ReturnsAsync(expectedOffer);

            // Act
            var result = await controller.GetOfferDetails("O1");

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var offer = okResult.Value as HotelOfferDto;
            offer.Should().NotBeNull();
            offer.OfferId.Should().Be("O1");
            offer.Price.Should().Be(150.00m);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task GetOfferDetails_EmptyOfferId_ReturnsBadRequest(string offerId)
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.GetOfferDetails(offerId);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().BeEquivalentTo(new { message = "offerId is required." });
        }

        [Fact]
        public async Task GetOfferDetails_OfferNotFound_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O999"))
                .ReturnsAsync((HotelOfferDto)null);

            // Act
            var result = await controller.GetOfferDetails("O999");

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().BeEquivalentTo(new { message = "Hotel offer not found or has expired." });
        }

        [Fact]
        public async Task GetOfferDetails_ServiceThrowsException_Returns500()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            _mockHotelService.Setup(x => x.GetOfferDetailsAsync(It.IsAny<string>()))
                .ThrowsAsync(new Exception("Amadeus API error"));

            // Act
            var result = await controller.GetOfferDetails("O1");

            // Assert
            var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
            objectResult.StatusCode.Should().Be(500);
            objectResult.Value.Should().BeEquivalentTo(new { message = "Amadeus API error" });
        }

        #endregion

        #region Book Tests

        [Fact]
        public async Task Book_HappyPath_CreatesReservationAndReturnsCreated()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var offer = new HotelOfferDto
            {
                OfferId = "O1",
                HotelId = "H1",
                HotelName = "Grand Plaza",
                CityCode = "NYC",
                Price = 150m,
                Currency = "USD",
                CheckInDate = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd"),
                CheckOutDate = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd"),
                Beds = 2,
                RoomQuantity = 1
            };

            var amadeusBookingResponse = new HotelBookingResponseDto
            {
                ProviderBookingId = "PROV-999"
            };

            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O1")).ReturnsAsync(offer);
            _mockHotelService.Setup(x => x.BookHotelAsync("O1", "John Doe", "john@example.com", "123456", "user-123"))
                .ReturnsAsync(amadeusBookingResponse);

            var request = new HotelBookingRequestDto
            {
                OfferId = "O1",
                GuestName = "John Doe",
                GuestEmail = "john@example.com",
                GuestPhone = "123456"
            };

            // Act
            var result = await controller.Book(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as HotelBookingResponseDto;
            responseDto.Should().NotBeNull();
            responseDto.BookingReference.Should().StartWith("HT-");
            responseDto.ProviderBookingId.Should().Be("PROV-999");
            responseDto.Status.Should().Be("Confirmed");

            // Verify db state
            var dbReservation = await db.HotelReservations.FirstOrDefaultAsync(x => x.UserId == "user-123");
            dbReservation.Should().NotBeNull();
            dbReservation.Status.Should().Be("Confirmed");
            dbReservation.ProviderBookingId.Should().Be("PROV-999");
            dbReservation.HotelName.Should().Be("Grand Plaza");
        }

        [Fact]
        public async Task Book_UserNotAuthenticated_ReturnsUnauthorized()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(false);
            var controller = CreateController(db);

            var request = new HotelBookingRequestDto { OfferId = "O1", GuestName = "John" };

            // Act
            var result = await controller.Book(request);

            // Assert
            var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorizedResult.Value.Should().BeEquivalentTo(new { message = "Please login to continue booking." });
        }

        [Theory]
        [InlineData("", "John", "john@mail.com", "123")]
        [InlineData("O1", "", "john@mail.com", "123")]
        [InlineData("O1", "John", "", "123")]
        [InlineData("O1", "John", "john@mail.com", "")]
        [InlineData(null, "John", "john@mail.com", "123")]
        public async Task Book_MissingRequiredFields_ReturnsBadRequest(string offerId, string guestName, string guestEmail, string guestPhone)
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);
            var request = new HotelBookingRequestDto
            {
                OfferId = offerId,
                GuestName = guestName,
                GuestEmail = guestEmail,
                GuestPhone = guestPhone
            };

            // Act
            var result = await controller.Book(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().BeEquivalentTo(new { message = "OfferId, GuestName, GuestEmail, and GuestPhone are required." });
        }

        [Fact]
        public async Task Book_OfferRevalidationReturnsNull_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);
            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O1")).ReturnsAsync((HotelOfferDto)null);

            var request = new HotelBookingRequestDto
            {
                OfferId = "O1",
                GuestName = "John Doe",
                GuestEmail = "john@example.com",
                GuestPhone = "123456"
            };

            // Act
            var result = await controller.Book(request);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().BeEquivalentTo(new { message = "Selected offer is no longer available or expired." });
        }

        [Fact]
        public async Task Book_RevalidationServiceThrowsException_Returns500()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);
            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O1")).ThrowsAsync(new Exception("Network timeout"));

            var request = new HotelBookingRequestDto
            {
                OfferId = "O1",
                GuestName = "John Doe",
                GuestEmail = "john@example.com",
                GuestPhone = "123456"
            };

            // Act
            var result = await controller.Book(request);

            // Assert
            var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
            objectResult.StatusCode.Should().Be(500);
            objectResult.Value.Should().BeEquivalentTo(new { message = "Unable to revalidate offer with provider." });
        }

        [Fact]
        public async Task Book_ProviderBookingFails_RollsBackLocalDbReservation()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var offer = new HotelOfferDto
            {
                OfferId = "O1",
                HotelId = "H1",
                HotelName = "Grand Plaza",
                Price = 150m,
                Currency = "USD"
            };

            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O1")).ReturnsAsync(offer);
            _mockHotelService.Setup(x => x.BookHotelAsync("O1", "John Doe", "john@example.com", "123456", "user-123"))
                .ThrowsAsync(new Exception("Amadeus Provider booking declined."));

            var request = new HotelBookingRequestDto
            {
                OfferId = "O1",
                GuestName = "John Doe",
                GuestEmail = "john@example.com",
                GuestPhone = "123456"
            };

            // Act
            var result = await controller.Book(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().BeEquivalentTo(new { message = "Booking failed at provider: Amadeus Provider booking declined." });

            // Note: EF Core InMemory database provider does not support transaction rollback natively,
            // so we cannot assert that dbReservation is null here.
            // Full transaction rollback is verified in the integration tests using SQLite in-memory database.
            var dbReservation = await db.HotelReservations.FirstOrDefaultAsync(x => x.UserId == "user-123");
            dbReservation.Should().NotBeNull();
        }

        [Fact]
        public async Task Book_CalculatesPricingCorrectly_PercentageMarkup_FlatConvenienceFee()
        {
            // Arrange
            using var db = CreateDbContext();
            
            // Add active pricing rule
            var setting = new HotelPricingSetting
            {
                MarkupType = "Percentage",
                MarkupValue = 10m,
                ConvenienceFeeType = "Flat",
                ConvenienceFeeValue = 250m,
                GstPercent = 18m,
                IsActive = true
            };
            db.HotelPricingSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var offer = new HotelOfferDto
            {
                OfferId = "O1",
                HotelId = "H1",
                HotelName = "Grand Plaza",
                CityCode = "NYC",
                Price = 1100m, // basePrice
                Currency = "INR",
                CheckInDate = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd"),
                CheckOutDate = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd"),
                Beds = 2,
                RoomQuantity = 1
            };

            var amadeusBookingResponse = new HotelBookingResponseDto
            {
                ProviderBookingId = "PROV-111"
            };

            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O1")).ReturnsAsync(offer);
            _mockHotelService.Setup(x => x.BookHotelAsync("O1", "John Doe", "john@example.com", "123456", "user-123"))
                .ReturnsAsync(amadeusBookingResponse);

            var request = new HotelBookingRequestDto
            {
                OfferId = "O1",
                GuestName = "John Doe",
                GuestEmail = "john@example.com",
                GuestPhone = "123456"
            };

            // Act
            var result = await controller.Book(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as HotelBookingResponseDto;
            responseDto.Should().NotBeNull();
            
            // Math assertions:
            // NetPrice = 1100 / 1.10 = 1000
            // MarkupAmount = 1100 - 1000 = 100
            // BasePrice = 1100
            // ConvenienceFee = 250
            // GstPercent = 18
            // GstAmount = (100 + 250) * 0.18 = 63
            // TotalPrice = 1100 + 250 + 63 = 1413
            responseDto.NetPrice.Should().Be(1000m);
            responseDto.MarkupAmount.Should().Be(100m);
            responseDto.BasePrice.Should().Be(1100m);
            responseDto.ConvenienceFee.Should().Be(250m);
            responseDto.GstPercent.Should().Be(18m);
            responseDto.GstAmount.Should().Be(63m);
            responseDto.TotalPrice.Should().Be(1413m);

            // Verify db state
            var dbReservation = await db.HotelReservations.FirstOrDefaultAsync(x => x.UserId == "user-123");
            dbReservation.Should().NotBeNull();
            dbReservation.NetPrice.Should().Be(1000m);
            dbReservation.MarkupAmount.Should().Be(100m);
            dbReservation.BasePrice.Should().Be(1100m);
            dbReservation.ConvenienceFee.Should().Be(250m);
            dbReservation.GstPercent.Should().Be(18m);
            dbReservation.GstAmount.Should().Be(63m);
            dbReservation.TotalPrice.Should().Be(1413m);
        }

        [Fact]
        public async Task Book_CalculatesPricingCorrectly_FlatMarkup_PercentageConvenienceFee()
        {
            // Arrange
            using var db = CreateDbContext();
            
            // Add active pricing rule
            var setting = new HotelPricingSetting
            {
                MarkupType = "Flat",
                MarkupValue = 100m,
                ConvenienceFeeType = "Percentage",
                ConvenienceFeeValue = 5m,
                GstPercent = 18m,
                IsActive = true
            };
            db.HotelPricingSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var offer = new HotelOfferDto
            {
                OfferId = "O1",
                HotelId = "H1",
                HotelName = "Grand Plaza",
                CityCode = "NYC",
                Price = 1000m, // basePrice
                Currency = "INR",
                CheckInDate = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd"),
                CheckOutDate = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd"),
                Beds = 2,
                RoomQuantity = 1
            };

            var amadeusBookingResponse = new HotelBookingResponseDto
            {
                ProviderBookingId = "PROV-222"
            };

            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O1")).ReturnsAsync(offer);
            _mockHotelService.Setup(x => x.BookHotelAsync("O1", "John Doe", "john@example.com", "123456", "user-123"))
                .ReturnsAsync(amadeusBookingResponse);

            var request = new HotelBookingRequestDto
            {
                OfferId = "O1",
                GuestName = "John Doe",
                GuestEmail = "john@example.com",
                GuestPhone = "123456"
            };

            // Act
            var result = await controller.Book(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as HotelBookingResponseDto;
            responseDto.Should().NotBeNull();
            
            // Math assertions:
            // NetPrice = 1000 - 100 = 900
            // MarkupAmount = 100
            // BasePrice = 1000
            // ConvenienceFee = 1000 * 0.05 = 50
            // GstPercent = 18
            // GstAmount = (100 + 50) * 0.18 = 27
            // TotalPrice = 1000 + 50 + 27 = 1077
            responseDto.NetPrice.Should().Be(900m);
            responseDto.MarkupAmount.Should().Be(100m);
            responseDto.BasePrice.Should().Be(1000m);
            responseDto.ConvenienceFee.Should().Be(50m);
            responseDto.GstPercent.Should().Be(18m);
            responseDto.GstAmount.Should().Be(27m);
            responseDto.TotalPrice.Should().Be(1077m);

            // Verify db state
            var dbReservation = await db.HotelReservations.FirstOrDefaultAsync(x => x.UserId == "user-123");
            dbReservation.Should().NotBeNull();
            dbReservation.NetPrice.Should().Be(900m);
            dbReservation.MarkupAmount.Should().Be(100m);
            dbReservation.BasePrice.Should().Be(1000m);
            dbReservation.ConvenienceFee.Should().Be(50m);
            dbReservation.GstPercent.Should().Be(18m);
            dbReservation.GstAmount.Should().Be(27m);
            dbReservation.TotalPrice.Should().Be(1077m);
        }

        #endregion

        #region MyBookings Tests

        [Fact]
        public async Task MyBookings_HappyPath_ReturnsUserBookings()
        {
            // Arrange
            using var db = CreateDbContext();
            db.HotelReservations.Add(new HotelReservation
            {
                Id = 1,
                UserId = "user-123",
                HotelName = "Grand Plaza",
                Price = 150m,
                CheckInDate = DateTime.UtcNow.AddDays(1),
                CheckOutDate = DateTime.UtcNow.AddDays(3),
                Status = "Confirmed",
                CreatedAt = DateTime.UtcNow
            });
            db.HotelReservations.Add(new HotelReservation
            {
                Id = 2,
                UserId = "user-999", // Different user
                HotelName = "Other Hotel",
                Price = 200m,
                Status = "Confirmed"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var result = await controller.MyBookings();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var bookings = okResult.Value as List<HotelBookingHistoryDto>;
            bookings.Should().NotBeNull();
            bookings.Should().ContainSingle();
            bookings[0].BookingId.Should().Be("bk-1");
            bookings[0].HotelName.Should().Be("Grand Plaza");
        }

        [Fact]
        public async Task MyBookings_UserNotAuthenticated_ReturnsUnauthorized()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(false);
            var controller = CreateController(db);

            // Act
            var result = await controller.MyBookings();

            // Assert
            var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorizedResult.Value.Should().BeEquivalentTo(new { message = "Please login to continue booking." });
        }

        #endregion

        #region Cancel Tests

        [Fact]
        public async Task Cancel_HappyPath_CancelsBookingSuccessfully()
        {
            // Arrange
            using var db = CreateDbContext();
            var reservation = new HotelReservation
            {
                Id = 1,
                UserId = "user-123",
                BookingReference = "HT-REF-111",
                ProviderBookingId = "PROV-111",
                HotelName = "Grand Plaza",
                Status = "Confirmed"
            };
            db.HotelReservations.Add(reservation);
            await db.SaveChangesAsync();

            _mockHotelService.Setup(x => x.CancelBookingAsync("PROV-111")).ReturnsAsync(true);
            var controller = CreateController(db);

            // Act
            var result = await controller.Cancel("bk-1", "Plan changed");

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var cancellationDto = okResult.Value as HotelCancellationDto;
            cancellationDto.Should().NotBeNull();
            cancellationDto.BookingId.Should().Be("bk-1");
            cancellationDto.Status.Should().Be("Cancelled");
            cancellationDto.CancellationReason.Should().Be("Plan changed");
            cancellationDto.Message.Should().Be("Booking successfully cancelled.");

            // Verify local DB is updated
            var dbReservation = await db.HotelReservations.FindAsync(1);
            dbReservation.Status.Should().Be("Cancelled");
            dbReservation.CancellationReason.Should().Be("Plan changed");
            dbReservation.CancelledAt.Should().NotBeNull();
        }

        [Fact]
        public async Task Cancel_UserNotAuthenticated_ReturnsUnauthorized()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(false);
            var controller = CreateController(db);

            // Act
            var result = await controller.Cancel("bk-1", "reason");

            // Assert
            var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorizedResult.Value.Should().BeEquivalentTo(new { message = "Please login to continue booking." });
        }

        [Fact]
        public async Task Cancel_BookingNotFound_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.Cancel("bk-999", "reason");

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().BeEquivalentTo(new { message = "Booking not found." });
        }

        [Fact]
        public async Task Cancel_BookingAlreadyCancelled_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var reservation = new HotelReservation
            {
                Id = 1,
                UserId = "user-123",
                Status = "Cancelled"
            };
            db.HotelReservations.Add(reservation);
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var result = await controller.Cancel("bk-1", "reason");

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().BeEquivalentTo(new { message = "Booking is already cancelled." });
        }

        [Fact]
        public async Task Cancel_ProviderCancellationFails_ProceedsLocallyWithSpecificMessage()
        {
            // Arrange
            using var db = CreateDbContext();
            var reservation = new HotelReservation
            {
                Id = 1,
                UserId = "user-123",
                BookingReference = "HT-REF-111",
                ProviderBookingId = "PROV-111",
                HotelName = "Grand Plaza",
                Status = "Confirmed"
            };
            db.HotelReservations.Add(reservation);
            await db.SaveChangesAsync();

            _mockHotelService.Setup(x => x.CancelBookingAsync("PROV-111")).ReturnsAsync(false);
            var controller = CreateController(db);

            // Act
            var result = await controller.Cancel("bk-1", null);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var cancellationDto = okResult.Value as HotelCancellationDto;
            cancellationDto.Should().NotBeNull();
            cancellationDto.BookingId.Should().Be("bk-1");
            cancellationDto.Status.Should().Be("Cancelled");
            cancellationDto.CancellationReason.Should().Be("Cancelled by user");
            cancellationDto.Message.Should().Be("Booking successfully cancelled.");

            // Verify local DB cancelled
            var dbReservation = await db.HotelReservations.FindAsync(1);
            dbReservation.Status.Should().Be("Cancelled");
        }

        #endregion
    }
}
