#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using FluentAssertions;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;
using PickNBook.Api.Services.SeatLayouts;

namespace PickNBook.Api.Tests.Unit
{
    public class BusBookingsControllerTests : IDisposable
    {
        private readonly Mock<IBusPromotionEngineService> _mockPromotionEngine;
        private readonly Mock<ITicketEmailService> _mockTicketEmailService;
        private readonly Mock<IWhatsAppService> _mockWhatsAppService;
        private readonly Mock<ICurrentUserService> _mockCurrentUserService;
        private readonly Mock<ILogger<BusBookingsController>> _mockLogger;
        private Microsoft.Data.Sqlite.SqliteConnection _connection;

        public BusBookingsControllerTests()
        {
            _mockPromotionEngine = new Mock<IBusPromotionEngineService>();
            _mockTicketEmailService = new Mock<ITicketEmailService>();
            _mockWhatsAppService = new Mock<IWhatsAppService>();
            _mockCurrentUserService = new Mock<ICurrentUserService>();
            _mockLogger = new Mock<ILogger<BusBookingsController>>();
        }

        private AppDbContext CreateDbContext()
        {
            _connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(_connection)
                .Options;

            var dbContext = new AppDbContext(options);
            dbContext.Database.EnsureCreated();
            return dbContext;
        }

        public void Dispose()
        {
            _connection?.Close();
            _connection?.Dispose();
        }

        private BusBookingsController CreateController(AppDbContext dbContext)
        {
            return new BusBookingsController(
                dbContext,
                _mockPromotionEngine.Object,
                _mockTicketEmailService.Object,
                _mockWhatsAppService.Object,
                _mockCurrentUserService.Object,
                _mockLogger.Object
            );
        }

        #region GetAvailableCoupons Tests

        [Fact]
        public async Task GetAvailableCoupons_HappyPath_ReturnsOkWithActiveCoupons()
        {
            // Arrange
            using var db = CreateDbContext();
            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5));
            
            var coupon1 = new BusCoupon
            {
                Id = 1,
                CouponCode = "SAVE10",
                CouponType = "Percentage",
                Value = 10,
                MinBookingAmount = 100,
                MaxUsagePerUser = 1,
                StartDate = today.AddDays(-1),
                ExpiryDate = today.AddDays(5),
                Status = "Active",
                UsedCount = 0,
                UseLimit = 10
            };
            
            var coupon2 = new BusCoupon
            {
                Id = 2,
                CouponCode = "EXPIRED",
                CouponType = "Fixed",
                Value = 50,
                StartDate = today.AddDays(-5),
                ExpiryDate = today.AddDays(-1),
                Status = "Active"
            };

