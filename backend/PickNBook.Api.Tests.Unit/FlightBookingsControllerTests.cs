#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
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
    public class FlightBookingsControllerTests
    {
        private readonly Mock<IBookingNotificationService> _mockNotificationService;
        private readonly Mock<IFlightPricingService> _mockPricingService;
        private readonly Mock<ICurrentUserService> _mockCurrentUserService;
        private readonly Mock<ITicketEmailService> _mockTicketEmailService;
        private readonly Mock<IWhatsAppService> _mockWhatsAppService;
        private readonly Mock<ILogger<FlightBookingsController>> _mockLogger;
        private readonly Mock<IAmadeusService> _mockAmadeusService;

        public FlightBookingsControllerTests()
        {
            _mockNotificationService = new Mock<IBookingNotificationService>();
            _mockPricingService = new Mock<IFlightPricingService>();
            _mockCurrentUserService = new Mock<ICurrentUserService>();
            _mockTicketEmailService = new Mock<ITicketEmailService>();
            _mockWhatsAppService = new Mock<IWhatsAppService>();
            _mockLogger = new Mock<ILogger<FlightBookingsController>>();
            _mockAmadeusService = new Mock<IAmadeusService>();

            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("1");
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);

            _mockPricingService.Setup(x => x.CalculatePricingAsync(
                It.IsAny<FlightBooking>(),
                It.IsAny<string>(),
                It.IsAny<TripType>(),
                It.IsAny<int>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int?>()
            )).ReturnsAsync(new FlightPricingBreakdownDto
            {
                FinalAmount = 5000,
                SupplierTotalFare = 4500,
                MarkupAmount = 500,
                ConvenienceFee = 150
            });
        }

        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new AppDbContext(options);
        }

        private FlightBookingsController CreateController(AppDbContext db)
        {
            var controller = new FlightBookingsController(
                db,
                _mockNotificationService.Object,
                _mockPricingService.Object,
                _mockCurrentUserService.Object,
                _mockTicketEmailService.Object,
                _mockWhatsAppService.Object,
                _mockAmadeusService.Object,
                _mockLogger.Object
            );

            var httpContext = new DefaultHttpContext();
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        #region SearchFlights Tests

        [Fact]
        public async Task SearchFlights_HappyPath_ReturnsOkWithFlights()
        {
            // Arrange
            using var db = CreateDbContext();
            var flight = new FlightBooking
            {
                Id = 1,
                FlightNumber = "AI-101",
                Airline = "Air India",
                FromCity = "Delhi",
                ToCity = "Mumbai",
                DepartureTime = DateTime.UtcNow.AddDays(1),
                ArrivalTime = DateTime.UtcNow.AddDays(1).AddHours(2),
                PriceInr = 5000,
                TotalSeats = 100,
                AvailableSeats = 100,
                CabinClass = "MultiClass"
            };
            db.FlightBookings.Add(flight);
            db.FlightClassInventories.Add(new FlightClassInventory
            {
                FlightBookingId = 1,
                TravelClass = "Economy",
                TotalSeats = 80,
                AvailableSeats = 80,
                PriceInr = 5000
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var result = await controller.SearchFlights("Delhi", "Mumbai", DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)), "Economy");

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as IEnumerable<object>;
            list.Should().NotBeNull();
            list.Should().NotBeEmpty();
        }

        [Fact]
        public async Task SearchFlights_InvalidTravelClass_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.SearchFlights("Delhi", "Mumbai", DateOnly.FromDateTime(DateTime.UtcNow), "InvalidClass");

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.ToString().Should().Contain("Invalid travelClass");
        }

        [Fact]
        public async Task SearchFlights_NoFlightsFound_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.SearchFlights("InvalidCityA", "InvalidCityB", DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)));

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as IEnumerable<object>;
            list.Should().BeEmpty();
        }

        #endregion

        #region GetFlightSeatMap Tests

        [Fact]
        public async Task GetFlightSeatMap_HappyPath_ReturnsSeatMap()
        {
            // Arrange
            using var db = CreateDbContext();
            var flight = new FlightBooking { Id = 1, FlightNumber = "AI-101", Airline = "Air India", FromCity = "Delhi", ToCity = "Mumbai" };
            db.FlightBookings.Add(flight);
            db.FlightSeats.Add(new FlightSeat { FlightBookingId = 1, TravelClass = "Economy", SeatCode = "1A", IsBooked = false });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            // Act
            var result = await controller.GetFlightSeatMap(1, "Economy");

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value as SeatMapResponseDto;
            response.Should().NotBeNull();
            response.TripId.Should().Be(1);
            response.Seats.Should().HaveCount(1);
            response.Seats[0].SeatCode.Should().Be("1A");
        }

        [Fact]
        public async Task GetFlightSeatMap_FlightNotFound_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.GetFlightSeatMap(999, "Economy");

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Flight not found.");
        }

        [Fact]
        public async Task GetFlightSeatMap_InvalidTravelClass_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            // Act
            var result = await controller.GetFlightSeatMap(1, "InvalidClass");

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.ToString().Should().Contain("Invalid travelClass");
        }

        #endregion

        #region BookFlight Tests

        [Fact]
        public async Task BookFlight_UserNotAuthenticated_ReturnsUnauthorized()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(false);
            var controller = CreateController(db);

            // Act
            var result = await controller.BookFlight(1, new CreateFlightBookingRequestDto());

            // Assert
            var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorizedResult.Value.Should().Be("Please login to continue booking.");
        }

        [Fact]
        public async Task BookFlight_MissingPassengerNameOrPhone_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "",
                PassengerPhone = "123456"
            };

            // Act
            var result = await controller.BookFlight(1, request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("PassengerName and PassengerPhone are required.");
        }

        [Fact]
        public async Task BookFlight_InvalidPassengerManifest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "John Doe",
                PassengerPhone = "123456",
                Adults = 0,
                Children = 2 // No adults but children present
            };

            // Act
            var result = await controller.BookFlight(1, request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("At least one adult is required when child or infant is present.");
        }

        [Fact]
        public async Task BookFlight_FlightNotFound_ReturnsBadRequestWithErrorMessage()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "John Doe",
                PassengerPhone = "123456",
                Adults = 1
            };

            // Act
            var result = await controller.BookFlight(999, request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Flight not found.");
        }

        [Fact]
        public async Task BookFlight_FlightAlreadyDeparted_ReturnsBadRequestWithErrorMessage()
        {
            // Arrange
            using var db = CreateDbContext();
            var flight = new FlightBooking
            {
                Id = 1,
                FlightNumber = "AI-101",
                Airline = "Air India",
                FromCity = "Delhi",
                ToCity = "Mumbai",
                DepartureTime = DateTime.UtcNow.AddHours(-1), // Past
                ArrivalTime = DateTime.UtcNow.AddHours(1)
            };
            db.FlightBookings.Add(flight);
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "John Doe",
                PassengerPhone = "123456",
                Adults = 1
            };

            // Act
            var result = await controller.BookFlight(1, request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Cannot book a flight that already departed.");
        }

        [Fact]
        public async Task BookFlight_NoSeatsAvailable_ReturnsBadRequestWithErrorMessage()
        {
            // Arrange
            using var db = CreateDbContext();
            var flight = new FlightBooking
            {
                Id = 1,
                FlightNumber = "AI-101",
                Airline = "Air India",
                FromCity = "Delhi",
                ToCity = "Mumbai",
                DepartureTime = DateTime.UtcNow.AddDays(1),
                ArrivalTime = DateTime.UtcNow.AddDays(1).AddHours(2)
            };
            db.FlightBookings.Add(flight);
            db.FlightClassInventories.Add(new FlightClassInventory
            {
                FlightBookingId = 1,
                TravelClass = "Economy",
                AvailableSeats = 0, // No seats
                TotalSeats = 10
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "John Doe",
                PassengerPhone = "123456",
                Adults = 1,
                TravelClass = "Economy"
            };

            // Act
            var result = await controller.BookFlight(1, request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.ToString().Should().Contain("seats are available");
        }

        [Fact]
        public async Task BookFlight_HappyPath_CreatesBookingAndReturnsCreated()
        {
            // Arrange
            using var db = CreateDbContext();
            var flight = new FlightBooking
            {
                Id = 1,
                FlightNumber = "AI-101",
                Airline = "Air India",
                FromCity = "Delhi",
                ToCity = "Mumbai",
                DepartureTime = DateTime.UtcNow.AddDays(1),
                ArrivalTime = DateTime.UtcNow.AddDays(1).AddHours(2),
                AvailableSeats = 10,
                TotalSeats = 10
            };
            db.FlightBookings.Add(flight);
            db.FlightClassInventories.Add(new FlightClassInventory
            {
                FlightBookingId = 1,
                TravelClass = "Economy",
                AvailableSeats = 10,
                TotalSeats = 10,
                PriceInr = 5000
            });
            db.FlightSeats.Add(new FlightSeat { FlightBookingId = 1, TravelClass = "Economy", SeatCode = "1A", IsBooked = false });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "John Doe",
                PassengerPhone = "9876543210",
                PassengerEmail = "john@example.com",
                Adults = 1,
                TravelClass = "Economy"
            };

            // Act
            var result = await controller.BookFlight(1, request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            createdResult.Value.Should().NotBeNull();

            // Check reservation is added to DB
            var reservation = await db.FlightReservations.FirstOrDefaultAsync(x => x.UserId == "1");
            reservation.Should().NotBeNull();
            reservation.Pnr.Should().NotBeNullOrEmpty();
            reservation.Pnr.Length.Should().Be(6);
            reservation.TotalPriceInr.Should().Be(5000);
        }

        #endregion

        #region GetFlightBookings Tests

        [Fact]
        public async Task GetFlightBookings_UserNotAuthenticated_ReturnsUnauthorized()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(false);
            var controller = CreateController(db);

            // Act
            var result = await controller.GetFlightBookings(null, null);

            // Assert
            var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorizedResult.Value.Should().Be("Please login to continue booking.");
        }

        [Fact]
        public async Task GetFlightBookings_HappyPath_ReturnsUserBookings()
        {
            // Arrange
            using var db = CreateDbContext();
            var flight = new FlightBooking { Id = 1, FlightNumber = "AI-101", Airline = "Air India", FromCity = "Delhi", ToCity = "Mumbai" };
            db.FlightBookings.Add(flight);
            db.FlightReservations.Add(new FlightReservation
            {
                Id = 1,
                BookingReference = "FL-1",
                Pnr = "Z4Y8X9",
                UserId = "100",
                FlightBookingId = 1,
                PassengerName = "Jane",
                PassengerPhone = "999",
                Status = "Booked"
            });
            await db.SaveChangesAsync();

            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("100");
            var controller = CreateController(db);

            // Act
            var result = await controller.GetFlightBookings(null, null);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as IEnumerable<object>;
            list.Should().NotBeEmpty();
        }

        #endregion

        #region GetFlightBookingById Tests

        [Fact]
        public async Task GetFlightBookingById_UserNotAuthenticated_ReturnsUnauthorized()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(false);
            var controller = CreateController(db);

            // Act
            var result = await controller.GetFlightBookingById("1");

            // Assert
            var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorizedResult.Value.Should().Be("Please login to continue booking.");
        }

        [Fact]
        public async Task GetFlightBookingById_BookingNotFound_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("100");
            var controller = CreateController(db);

            // Act
            var result = await controller.GetFlightBookingById("999");

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Booking not found.");
        }

        [Fact]
        public async Task GetFlightBookingById_HappyPath_ReturnsBooking()
        {
            // Arrange
            using var db = CreateDbContext();
            var flight = new FlightBooking { Id = 1, FlightNumber = "AI-101", Airline = "Air India", FromCity = "Delhi", ToCity = "Mumbai" };
            db.FlightBookings.Add(flight);
            db.FlightReservations.Add(new FlightReservation
            {
                Id = 1,
                BookingReference = "FL-1",
                Pnr = "Z4Y8X9",
                UserId = "100",
                FlightBookingId = 1,
                PassengerName = "Jane",
                PassengerPhone = "999",
                Status = "Booked"
            });
            await db.SaveChangesAsync();

            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("100");
            var controller = CreateController(db);

            // Act
            var result = await controller.GetFlightBookingById("1");

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
        }

        #endregion

        #region CancelFlightBooking Tests

        [Fact]
        public async Task CancelFlightBooking_UserNotAuthenticated_ReturnsUnauthorized()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(false);
            var controller = CreateController(db);

            // Act
            var result = await controller.CancelFlightBooking("1", "reason");

            // Assert
            var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
            unauthorizedResult.Value.Should().Be("Please login to continue booking.");
        }

        [Fact]
        public async Task CancelFlightBooking_BookingNotFound_ReturnsBadRequestWithErrorMessage()
        {
            // Arrange
            using var db = CreateDbContext();
            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("100");
            var controller = CreateController(db);

            // Act
            var result = await controller.CancelFlightBooking("999", "reason");

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Booking not found.");
        }

        [Fact]
        public async Task CancelFlightBooking_AlreadyCancelled_ReturnsBadRequestWithErrorMessage()
        {
            // Arrange
            using var db = CreateDbContext();
            var flight = new FlightBooking { Id = 1, FlightNumber = "AI-101", Airline = "Air India", FromCity = "Delhi", ToCity = "Mumbai" };
            db.FlightBookings.Add(flight);
            db.FlightReservations.Add(new FlightReservation
            {
                Id = 1,
                BookingReference = "FL-1",
                Pnr = "Z4Y8X9",
                UserId = "100",
                FlightBookingId = 1,
                PassengerName = "Jane",
                PassengerPhone = "999",
                Status = "Cancelled" // Already cancelled
            });
            await db.SaveChangesAsync();

            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("100");
            var controller = CreateController(db);

            // Act
            var result = await controller.CancelFlightBooking("1", "reason");

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Booking is already cancelled.");
        }

        [Fact]
        public async Task CancelFlightBooking_HappyPath_CancelsBookingAndReleasesSeats()
        {
            // Arrange
            using var db = CreateDbContext();
            var flight = new FlightBooking
            {
                Id = 1,
                FlightNumber = "AI-101",
                Airline = "Air India",
                FromCity = "Delhi",
                ToCity = "Mumbai",
                AvailableSeats = 9,
                TotalSeats = 10
            };
            db.FlightBookings.Add(flight);
            db.FlightClassInventories.Add(new FlightClassInventory
            {
                FlightBookingId = 1,
                TravelClass = "Economy",
                AvailableSeats = 9,
                TotalSeats = 10
            });
            db.FlightSeats.Add(new FlightSeat { FlightBookingId = 1, TravelClass = "Economy", SeatCode = "1A", IsBooked = true });
            
            var reservation = new FlightReservation
            {
                Id = 1,
                BookingReference = "FL-1",
                Pnr = "Z4Y8X9",
                UserId = "100",
                FlightBookingId = 1,
                PassengerName = "Jane",
                PassengerPhone = "999",
                Status = "Booked",
                TravelClass = "Economy",
                SeatsBooked = 1
            };
            db.FlightReservations.Add(reservation);
            db.FlightReservationPassengers.Add(new FlightReservationPassenger
            {
                FlightReservationId = 1,
                FullName = "Jane Doe",
                PassengerType = "Adult",
                Gender = "Female",
                SeatNumber = "1A"
            });
            await db.SaveChangesAsync();

            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("100");
            var controller = CreateController(db);

            // Act
            var result = await controller.CancelFlightBooking("1", "User requested");

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();

            // Verify in DB
            var dbRes = await db.FlightReservations.FindAsync(1);
            dbRes.Status.Should().Be("Cancelled");
            dbRes.CancellationReason.Should().Be("User requested");

            var dbSeat = await db.FlightSeats.FirstOrDefaultAsync(x => x.FlightBookingId == 1 && x.SeatCode == "1A");
            dbSeat.IsBooked.Should().BeFalse();

            var dbClass = await db.FlightClassInventories.FirstOrDefaultAsync(x => x.FlightBookingId == 1 && x.TravelClass == "Economy");
            dbClass.AvailableSeats.Should().Be(10);
        }

        [Fact]
        public async Task CancelFlightPassengers_HappyPath_CancelsOnlyTargetPassengersAndRefundsProportionally()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightBookings.Add(new FlightBooking
            {
                Id = 1,
                FlightNumber = "AI-101",
                Airline = "Air India",
                FromCity = "Delhi",
                ToCity = "Mumbai",
                DepartureTime = DateTime.UtcNow.AddHours(24),
                ArrivalTime = DateTime.UtcNow.AddHours(26),
                AvailableSeats = 8,
                TotalSeats = 10,
                CabinClass = "Economy"
            });
            db.FlightClassInventories.Add(new FlightClassInventory
            {
                FlightBookingId = 1,
                TravelClass = "Economy",
                AvailableSeats = 8,
                TotalSeats = 10
            });
            db.FlightSeats.Add(new FlightSeat { FlightBookingId = 1, TravelClass = "Economy", SeatCode = "1A", IsBooked = true });
            db.FlightSeats.Add(new FlightSeat { FlightBookingId = 1, TravelClass = "Economy", SeatCode = "1B", IsBooked = true });
            
            var reservation = new FlightReservation
            {
                Id = 1,
                BookingReference = "FL-12345",
                UserId = "100",
                FlightBookingId = 1,
                PassengerName = "John Doe",
                PassengerPhone = "1234567890",
                PassengerEmail = "john@example.com",
                Status = "Booked",
                TotalPriceInr = 10000,
                TravelClass = "Economy",
                SeatsBooked = 2
            };
            db.FlightReservations.Add(reservation);
            db.FlightReservationPassengers.Add(new FlightReservationPassenger
            {
                Id = 10,
                FlightReservationId = 1,
                FullName = "Passenger One",
                PassengerType = "Adult",
                Gender = "Male",
                SeatNumber = "1A"
            });
            db.FlightReservationPassengers.Add(new FlightReservationPassenger
            {
                Id = 11,
                FlightReservationId = 1,
                FullName = "Passenger Two",
                PassengerType = "Adult",
                Gender = "Female",
                SeatNumber = "1B"
            });
            await db.SaveChangesAsync();

            _mockCurrentUserService.Setup(x => x.IsAuthenticated()).Returns(true);
            _mockCurrentUserService.Setup(x => x.GetUserOrGuestId()).Returns("100");
            var controller = CreateController(db);

            var requestDto = new CancelPassengersRequestDto
            {
                PassengerIds = new List<int> { 10 },
                Reason = "Change of plans"
            };

            // Act
            var result = await controller.CancelFlightPassengers("1", requestDto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();

            // Verify in DB
            var dbRes = await db.FlightReservations.FindAsync(1);
            dbRes.Status.Should().Be("Booked"); 
            dbRes.RefundAmountInr.Should().Be(5000); 
            dbRes.CancellationChargeInr.Should().Be(0);

            var passenger10 = await db.FlightReservationPassengers.FindAsync(10);
            passenger10.IsCancelled.Should().BeTrue();
            passenger10.CancelledAtUtc.Should().NotBeNull();

            var passenger11 = await db.FlightReservationPassengers.FindAsync(11);
            passenger11.IsCancelled.Should().BeFalse();

            var seat1A = await db.FlightSeats.FirstOrDefaultAsync(x => x.FlightBookingId == 1 && x.SeatCode == "1A");
            seat1A.IsBooked.Should().BeFalse();

            var seat1B = await db.FlightSeats.FirstOrDefaultAsync(x => x.FlightBookingId == 1 && x.SeatCode == "1B");
            seat1B.IsBooked.Should().BeTrue();
        }

        #endregion
    }
}