            db.BusCoupons.AddRange(coupon1, coupon2);
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var result = await controller.GetAvailableCoupons();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var coupons = okResult.Value as IEnumerable<object>;
            coupons.Should().NotBeNull();
            coupons.Count().Should().Be(1);
        }

        [Fact]
        public async Task GetAvailableCoupons_DbThrowsException_PropagatesException()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);
            await db.DisposeAsync();

            // Act & Assert
            await Assert.ThrowsAsync<ObjectDisposedException>(() => controller.GetAvailableCoupons());
        }

        #endregion

        #region SearchBuses Tests

        [Fact]
        public async Task SearchBuses_HappyPath_ReturnsMatchingBusesAndIncrementsSearchLogs()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("user123");
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);

            var departureTime = DateTime.UtcNow.AddHours(6); // future
            var bus = new BusBooking
            {
                Id = 101,
                BusNumber = "KA-01-1234",
                OperatorName = "VRL Travels",
                BusType = "AC Sleeper",
                GstCategory = "AC",
                FromCity = "Bangalore",
                ToCity = "Goa",
                BoardingPoint = "Majestic",
                DroppingPoint = "Panaji",
                DepartureTime = departureTime,
                ArrivalTime = departureTime.AddHours(8),
                PriceInr = 1000,
                TotalSeats = 30,
                AvailableSeats = 30
            };
            db.BusBookings.Add(bus);
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var dateStr = departureTime.AddHours(5.5).ToString("dd-MM-yyyy");
            var result = await controller.SearchBuses("Bangalore", "Goa", dateStr, null, null);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var responseList = okResult.Value as IEnumerable<object>;
            responseList.Should().NotBeNull();
            
            // Check logs updated
            var searchLog = await db.BusSearchLogs.FirstOrDefaultAsync();
            searchLog.Should().NotBeNull();
            searchLog.FromCity.Should().Be("Bangalore");
            searchLog.ToCity.Should().Be("Goa");

            var routeStat = await db.BusRouteStats.FirstOrDefaultAsync(x => x.FromCity == "Bangalore" && x.ToCity == "Goa");
            routeStat.Should().NotBeNull();
            routeStat.SearchCount.Should().Be(1);
        }

        [Fact]
        public async Task SearchBuses_InvalidDateFormat_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.SearchBuses("Delhi", "Mumbai", "2026-06-14", null, null);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("Date must be in dd-MM-yyyy format");
        }

        [Fact]
        public async Task SearchBuses_PastDate_ReturnsEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);
            var yesterdayStr = DateTime.UtcNow.AddDays(-1).ToString("dd-MM-yyyy");

            // Act
            var result = await controller.SearchBuses("Bangalore", "Goa", yesterdayStr, null, null);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var responseList = okResult.Value as IEnumerable<object>;
            responseList.Should().BeEmpty();
        }

        #endregion

        #region GetHotRoutes Tests

        [Fact]
        public async Task GetHotRoutes_HappyPath_ReturnsTopRoutesByMetric()
        {
            // Arrange
            using var db = CreateDbContext();
            db.BusRouteStats.AddRange(
                new BusRouteStat { Id = 1, FromCity = "A", ToCity = "B", SearchCount = 10, BookingCount = 2 },
                new BusRouteStat { Id = 2, FromCity = "C", ToCity = "D", SearchCount = 20, BookingCount = 5 }
            );
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var result = await controller.GetHotRoutes("booking");

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value as IEnumerable<object>;
            response.Should().NotBeNull();
            response.Count().Should().Be(2);
        }

        [Fact]
        public async Task GetHotRoutes_InvalidMetric_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.GetHotRoutes("invalid-metric");

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("metric must be one of: score, search, booking.");
        }

        #endregion

        #region GetBusSeatMap Tests

        [Fact]
        public async Task GetBusSeatMap_BusNotFound_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.GetBusSeatMap(9999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Bus not found.");
        }

        [Fact]
        public async Task GetBusSeatMap_HappyPath_ReturnsSeatLayoutWithFares()
        {
            // Arrange
            using var db = CreateDbContext();
            var bus = new BusBooking
            {
                Id = 1,
                BusNumber = "KA-01-1234",
                OperatorName = "VRL Travels",
                BusType = "AC Sleeper",
                FromCity = "Bangalore",
                ToCity = "Goa",
                BoardingPoint = "Majestic",
                DroppingPoint = "Panaji",
                PriceInr = 1000,
                TotalSeats = 2
            };
            db.BusBookings.Add(bus);

            db.BusMarkupSettings.Add(new BusMarkupSetting
            {
                SeatType = "Sleeper",
                Value = 50,
                MarkupType = "Fixed",
                Status = "Active",
                UpdateDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var result = await controller.GetBusSeatMap(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value as SeatMapResponseDto;
            response.Should().NotBeNull();
            response.TripId.Should().Be(1);
            response.TotalSeats.Should().Be(2);
            response.Seats.Should().NotBeEmpty();
            response.Seats.First().BaseFare.Should().Be(1000);
            response.Seats.First().MarkupAmount.Should().Be(50);
            response.Seats.First().FareBeforeTax.Should().Be(1050);
        }

        #endregion

        #region GetPricingPreview Tests

        [Fact]
        public async Task GetPricingPreview_NoSeatSelected_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);
            var request = new BusPricingPreviewRequestDto { SeatCodes = new List<string>() };

            // Act
            var result = await controller.GetPricingPreview(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("At least one seat must be selected.");
        }

        [Fact]
        public async Task GetPricingPreview_HappyPath_CalculatesCorrectly()
        {
            // Arrange
            using var db = CreateDbContext();
            var previewResponse = new BusPricingPreviewResponseDto
            {
                BusId = 1,
                GrandTotal = 1200,
                DiscountSource = "Coupon"
            };

            _mockPromotionEngine.Setup(x => x.CalculateAsync(
                It.IsAny<int>(),
                It.IsAny<List<string>>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<int?>(),
                It.IsAny<int?>()
            )).ReturnsAsync(previewResponse);

            var controller = CreateController(db);
            var request = new BusPricingPreviewRequestDto
            {
                BusId = 1,
                SeatCodes = ["L1"]
            };

            // Act
            var result = await controller.GetPricingPreview(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value as BusPricingPreviewResponseDto;
            response.Should().NotBeNull();
            response.DiscountLabel.Should().Be("Coupon Applied");
            response.GrandTotal.Should().Be(1200);
        }

        #endregion

        #region GetPricingConfig Tests

        [Fact]
        public async Task GetPricingConfig_HappyPath_ReturnsExpectedCalculations()
        {
            // Arrange
            using var db = CreateDbContext();
            db.BusMarkupSettings.Add(new BusMarkupSetting
            {
                SeatType = "Seater",
                Value = 10,
                MarkupType = "Percentage",
                Status = "Active"
            });
            db.BusGstSettings.Add(new BusGstSetting
            {
                GstCategory = "Regular",
                GstPercent = 5,
                Status = "Active"
            });
            db.BusConvenienceFees.Add(new BusConvenienceFee
            {
                FeeInr = 40,
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var result = await controller.GetPricingConfig("Seater", "Regular", 1000m);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var value = okResult.Value;
            value.Should().NotBeNull();
            
            // Expected: base = 1000, markup = 10% = 100, selling = 1100, gst = 5% of 1100 = 55, fee = 40, grand = 1195.
            var grandTotal = (decimal)value.GetType().GetProperty("grandTotal").GetValue(value);
            grandTotal.Should().Be(1195m);
        }

        #endregion

        #region BookBus Tests

        [Fact]
        public async Task BookBus_NotAuthenticated_Returns401Unauthorized()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(false);

            var controller = CreateController(db);
            var request = new CreateBusBookingRequestDto();

            // Act
            var result = await controller.BookBus(1, request);

            // Assert
            var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorized.Value.Should().Be("Please login to continue booking.");
        }

        [Fact]
        public async Task BookBus_EmptyPassengers_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);

            var controller = CreateController(db);
            var request = new CreateBusBookingRequestDto
            {
                Passengers = new List<CreateBusPassengerDto>()
            };

            // Act
            var result = await controller.BookBus(1, request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("At least one passenger is required.");
        }

        [Fact]
        public async Task BookBus_InvalidAge_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);

            var controller = CreateController(db);
            var request = new CreateBusBookingRequestDto
            {
                Passengers = new List<CreateBusPassengerDto>
                {
                    new CreateBusPassengerDto { FullName = "John Doe", Gender = "Male", SeatNumber = "L1", Age = 150 }
                }
            };

            // Act
            var result = await controller.BookBus(1, request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("Passenger at index 0 has invalid Age.");
        }

        [Fact]
        public async Task BookBus_HappyPath_SuccessfulReservation()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("1");

            var bus = new BusBooking
            {
                Id = 10,
                BusNumber = "KA-01-1234",
                OperatorName = "VRL Travels",
                BusType = "AC Sleeper",
                FromCity = "Bangalore",
                ToCity = "Goa",
                BoardingPoint = "Majestic",
                DroppingPoint = "Panaji",
                DepartureTime = DateTime.UtcNow.AddDays(1),
                ArrivalTime = DateTime.UtcNow.AddDays(1).AddHours(8),
                PriceInr = 1000,
                TotalSeats = 30,
                AvailableSeats = 30
            };
            db.BusBookings.Add(bus);
            await db.SaveChangesAsync();

            // Setup seat layout
            db.BusSeats.Add(new BusSeat
            {
                BusBookingId = 10,
                SeatCode = "L1",
                SeatType = "Sleeper",
                IsBooked = false
            });
            await db.SaveChangesAsync();

            var previewResponse = new BusPricingPreviewResponseDto
            {
                BusId = 10,
                GrandTotal = 1050,
                TaxableFare = 1000,
                GstPercent = 5,
                GstAmount = 50,
                ConvenienceFee = 0,
                Seats = new List<BusSeatPriceBreakdownDto>
                {
                    new BusSeatPriceBreakdownDto { SeatCode = "L1", BaseFare = 1000, MarkupAmount = 0, FareBeforeTax = 1000 }
                }
            };

            _mockPromotionEngine.Setup(x => x.CalculateAsync(
                It.IsAny<int>(),
                It.IsAny<List<string>>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<int?>(),
                It.IsAny<int?>()
            )).ReturnsAsync(previewResponse);

            _mockWhatsAppService.Setup(x => x.SendTextAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync((true, "Sent"));

            var controller = CreateController(db);
            var request = new CreateBusBookingRequestDto
            {
                PassengerName = "John Doe",
                PassengerPhone = "9999999999",
                PassengerEmail = "john@example.com",
                Passengers = new List<CreateBusPassengerDto>
                {
                    new CreateBusPassengerDto { FullName = "John Doe", Gender = "Male", SeatNumber = "L1", Age = 30 }
                }
            };

            // Act
            var result = await controller.BookBus(10, request);

            // Assert
            result.Should().BeOfType<CreatedAtActionResult>();
            var dbReservation = await db.BusReservations.FirstOrDefaultAsync();
            dbReservation.Should().NotBeNull();
            dbReservation.PassengerName.Should().Be("John Doe");
            dbReservation.TotalPriceInr.Should().Be(1050);

            var dbSeat = await db.BusSeats.AsNoTracking().FirstOrDefaultAsync(x => x.BusBookingId == 10 && x.SeatCode == "L1");
            dbSeat.IsBooked.Should().BeTrue();
        }

        [Fact]
        public async Task BookBus_AdjacentSeatGenderMismatch_ThrowsExceptionAndReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("1");

            var bus = new BusBooking
            {
                Id = 15,
                BusNumber = "KA-01-1234",
                OperatorName = "VRL Travels",
                BusType = "AC Sleeper",
                FromCity = "Bangalore",
                ToCity = "Goa",
                BoardingPoint = "Majestic",
                DroppingPoint = "Panaji",
                DepartureTime = DateTime.UtcNow.AddDays(1),
                ArrivalTime = DateTime.UtcNow.AddDays(1).AddHours(8),
                PriceInr = 1000,
                TotalSeats = 6,
                AvailableSeats = 6
            };
            db.BusBookings.Add(bus);

            // Configure adjacent seats: L2 and L3 are adjacent in SleeperLayout with 6 seats (lower = 3, upper = 3)
            db.BusSeats.AddRange(
                new BusSeat { BusBookingId = 15, SeatCode = "L1", SeatType = "Sleeper", IsBooked = false },
                new BusSeat { BusBookingId = 15, SeatCode = "L2", SeatType = "Sleeper", IsBooked = true },
                new BusSeat { BusBookingId = 15, SeatCode = "L3", SeatType = "Sleeper", IsBooked = false },
                new BusSeat { BusBookingId = 15, SeatCode = "U1", SeatType = "Sleeper", IsBooked = false },
                new BusSeat { BusBookingId = 15, SeatCode = "U2", SeatType = "Sleeper", IsBooked = false },
                new BusSeat { BusBookingId = 15, SeatCode = "U3", SeatType = "Sleeper", IsBooked = false }
            );

            // Existing booking with Female passenger on L2
            var existingReservation = new BusReservation
            {
                Id = 100,
                BookingReference = "BS-OLD",
                UserId = "2",
                BusBookingId = 15,
                PassengerName = "Jane Doe",
                PassengerPhone = "8888888888",
                Status = "Booked",
                TotalPriceInr = 1000
            };
            db.BusReservations.Add(existingReservation);
            db.BusReservationPassengers.Add(new BusReservationPassenger
            {
                BusReservationId = 100,
                FullName = "Jane Doe",
                Gender = "Female",
                SeatNumber = "L2",
                Age = 25
            });

            await db.SaveChangesAsync();

            // Mock Promotion Engine to prevent NullReferenceException
            var previewResponse = new BusPricingPreviewResponseDto
            {
                BusId = 15,
                GrandTotal = 1000,
                Seats = new List<BusSeatPriceBreakdownDto>
                {
                    new BusSeatPriceBreakdownDto { SeatCode = "L3", BaseFare = 1000, MarkupAmount = 0, FareBeforeTax = 1000 }
                }
            };

            _mockPromotionEngine.Setup(x => x.CalculateAsync(
                It.IsAny<int>(),
                It.IsAny<List<string>>(),
                It.IsAny<string>(),
                It.IsAny<int?>(),
                It.IsAny<int?>(),
                It.IsAny<int?>()
            )).ReturnsAsync(previewResponse);

            var controller = CreateController(db);
            
            // Request: Male passenger booking L3 (adjacent to Female booked L2)
            var request = new CreateBusBookingRequestDto
            {
                PassengerName = "John Doe",
                PassengerPhone = "9999999999",
                Passengers = new List<CreateBusPassengerDto>
                {
                    new CreateBusPassengerDto { FullName = "John Doe", Gender = "Male", SeatNumber = "L3", Age = 30 }
                }
            };

            // Act
            var result = await controller.BookBus(15, request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.ToString().Should().Contain("blocked. Adjacent seat");
        }

        #endregion

        #region GetBusBookings Tests

        [Fact]
        public async Task GetBusBookings_NotAuthenticated_ReturnsUnauthorized()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(false);

            var controller = CreateController(db);

            // Act
            var result = await controller.GetBusBookings(null, null);

            // Assert
            var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorized.Value.Should().Be("Please login to continue booking.");
        }

        [Fact]
        public async Task GetBusBookings_HappyPath_ReturnsUserBookings()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("1");

            var bus = new BusBooking { Id = 1, BusNumber = "123", OperatorName = "Test", FromCity = "A", ToCity = "B", BoardingPoint = "A", DroppingPoint = "B" };
            db.BusBookings.Add(bus);

            var reservation = new BusReservation
            {
                Id = 1,
                BookingReference = "BS-1",
                UserId = "1",
                BusBookingId = 1,
                PassengerName = "Jane",
                PassengerPhone = "999",
                Status = "Booked"
            };
            db.BusReservations.Add(reservation);
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var result = await controller.GetBusBookings(null, null);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as IEnumerable<object>;
            list.Should().NotBeEmpty();
        }

        #endregion

        #region GetBusBookingById Tests

        [Fact]
        public async Task GetBusBookingById_NotFound_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("1");

            var controller = CreateController(db);

            // Act
            var result = await controller.GetBusBookingById(999);

            // Assert
            result.Should().BeOfType<NotFoundObjectResult>();
        }

        #endregion

        #region CancelBusBooking Tests

        [Fact]
        public async Task CancelBusBooking_AlreadyCancelled_ThrowsException()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("1");

            var bus = new BusBooking { Id = 20, BusNumber = "123", OperatorName = "Test", FromCity = "A", ToCity = "B", BoardingPoint = "A", DroppingPoint = "B", DepartureTime = DateTime.UtcNow.AddDays(1) };
            db.BusBookings.Add(bus);

            var reservation = new BusReservation
            {
                Id = 50,
                BookingReference = "BS-50",
                UserId = "1",
                BusBookingId = 20,
                PassengerName = "John",
                PassengerPhone = "999",
                Status = "Cancelled"
            };
            db.BusReservations.Add(reservation);
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var result = await controller.CancelBusBooking(50, "User requested");

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("Already cancelled.");
        }

        [Fact]
        public async Task CancelBusBooking_DepartedBus_ThrowsException()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("1");

            var bus = new BusBooking { Id = 21, BusNumber = "123", OperatorName = "Test", FromCity = "A", ToCity = "B", BoardingPoint = "A", DroppingPoint = "B", DepartureTime = DateTime.UtcNow.AddHours(-1) }; // departed
            db.BusBookings.Add(bus);

            var reservation = new BusReservation
            {
                Id = 51,
                BookingReference = "BS-51",
                UserId = "1",
                BusBookingId = 21,
                PassengerName = "John",
                PassengerPhone = "999",
                Status = "Booked"
            };
            db.BusReservations.Add(reservation);
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var result = await controller.CancelBusBooking(51, "User requested");

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("Cannot cancel ticket after bus departure.");
        }

        [Fact]
        public async Task CancelBusBooking_HappyPath_CancelsSeatsAndRefunds100Percent()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("1");

            var bus = new BusBooking
            {
                Id = 22,
                BusNumber = "123",
                OperatorName = "Test",
                FromCity = "A",
                ToCity = "B",
                BoardingPoint = "A",
                DroppingPoint = "B",
                DepartureTime = DateTime.UtcNow.AddHours(20), // > 12 hours before
                AvailableSeats = 29,
                TotalSeats = 30
            };
            db.BusBookings.Add(bus);

            var reservation = new BusReservation
            {
                Id = 52,
                BookingReference = "BS-52",
                UserId = "1",
                BusBookingId = 22,
                PassengerName = "John",
                PassengerPhone = "999",
                Status = "Booked",
                TotalPriceInr = 1000,
                SeatsBooked = 1
            };
            db.BusReservations.Add(reservation);

            db.BusReservationPassengers.Add(new BusReservationPassenger
            {
                BusReservationId = 52,
                FullName = "John",
                Gender = "Male",
                SeatNumber = "L1"
            });

            db.BusSeats.Add(new BusSeat
            {
                BusBookingId = 22,
                SeatCode = "L1",
                IsBooked = true
            });

            await db.SaveChangesAsync();

            _mockWhatsAppService.Setup(x => x.SendTextAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync((true, "Sent"));

            var controller = CreateController(db);

            // Act
            var result = await controller.CancelBusBooking(52, "User requested");

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value;
            
            var dbRes = await db.BusReservations.FindAsync(52);
            dbRes.Status.Should().Be("Cancelled");
            dbRes.RefundAmountInr.Should().Be(1000); // 100% refund
            dbRes.CancellationChargeInr.Should().Be(0);

            var dbSeat = await db.BusSeats.FirstOrDefaultAsync(x => x.BusBookingId == 22 && x.SeatCode == "L1");
            dbSeat.IsBooked.Should().BeFalse();
        }

        [Fact]
        public async Task CancelBusPassengers_HappyPath_CancelsOnlyTargetPassengersAndRefundsProportionally()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("1");

            var bus = new BusBooking
            {
                Id = 32,
                BusNumber = "123",
                OperatorName = "Test",
                FromCity = "A",
                ToCity = "B",
                BoardingPoint = "A",
                DroppingPoint = "B",
                DepartureTime = DateTime.UtcNow.AddHours(20), // > 12 hours before
                AvailableSeats = 28,
                TotalSeats = 30
            };
            db.BusBookings.Add(bus);

            var reservation = new BusReservation
            {
                Id = 62,
                BookingReference = "BS-62",
                UserId = "1",
                BusBookingId = 32,
                PassengerName = "John",
                PassengerPhone = "999",
                Status = "Booked",
                TotalPriceInr = 2000,
                SeatsBooked = 2
            };
            db.BusReservations.Add(reservation);

            db.BusReservationPassengers.Add(new BusReservationPassenger
            {
                Id = 20,
                BusReservationId = 62,
                FullName = "John One",
                Gender = "Male",
                SeatNumber = "L1"
            });
            db.BusReservationPassengers.Add(new BusReservationPassenger
            {
                Id = 21,
                BusReservationId = 62,
                FullName = "John Two",
                Gender = "Male",
                SeatNumber = "L2"
            });

            db.BusSeats.Add(new BusSeat { BusBookingId = 32, SeatCode = "L1", IsBooked = true });
            db.BusSeats.Add(new BusSeat { BusBookingId = 32, SeatCode = "L2", IsBooked = true });

            await db.SaveChangesAsync();

            _mockWhatsAppService.Setup(x => x.SendTextAsync(It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync((true, "Sent"));

            var controller = CreateController(db);
            var requestDto = new CancelPassengersRequestDto
            {
                PassengerIds = new List<int> { 20 },
                Reason = "Change of plans"
            };

            // Act
            var result = await controller.CancelBusPassengers(62, requestDto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
            
            var dbRes = await db.BusReservations.FindAsync(62);
            dbRes.Status.Should().Be("Booked"); 
            dbRes.RefundAmountInr.Should().Be(1000); 
            dbRes.CancellationChargeInr.Should().Be(0);

            var p20 = await db.BusReservationPassengers.FindAsync(20);
            p20.IsCancelled.Should().BeTrue();

            var p21 = await db.BusReservationPassengers.FindAsync(21);
            p21.IsCancelled.Should().BeFalse();

            var seatL1 = await db.BusSeats.FirstOrDefaultAsync(x => x.BusBookingId == 32 && x.SeatCode == "L1");
            seatL1.IsBooked.Should().BeFalse();

            var seatL2 = await db.BusSeats.FirstOrDefaultAsync(x => x.BusBookingId == 32 && x.SeatCode == "L2");
            seatL2.IsBooked.Should().BeTrue();
        }

        #endregion
    }
}
