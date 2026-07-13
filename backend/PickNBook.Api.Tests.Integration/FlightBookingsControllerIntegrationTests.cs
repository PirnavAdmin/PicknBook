#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using FluentAssertions;
using Xunit;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;

namespace PickNBook.Api.Tests.Integration
{
    public class FlightBookingsControllerIntegrationTests
        : IClassFixture<WebApplicationFactory<FlightBookingsController>>, IDisposable
    {
        private readonly WebApplicationFactory<FlightBookingsController> _factory;
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;
        private readonly Mock<IBookingNotificationService> _mockNotificationService;

        public FlightBookingsControllerIntegrationTests(
            WebApplicationFactory<FlightBookingsController> factory)
        {
            _mockNotificationService = new Mock<IBookingNotificationService>();
            _mockNotificationService
                .Setup(x => x.TrySendTicketEmailAsync(It.IsAny<TicketEmailRequestDto>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            _connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:");
            _connection.Open();

            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Remove existing AppDbContext
                    var optionsDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                    if (optionsDescriptor != null) services.Remove(optionsDescriptor);

                    var dbContextDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(AppDbContext));
                    if (dbContextDescriptor != null) services.Remove(dbContextDescriptor);

                    // Use SQLite in-memory
                    services.AddDbContext<AppDbContext>(options =>
                    {
                        options.UseSqlite(_connection);
                    });

                    // Replace IBookingNotificationService with mock
                    var notifDesc = services.SingleOrDefault(
                        d => d.ServiceType == typeof(IBookingNotificationService));
                    if (notifDesc != null) services.Remove(notifDesc);
                    services.AddSingleton<IBookingNotificationService>(_mockNotificationService.Object);

                    // Also mock ITicketEmailService and IWhatsAppService if registered
                    var emailDesc = services.SingleOrDefault(
                        d => d.ServiceType == typeof(ITicketEmailService));
                    if (emailDesc != null) services.Remove(emailDesc);
                    services.AddSingleton(new Mock<ITicketEmailService>().Object);

                    var whatsAppDesc = services.SingleOrDefault(
                        d => d.ServiceType == typeof(IWhatsAppService));
                    if (whatsAppDesc != null) services.Remove(whatsAppDesc);
                    services.AddSingleton(new Mock<IWhatsAppService>().Object);
                });
            });

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
        }

        public void Dispose()
        {
            _connection?.Close();
            _connection?.Dispose();
        }

        // ──────────────── Helpers ────────────────

        private HttpClient GetAuthenticatedClient(string role = AuthRoles.User, int userId = 1)
        {
            var client = _factory.CreateClient();
            using var scope = _factory.Services.CreateScope();
            var jwtService = scope.ServiceProvider.GetRequiredService<IJwtService>();
            var token = jwtService.GenerateToken(new User
            {
                Id = userId,
                Email = "testuser@picknbook.com",
                Role = role
            }, role);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        private HttpClient GetAnonymousClientWithGuestHeader()
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Guest-Id", "guest_integ-flight-test");
            return client;
        }

        private AppDbContext GetDbContext()
        {
            var scope = _factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<AppDbContext>();
        }

        /// <summary>
        /// Seeds a flight with class inventory and seats ready for booking.
        /// </summary>
        private async Task<(FlightBooking Flight, FlightClassInventory Inventory)> SeedFlightWithInventoryAsync(
            string fromCity = "Delhi",
            string toCity = "Mumbai",
            decimal priceInr = 5000m,
            int totalSeats = 120,
            int availableSeats = 120,
            string travelClass = "Economy",
            int hoursFromNow = 24)
        {
            using var db = GetDbContext();
            var depTime = DateTime.UtcNow.AddHours(hoursFromNow);
            var flight = new FlightBooking
            {
                FlightNumber = "AI-101",
                Airline = "Air India",
                FromCity = fromCity,
                ToCity = toCity,
                DepartureTime = depTime,
                ArrivalTime = depTime.AddHours(2),
                PriceInr = priceInr,
                TotalSeats = totalSeats,
                AvailableSeats = availableSeats,
                CabinClass = "MultiClass"
            };
            db.FlightBookings.Add(flight);
            await db.SaveChangesAsync();

            var inventory = new FlightClassInventory
            {
                FlightBookingId = flight.Id,
                TravelClass = travelClass,
                TotalSeats = totalSeats,
                AvailableSeats = availableSeats,
                PriceInr = priceInr
            };
            db.FlightClassInventories.Add(inventory);
            await db.SaveChangesAsync();

            // Seed 120 seats
            var letters = new[] { 'A', 'B', 'C', 'D', 'E', 'F' };
            var seats = new List<FlightSeat>();
            for (var i = 1; i <= totalSeats; i++)
            {
                var row = ((i - 1) / letters.Length) + 1;
                var letter = letters[(i - 1) % letters.Length];
                seats.Add(new FlightSeat
                {
                    FlightBookingId = flight.Id,
                    TravelClass = travelClass,
                    SeatCode = $"{row}{letter}",
                    IsBooked = false
                });
            }
            db.FlightSeats.AddRange(seats);
            await db.SaveChangesAsync();

            return (flight, inventory);
        }

        private CreateFlightBookingRequestDto MakeBookingRequest(
            string travelClass = "Economy",
            string couponCode = null,
            int? selectedPromotionId = null)
        {
            return new CreateFlightBookingRequestDto
            {
                PassengerName = "John Doe",
                PassengerPhone = "9876543210",
                PassengerEmail = "john@example.com",
                TravelClass = travelClass,
                CouponCode = couponCode,
                SelectedPromotionId = selectedPromotionId,
                Passengers = new List<CreateFlightPassengerDto>
                {
                    new() { FullName = "John Doe", PassengerType = "Adult", Gender = "Male" }
                }
            };
        }

        // Helper DTOs for deserialization
        private class FlightSearchResultDto
        {
            public int Id { get; set; }
            public string FlightNumber { get; set; }
            public string Airline { get; set; }
            public string FromCity { get; set; }
            public string ToCity { get; set; }
            public string SelectedTravelClass { get; set; }
            public decimal SelectedTravelClassPriceInr { get; set; }
            public int SelectedTravelClassAvailableSeats { get; set; }
            public decimal SupplierFare { get; set; }
            public decimal Markup { get; set; }
            public decimal PromotionDiscount { get; set; }
            public decimal DisplayFare { get; set; }
            public JsonElement PricingBreakdown { get; set; }
        }

        private class BookingResultDto
        {
            public string BookingId { get; set; }
            public int Id { get; set; }
            public string BookingReference { get; set; }
            public string Pnr { get; set; }
            public string TripType { get; set; }
            public int TripId { get; set; }
            public string TripNumber { get; set; }
            public string ProviderName { get; set; }
            public string FromCity { get; set; }
            public string ToCity { get; set; }
            public string Status { get; set; }
            public string PassengerName { get; set; }
            public string PassengerPhone { get; set; }
            public string PassengerEmail { get; set; }
            public string TravelClass { get; set; }
            public int Adults { get; set; }
            public int Children { get; set; }
            public int Infants { get; set; }
            public int SeatsBooked { get; set; }
            public decimal TotalPriceInr { get; set; }
            public decimal CustomerFareInr { get; set; }
            public decimal NetFareInr { get; set; }
            public decimal DiscountAmountInr { get; set; }
            public decimal ConvenienceFeeInr { get; set; }
            public string CouponCode { get; set; }
            public decimal SupplierBaseFare { get; set; }
            public decimal SupplierTaxAmount { get; set; }
            public decimal SupplierTotalFare { get; set; }
            public decimal MarkupAmount { get; set; }
            public int? PromotionId { get; set; }
            public string PromotionName { get; set; }
            public decimal PromotionDiscount { get; set; }
            public int? CouponId { get; set; }
            public decimal CouponDiscount { get; set; }
            public decimal ConvenienceFee { get; set; }
            public decimal FinalAmount { get; set; }
            public string PricingSnapshotJson { get; set; }
            public string CancellationReason { get; set; }
            public List<FlightPassengerResponseDto> Passengers { get; set; }
        }

        private class HotRouteDto
        {
            public string FromCity { get; set; }
            public string ToCity { get; set; }
            public long SearchCount { get; set; }
            public long BookingCount { get; set; }
            public long Score { get; set; }
        }

        // ════════════════════════════════════════════════
        //  REGION 1 — AUTH / UNAUTHORIZED TESTS
        // ════════════════════════════════════════════════

        #region Auth Tests

        [Fact]
        public async Task BookFlight_NoAuth_Returns401()
        {
            var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("api/flightbookings/1/book", new CreateFlightBookingRequestDto());
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetFlightBookings_NoAuth_Returns401()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("api/flightbookings/bookings");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetFlightBookingById_NoAuth_Returns401()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("api/flightbookings/bookings/1");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task CancelFlightBooking_NoAuth_Returns401()
        {
            var client = _factory.CreateClient();
            var response = await client.PostAsync("api/flightbookings/bookings/1/cancel", null);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task SearchFlights_AllowsAnonymous_Returns200()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("api/flightbookings");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetHotRoutes_AllowsAnonymous_Returns200()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("api/flightbookings/hot-routes");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetFlightSeatMap_AllowsAnonymous_Returns200Or404()
        {
            // Seat map is AllowAnonymous but returns NotFound for invalid flight
            var client = _factory.CreateClient();
            var response = await client.GetAsync("api/flightbookings/99999/seats");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        // ════════════════════════════════════════════════
        //  REGION 2 — SEARCH FLIGHTS
        // ════════════════════════════════════════════════

        #region SearchFlights Integration Tests

        [Fact]
        public async Task SearchFlights_WithSeededFlight_ReturnsFlightWithPricingBreakdown()
        {
            // Arrange
            var (flight, inv) = await SeedFlightWithInventoryAsync();
            var client = GetAnonymousClientWithGuestHeader();

            // Act
            var response = await client.GetAsync($"api/flightbookings?fromCity=Delhi&toCity=Mumbai");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<FlightSearchResultDto>>();
            results.Should().NotBeNull();

            var match = results.FirstOrDefault(x => x.Id == flight.Id);
            match.Should().NotBeNull();
            match.FlightNumber.Should().Be("AI-101");
            match.FromCity.Should().Be("Delhi");
            match.ToCity.Should().Be("Mumbai");
            match.SelectedTravelClass.Should().Be("Economy");
            match.SelectedTravelClassPriceInr.Should().Be(5000m);
            match.SelectedTravelClassAvailableSeats.Should().Be(120);
            match.SupplierFare.Should().BeGreaterThan(0);
            match.DisplayFare.Should().BeGreaterThan(0);
        }

        [Fact]
        public async Task SearchFlights_InvalidTravelClass_ReturnsBadRequest()
        {
            var client = GetAnonymousClientWithGuestHeader();
            var response = await client.GetAsync("api/flightbookings?travelClass=InvalidClass");
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task SearchFlights_NoResults_ReturnsEmptyArray()
        {
            var client = GetAnonymousClientWithGuestHeader();
            var response = await client.GetAsync("api/flightbookings?fromCity=Timbuktu&toCity=Atlantis");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<object>>();
            results.Should().NotBeNull();
            results.Count.Should().Be(0);
        }

        [Fact]
        public async Task SearchFlights_WithFromAndToRouteAliases_ReturnsResults()
        {
            // Using "from" and "to" query params instead of "fromCity" and "toCity"
            var (flight, _) = await SeedFlightWithInventoryAsync("Pune", "Chennai");
            var client = GetAnonymousClientWithGuestHeader();

            var response = await client.GetAsync("api/flightbookings?from=Pune&to=Chennai");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<FlightSearchResultDto>>();
            results.Should().NotBeNull();
            results.Any(x => x.Id == flight.Id).Should().BeTrue();
        }

        [Fact]
        public async Task SearchFlights_IncrementsRouteStats()
        {
            var client = GetAnonymousClientWithGuestHeader();
            // First seed a flight so there's data to search
            await SeedFlightWithInventoryAsync("Bengaluru", "Hyderabad");

            await client.GetAsync("api/flightbookings?fromCity=Bengaluru&toCity=Hyderabad");

            using var db = GetDbContext();
            var stat = await db.FlightRouteStats
                .FirstOrDefaultAsync(x => x.FromCity == "Bengaluru" && x.ToCity == "Hyderabad");
            stat.Should().NotBeNull();
            stat.SearchCount.Should().BeGreaterThanOrEqualTo(1);
        }

        #endregion

        // ════════════════════════════════════════════════
        //  REGION 3 — HOT ROUTES
        // ════════════════════════════════════════════════

        #region Hot Routes Integration Tests

        [Fact]
        public async Task GetHotRoutes_WithStats_ReturnsRankedRoutes()
        {
            using var db = GetDbContext();
            db.FlightRouteStats.Add(new FlightRouteStat
            {
                FromCity = "Delhi",
                ToCity = "Kolkata",
                SearchCount = 100,
                BookingCount = 25,
                LastSearchedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            var client = _factory.CreateClient();
            var response = await client.GetAsync("api/flightbookings/hot-routes?metric=score");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var routes = await response.Content.ReadFromJsonAsync<List<HotRouteDto>>();
            routes.Should().NotBeNull();
            routes.Count.Should().BeGreaterThan(0);
        }

        [Fact]
        public async Task GetHotRoutes_InvalidMetric_ReturnsBadRequest()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("api/flightbookings/hot-routes?metric=invalid");
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GetHotRoutes_SearchMetric_SortsCorrectly()
        {
            using var db = GetDbContext();
            db.FlightRouteStats.Add(new FlightRouteStat
            {
                FromCity = "AAA",
                ToCity = "BBB",
                SearchCount = 200,
                BookingCount = 5
            });
            db.FlightRouteStats.Add(new FlightRouteStat
            {
                FromCity = "CCC",
                ToCity = "DDD",
                SearchCount = 50,
                BookingCount = 100
            });
            await db.SaveChangesAsync();

            var client = _factory.CreateClient();
            var response = await client.GetAsync("api/flightbookings/hot-routes?metric=search");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var routes = await response.Content.ReadFromJsonAsync<List<HotRouteDto>>();
            routes.Should().NotBeNull();
            // "AAA"->"BBB" should appear before "CCC"->"DDD" when sorted by search count
            var idxA = routes.FindIndex(x => x.FromCity == "AAA");
            var idxC = routes.FindIndex(x => x.FromCity == "CCC");
            if (idxA >= 0 && idxC >= 0)
            {
                idxA.Should().BeLessThan(idxC);
            }
        }

        #endregion

        // ════════════════════════════════════════════════
        //  REGION 4 — SEAT MAP
        // ════════════════════════════════════════════════

        #region Seat Map Integration Tests

        [Fact]
        public async Task GetFlightSeatMap_ValidFlight_ReturnsSeatLayout()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = _factory.CreateClient();

            var response = await client.GetAsync($"api/flightbookings/{flight.Id}/seats?travelClass=Economy");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var seatMap = await response.Content.ReadFromJsonAsync<SeatMapResponseDto>();
            seatMap.Should().NotBeNull();
            seatMap.TripId.Should().Be(flight.Id);
            seatMap.TravelClass.Should().Be("Economy");
            seatMap.TotalSeats.Should().Be(120);
            seatMap.AvailableSeats.Should().Be(120);
            seatMap.BookedSeats.Should().Be(0);
            seatMap.Seats.Should().HaveCount(120);
        }

        [Fact]
        public async Task GetFlightSeatMap_InvalidFlight_ReturnsNotFound()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("api/flightbookings/999999/seats");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetFlightSeatMap_InvalidTravelClass_ReturnsBadRequest()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = _factory.CreateClient();
            var response = await client.GetAsync($"api/flightbookings/{flight.Id}/seats?travelClass=SuperFirst");
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        // ════════════════════════════════════════════════
        //  REGION 5 — BOOK FLIGHT
        // ════════════════════════════════════════════════

        #region BookFlight Integration Tests

        [Fact]
        public async Task BookFlight_HappyPath_Returns201WithFullPricingBreakdown()
        {
            // Arrange
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = MakeBookingRequest();

            // Act
            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var booking = await response.Content.ReadFromJsonAsync<BookingResultDto>();
            booking.Should().NotBeNull();

            // Core booking fields
            booking.Id.Should().BeGreaterThan(0);
            booking.BookingId.Should().StartWith("FL-");
            booking.Pnr.Should().HaveLength(6);
            booking.TripType.Should().Be("Flight");
            booking.TripId.Should().Be(flight.Id);
            booking.TripNumber.Should().Be("AI-101");
            booking.ProviderName.Should().Be("Air India");
            booking.FromCity.Should().Be("Delhi");
            booking.ToCity.Should().Be("Mumbai");
            booking.Status.Should().Be("Booked");
            booking.PassengerName.Should().Be("John Doe");
            booking.PassengerPhone.Should().Be("9876543210");
            booking.PassengerEmail.Should().Be("john@example.com");
            booking.TravelClass.Should().Be("Economy");
            booking.Adults.Should().Be(1);
            booking.SeatsBooked.Should().Be(1);

            // Pricing breakdown
            booking.SupplierTotalFare.Should().BeGreaterThan(0);
            booking.SupplierBaseFare.Should().BeGreaterThan(0);
            booking.SupplierTaxAmount.Should().BeGreaterThanOrEqualTo(0);
            booking.FinalAmount.Should().BeGreaterThan(0);
            booking.TotalPriceInr.Should().Be(booking.FinalAmount);
            booking.CustomerFareInr.Should().Be(booking.FinalAmount);
            booking.PricingSnapshotJson.Should().NotBeNullOrWhiteSpace();

            // Passengers
            booking.Passengers.Should().HaveCount(1);
            booking.Passengers[0].FullName.Should().Be("John Doe");
            booking.Passengers[0].PassengerType.Should().Be("Adult");
            booking.Passengers[0].Gender.Should().Be("Male");
            booking.Passengers[0].SeatNumber.Should().NotBeNullOrWhiteSpace();
        }

        [Fact]
        public async Task BookFlight_DecrementsSeatInventory()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = MakeBookingRequest();

            await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);

            using var db = GetDbContext();
            var updatedInv = await db.FlightClassInventories
                .FirstOrDefaultAsync(x => x.FlightBookingId == flight.Id && x.TravelClass == "Economy");
            updatedInv.AvailableSeats.Should().Be(119);

            var updatedFlight = await db.FlightBookings.FindAsync(flight.Id);
            updatedFlight.AvailableSeats.Should().Be(119);
        }

        [Fact]
        public async Task BookFlight_MarksSeatAsBooked()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = MakeBookingRequest();

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            var booking = await response.Content.ReadFromJsonAsync<BookingResultDto>();

            using var db = GetDbContext();
            var seatCode = booking.Passengers[0].SeatNumber;
            var seat = await db.FlightSeats
                .FirstOrDefaultAsync(x => x.FlightBookingId == flight.Id && x.SeatCode == seatCode);
            seat.Should().NotBeNull();
            seat.IsBooked.Should().BeTrue();
        }

        [Fact]
        public async Task BookFlight_TracksRouteBookingCount()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = MakeBookingRequest();

            await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);

            using var db = GetDbContext();
            var stat = await db.FlightRouteStats
                .FirstOrDefaultAsync(x => x.FromCity == "Delhi" && x.ToCity == "Mumbai");
            stat.Should().NotBeNull();
            stat.BookingCount.Should().BeGreaterThanOrEqualTo(1);
        }

        [Fact]
        public async Task BookFlight_SendsEmailNotification()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = MakeBookingRequest();

            await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);

            _mockNotificationService.Verify(
                x => x.TrySendTicketEmailAsync(It.IsAny<TicketEmailRequestDto>(), It.IsAny<CancellationToken>()),
                Times.AtLeastOnce);
        }

        [Fact]
        public async Task BookFlight_FlightNotFound_ReturnsBadRequest()
        {
            var client = GetAuthenticatedClient();
            var request = MakeBookingRequest();

            var response = await client.PostAsJsonAsync("api/flightbookings/999999/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task BookFlight_MissingPassengerName_ReturnsBadRequest()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "",
                PassengerPhone = "9876543210"
            };

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task BookFlight_MissingPassengerPhone_ReturnsBadRequest()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "John",
                PassengerPhone = ""
            };

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task BookFlight_InvalidTravelClass_ReturnsBadRequest()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = MakeBookingRequest("SuperDuperClass");

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task BookFlight_MultiplePassengers_AssignsSeatsToAdultsAndChildren()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "Jane Doe",
                PassengerPhone = "9876543210",
                TravelClass = "Economy",
                Passengers = new List<CreateFlightPassengerDto>
                {
                    new() { FullName = "Jane Doe", PassengerType = "Adult", Gender = "Female" },
                    new() { FullName = "Kid Doe", PassengerType = "Child", Gender = "Male" },
                    new() { FullName = "Baby Doe", PassengerType = "Infant", Gender = "Female" }
                }
            };

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var booking = await response.Content.ReadFromJsonAsync<BookingResultDto>();

            booking.Adults.Should().Be(1);
            booking.Children.Should().Be(1);
            booking.Infants.Should().Be(1);
            booking.SeatsBooked.Should().Be(2); // Adult + Child, Infant has no seat

            // Jane and Kid should have seat numbers, Baby should not
            var jane = booking.Passengers.First(p => p.FullName == "Jane Doe");
            var kid = booking.Passengers.First(p => p.FullName == "Kid Doe");
            var baby = booking.Passengers.First(p => p.FullName == "Baby Doe");
            jane.SeatNumber.Should().NotBeNullOrWhiteSpace();
            kid.SeatNumber.Should().NotBeNullOrWhiteSpace();
            baby.SeatNumber.Should().BeNull();
        }

        [Fact]
        public async Task BookFlight_InfantsMoreThanAdults_ReturnsBadRequest()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "Solo Infant",
                PassengerPhone = "9876543210",
                TravelClass = "Economy",
                Passengers = new List<CreateFlightPassengerDto>
                {
                    new() { FullName = "Adult One", PassengerType = "Adult", Gender = "Male" },
                    new() { FullName = "Infant One", PassengerType = "Infant", Gender = "Male" },
                    new() { FullName = "Infant Two", PassengerType = "Infant", Gender = "Female" }
                }
            };

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task BookFlight_NoAdultWithChild_ReturnsBadRequest()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "Child Only",
                PassengerPhone = "9876543210",
                TravelClass = "Economy",
                Passengers = new List<CreateFlightPassengerDto>
                {
                    new() { FullName = "Child One", PassengerType = "Child", Gender = "Male" }
                }
            };

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task BookFlight_InvalidPassengerGender_ReturnsBadRequest()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "Test",
                PassengerPhone = "9876543210",
                TravelClass = "Economy",
                Passengers = new List<CreateFlightPassengerDto>
                {
                    new() { FullName = "Test Person", PassengerType = "Adult", Gender = "InvalidGender" }
                }
            };

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task BookFlight_InvalidPassengerType_ReturnsBadRequest()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "Test",
                PassengerPhone = "9876543210",
                TravelClass = "Economy",
                Passengers = new List<CreateFlightPassengerDto>
                {
                    new() { FullName = "Test Person", PassengerType = "Toddler", Gender = "Male" }
                }
            };

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task BookFlight_EmptyPassengerFullName_ReturnsBadRequest()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "Test",
                PassengerPhone = "9876543210",
                TravelClass = "Economy",
                Passengers = new List<CreateFlightPassengerDto>
                {
                    new() { FullName = "", PassengerType = "Adult", Gender = "Male" }
                }
            };

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task BookFlight_DepartedFlight_ReturnsBadRequest()
        {
            // Seed a flight in the past
            var (flight, _) = await SeedFlightWithInventoryAsync(hoursFromNow: -2);
            var client = GetAuthenticatedClient();
            var request = MakeBookingRequest();

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("already departed");
        }

        [Fact]
        public async Task BookFlight_NotEnoughSeats_ReturnsBadRequest()
        {
            // Seed a flight with only 1 available seat
            var (flight, _) = await SeedFlightWithInventoryAsync(availableSeats: 1, totalSeats: 1);
            var client = GetAuthenticatedClient();
            // Try to book 2 seats
            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "Test",
                PassengerPhone = "9876543210",
                TravelClass = "Economy",
                Passengers = new List<CreateFlightPassengerDto>
                {
                    new() { FullName = "Adult1", PassengerType = "Adult", Gender = "Male" },
                    new() { FullName = "Adult2", PassengerType = "Adult", Gender = "Female" }
                }
            };

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task BookFlight_WithUsingFallbackAdults_CreatesDefaultPassengers()
        {
            // When no Passengers list, uses Adults/Children/Infants counts
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();
            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "Fallback User",
                PassengerPhone = "9876543210",
                TravelClass = "Economy",
                Adults = 2,
                Children = 0,
                Infants = 0,
                Passengers = new List<CreateFlightPassengerDto>() // empty list
            };

            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var booking = await response.Content.ReadFromJsonAsync<BookingResultDto>();
            booking.Adults.Should().Be(2);
            booking.SeatsBooked.Should().Be(2);
            booking.Passengers.Should().HaveCount(2);
        }

        [Fact]
        public async Task BookFlight_UniquePnrGenerated()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient();

            // Book twice
            var resp1 = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());
            var resp2 = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());

            var b1 = await resp1.Content.ReadFromJsonAsync<BookingResultDto>();
            var b2 = await resp2.Content.ReadFromJsonAsync<BookingResultDto>();

            b1.Pnr.Should().NotBe(b2.Pnr);
            b1.BookingReference.Should().NotBe(b2.BookingReference);
        }

        #endregion

        // ════════════════════════════════════════════════
        //  REGION 6 — GET BOOKINGS
        // ════════════════════════════════════════════════

        #region GetFlightBookings Integration Tests

        [Fact]
        public async Task GetFlightBookings_ReturnsOnlyUsersBookings()
        {
            // Arrange: Book a flight
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 42);
            var request = MakeBookingRequest();
            await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);

            // Act
            var response = await client.GetAsync("api/flightbookings/bookings");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var bookings = await response.Content.ReadFromJsonAsync<List<BookingResultDto>>();
            bookings.Should().NotBeNull();
            bookings.Count.Should().BeGreaterThanOrEqualTo(1);
            bookings.All(b => b.FromCity != null).Should().BeTrue(); // sanity check
        }

        [Fact]
        public async Task GetFlightBookings_DifferentUser_ReturnsEmpty()
        {
            // Arrange: Book as user 42
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client42 = GetAuthenticatedClient(userId: 42);
            await client42.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());

            // Act: Query as user 43
            var client43 = GetAuthenticatedClient(userId: 43);
            var response = await client43.GetAsync("api/flightbookings/bookings");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var bookings = await response.Content.ReadFromJsonAsync<List<BookingResultDto>>();
            bookings.Should().NotBeNull();
            // User 43 should not see user 42's bookings
            bookings.Count.Should().Be(0);
        }

        [Fact]
        public async Task GetFlightBookings_FilterByStatus_Works()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 50);
            await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());

            // Filter by "Booked" status
            var response = await client.GetAsync("api/flightbookings/bookings?status=Booked");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var bookings = await response.Content.ReadFromJsonAsync<List<BookingResultDto>>();
            bookings.Should().NotBeNull();
            bookings.All(b => b.Status == "Booked").Should().BeTrue();
        }

        #endregion

        // ════════════════════════════════════════════════
        //  REGION 7 — GET BOOKING BY ID
        // ════════════════════════════════════════════════

        #region GetFlightBookingById Integration Tests

        [Fact]
        public async Task GetFlightBookingById_ValidId_ReturnsFullBooking()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 60);
            var bookResp = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());
            var booking = await bookResp.Content.ReadFromJsonAsync<BookingResultDto>();

            var response = await client.GetAsync($"api/flightbookings/bookings/{booking.BookingId}");
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var result = await response.Content.ReadFromJsonAsync<BookingResultDto>();
            result.Should().NotBeNull();
            result.BookingId.Should().Be(booking.BookingId);
            result.Pnr.Should().Be(booking.Pnr);
            result.Passengers.Should().NotBeNull();
            result.Passengers.Count.Should().BeGreaterThan(0);

            // Full pricing breakdown should be present
            result.SupplierTotalFare.Should().BeGreaterThan(0);
            result.FinalAmount.Should().BeGreaterThan(0);
            result.PricingSnapshotJson.Should().NotBeNullOrWhiteSpace();
        }

        [Fact]
        public async Task GetFlightBookingById_WrongUser_ReturnsNotFound()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 61);
            var bookResp = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());
            var booking = await bookResp.Content.ReadFromJsonAsync<BookingResultDto>();

            // Different user
            var client2 = GetAuthenticatedClient(userId: 62);
            var response = await client2.GetAsync($"api/flightbookings/bookings/{booking.BookingId}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetFlightBookingById_InvalidId_ReturnsNotFound()
        {
            var client = GetAuthenticatedClient();
            var response = await client.GetAsync("api/flightbookings/bookings/99999");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        // ════════════════════════════════════════════════
        //  REGION 8 — CANCEL BOOKING
        // ════════════════════════════════════════════════

        #region CancelFlightBooking Integration Tests

        [Fact]
        public async Task CancelFlightBooking_HappyPath_SetsStatusAndRestoresSeats()
        {
            // Arrange: Book
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 70);
            var bookResp = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());
            var booking = await bookResp.Content.ReadFromJsonAsync<BookingResultDto>();

            // Act: Cancel
            var cancelResp = await client.PostAsync(
                $"api/flightbookings/bookings/{booking.BookingId}/cancel?reason=Changed%20plans", null);

            // Assert
            cancelResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var cancelled = await cancelResp.Content.ReadFromJsonAsync<BookingResultDto>();
            cancelled.Status.Should().Be("Cancelled");
            cancelled.CancellationReason.Should().Be("Changed plans");

            // Verify seats restored
            using var db = GetDbContext();
            var updatedInv = await db.FlightClassInventories
                .FirstOrDefaultAsync(x => x.FlightBookingId == flight.Id && x.TravelClass == "Economy");
            updatedInv.AvailableSeats.Should().Be(120); // restored

            var updatedFlight = await db.FlightBookings.FindAsync(flight.Id);
            updatedFlight.AvailableSeats.Should().Be(120); // restored

            // Verify seat is unbooked
            var seatCode = booking.Passengers[0].SeatNumber;
            var seat = await db.FlightSeats
                .FirstOrDefaultAsync(x => x.FlightBookingId == flight.Id && x.SeatCode == seatCode);
            seat.IsBooked.Should().BeFalse();
        }

        [Fact]
        public async Task CancelFlightBooking_DefaultReason_UsesDefaultText()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 71);
            var bookResp = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());
            var booking = await bookResp.Content.ReadFromJsonAsync<BookingResultDto>();

            var cancelResp = await client.PostAsync(
                $"api/flightbookings/bookings/{booking.BookingId}/cancel", null);

            cancelResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var cancelled = await cancelResp.Content.ReadFromJsonAsync<BookingResultDto>();
            cancelled.CancellationReason.Should().Be("Cancelled by user");
        }

        [Fact]
        public async Task CancelFlightBooking_AlreadyCancelled_ReturnsBadRequest()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 72);
            var bookResp = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());
            var booking = await bookResp.Content.ReadFromJsonAsync<BookingResultDto>();

            // Cancel once
            await client.PostAsync($"api/flightbookings/bookings/{booking.BookingId}/cancel", null);

            // Cancel again
            var resp2 = await client.PostAsync($"api/flightbookings/bookings/{booking.BookingId}/cancel", null);
            resp2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CancelFlightBooking_WrongUser_ReturnsBadRequest()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 73);
            var bookResp = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());
            var booking = await bookResp.Content.ReadFromJsonAsync<BookingResultDto>();

            var client2 = GetAuthenticatedClient(userId: 74);
            var response = await client2.PostAsync(
                $"api/flightbookings/bookings/{booking.BookingId}/cancel", null);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CancelFlightBooking_NonExistentBooking_ReturnsBadRequest()
        {
            var client = GetAuthenticatedClient(userId: 75);
            var response = await client.PostAsync(
                "api/flightbookings/bookings/99999/cancel", null);
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        // ════════════════════════════════════════════════
        //  REGION 9 — END-TO-END FLOW
        // ════════════════════════════════════════════════

        #region Full E2E Flow

        [Fact]
        public async Task FullFlow_SearchBookViewCancel_WorksEndToEnd()
        {
            // 1. Seed flight
            var (flight, _) = await SeedFlightWithInventoryAsync("Jaipur", "Kochi", 6000m, 120, 120, "Economy", 48);
            var client = GetAuthenticatedClient(userId: 80);

            // 2. Search flights
            var searchResp = await client.GetAsync("api/flightbookings?fromCity=Jaipur&toCity=Kochi");
            searchResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var searchResults = await searchResp.Content.ReadFromJsonAsync<List<FlightSearchResultDto>>();
            var found = searchResults.FirstOrDefault(x => x.Id == flight.Id);
            found.Should().NotBeNull();
            found.DisplayFare.Should().BeGreaterThan(0);

            // 3. Get seat map
            var seatResp = await client.GetAsync($"api/flightbookings/{flight.Id}/seats?travelClass=Economy");
            seatResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var seatMap = await seatResp.Content.ReadFromJsonAsync<SeatMapResponseDto>();
            seatMap.AvailableSeats.Should().Be(120);

            // 4. Book flight
            var bookResp = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());
            bookResp.StatusCode.Should().Be(HttpStatusCode.Created);
            var booking = await bookResp.Content.ReadFromJsonAsync<BookingResultDto>();
            booking.Status.Should().Be("Booked");

            // 5. Get user bookings
            var listResp = await client.GetAsync("api/flightbookings/bookings");
            listResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var bookings = await listResp.Content.ReadFromJsonAsync<List<BookingResultDto>>();
            bookings.Should().Contain(b => b.BookingId == booking.BookingId);

            // 6. Get booking by ID
            var byIdResp = await client.GetAsync($"api/flightbookings/bookings/{booking.BookingId}");
            byIdResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var byId = await byIdResp.Content.ReadFromJsonAsync<BookingResultDto>();
            byId.Pnr.Should().Be(booking.Pnr);
            byId.FinalAmount.Should().Be(booking.FinalAmount);

            // 7. Verify seat map shows 1 fewer available seat
            var seatResp2 = await client.GetAsync($"api/flightbookings/{flight.Id}/seats?travelClass=Economy");
            var seatMap2 = await seatResp2.Content.ReadFromJsonAsync<SeatMapResponseDto>();
            seatMap2.AvailableSeats.Should().Be(119);
            seatMap2.BookedSeats.Should().Be(1);

            // 8. Cancel booking
            var cancelResp = await client.PostAsync(
                $"api/flightbookings/bookings/{booking.BookingId}/cancel?reason=E2E%20Test", null);
            cancelResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var cancelled = await cancelResp.Content.ReadFromJsonAsync<BookingResultDto>();
            cancelled.Status.Should().Be("Cancelled");

            // 9. Verify seat is restored
            var seatResp3 = await client.GetAsync($"api/flightbookings/{flight.Id}/seats?travelClass=Economy");
            var seatMap3 = await seatResp3.Content.ReadFromJsonAsync<SeatMapResponseDto>();
            seatMap3.AvailableSeats.Should().Be(120);
            seatMap3.BookedSeats.Should().Be(0);
        }

        [Fact]
        public async Task FullFlow_BookMultiplePassengers_VerifyCorrectPricingAndSeats()
        {
            // Arrange
            var (flight, _) = await SeedFlightWithInventoryAsync("Ahmedabad", "Pune", 4500m, 120, 120, "Economy", 36);
            var client = GetAuthenticatedClient(userId: 81);

            var request = new CreateFlightBookingRequestDto
            {
                PassengerName = "Family Head",
                PassengerPhone = "1234567890",
                PassengerEmail = "family@example.com",
                TravelClass = "Economy",
                Passengers = new List<CreateFlightPassengerDto>
                {
                    new() { FullName = "Father", PassengerType = "Adult", Gender = "Male" },
                    new() { FullName = "Mother", PassengerType = "Adult", Gender = "Female" },
                    new() { FullName = "Child A", PassengerType = "Child", Gender = "Male" },
                    new() { FullName = "Infant X", PassengerType = "Infant", Gender = "Female" }
                }
            };

            // Act
            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var booking = await response.Content.ReadFromJsonAsync<BookingResultDto>();

            booking.Adults.Should().Be(2);
            booking.Children.Should().Be(1);
            booking.Infants.Should().Be(1);
            booking.SeatsBooked.Should().Be(3); // 2 adults + 1 child

            // Pricing should account for 3 passengers (infant excluded from seats)
            booking.SupplierTotalFare.Should().BeGreaterThan(0);
            booking.FinalAmount.Should().BeGreaterThan(0);

            // Verify passengers
            booking.Passengers.Should().HaveCount(4);
            booking.Passengers.Count(p => p.SeatNumber != null).Should().Be(3); // 2A + 1C
            booking.Passengers.Single(p => p.FullName == "Infant X").SeatNumber.Should().BeNull();

            // Verify inventory
            using var db = GetDbContext();
            var inv = await db.FlightClassInventories
                .FirstOrDefaultAsync(x => x.FlightBookingId == flight.Id && x.TravelClass == "Economy");
            inv.AvailableSeats.Should().Be(117); // 120 - 3
        }

        #endregion

        // ════════════════════════════════════════════════
        //  REGION 10 — PRICING BREAKDOWN VERIFICATION
        // ════════════════════════════════════════════════

        #region Pricing Breakdown Integration Tests

        [Fact]
        public async Task BookFlight_PricingSnapshotContainsAllFields()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 90);
            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());

            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var booking = await response.Content.ReadFromJsonAsync<BookingResultDto>();

            // Parse PricingSnapshotJson
            var snapshot = JsonSerializer.Deserialize<FlightPricingBreakdownDto>(
                booking.PricingSnapshotJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            snapshot.Should().NotBeNull();
            snapshot.SupplierTotalFare.Should().BeGreaterThan(0);
            snapshot.SupplierBaseFare.Should().BeGreaterThan(0);
            snapshot.FinalAmount.Should().BeGreaterThan(0);

            // FinalAmount = SupplierTotalFare + Markup - PromotionDiscount - CouponDiscount + ConvenienceFee
            var expected = snapshot.SupplierTotalFare
                           + snapshot.MarkupAmount
                           - snapshot.PromotionDiscount
                           - snapshot.CouponDiscount
                           + snapshot.ConvenienceFee;
            snapshot.FinalAmount.Should().Be(expected);
        }

        [Fact]
        public async Task BookFlight_PricingFieldsMatchSnapshot()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 91);
            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());

            var booking = await response.Content.ReadFromJsonAsync<BookingResultDto>();

            // Booking-level fields must match PricingSnapshot
            var snapshot = JsonSerializer.Deserialize<FlightPricingBreakdownDto>(
                booking.PricingSnapshotJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            booking.SupplierBaseFare.Should().Be(snapshot.SupplierBaseFare);
            booking.SupplierTaxAmount.Should().Be(snapshot.SupplierTaxAmount);
            booking.SupplierTotalFare.Should().Be(snapshot.SupplierTotalFare);
            booking.MarkupAmount.Should().Be(snapshot.MarkupAmount);
            booking.PromotionDiscount.Should().Be(snapshot.PromotionDiscount);
            booking.CouponDiscount.Should().Be(snapshot.CouponDiscount);
            booking.ConvenienceFee.Should().Be(snapshot.ConvenienceFee);
            booking.FinalAmount.Should().Be(snapshot.FinalAmount);
        }

        [Fact]
        public async Task BookFlight_SupplierTaxIsCalculatedCorrectly()
        {
            // SupplierTaxAmount = SupplierTotalFare * 0.12 (rounded)
            // SupplierBaseFare = SupplierTotalFare - SupplierTaxAmount
            var (flight, _) = await SeedFlightWithInventoryAsync(priceInr: 10000m);
            var client = GetAuthenticatedClient(userId: 92);
            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());

            var booking = await response.Content.ReadFromJsonAsync<BookingResultDto>();

            // SupplierTotalFare = unitPrice * passengerCount = 10000 * 1 = 10000
            booking.SupplierTotalFare.Should().Be(10000m);
            var expectedTax = decimal.Round(10000m * 0.12m, 2, MidpointRounding.AwayFromZero);
            booking.SupplierTaxAmount.Should().Be(expectedTax);
            booking.SupplierBaseFare.Should().Be(10000m - expectedTax);
        }

        #endregion

        // ════════════════════════════════════════════════
        //  REGION 11 — DATABASE STATE PERSISTENCE
        // ════════════════════════════════════════════════

        #region Database State Tests

        [Fact]
        public async Task BookFlight_CreatesReservationInDatabase()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 100);
            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());
            var booking = await response.Content.ReadFromJsonAsync<BookingResultDto>();

            using var db = GetDbContext();
            var reservation = await db.FlightReservations.FindAsync(booking.Id);
            reservation.Should().NotBeNull();
            reservation.Status.Should().Be("Booked");
            reservation.FlightBookingId.Should().Be(flight.Id);
            reservation.TravelClass.Should().Be("Economy");
            reservation.Adults.Should().Be(1);
            reservation.SeatsBooked.Should().Be(1);
        }

        [Fact]
        public async Task BookFlight_CreatesPassengerRecordsInDatabase()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 101);
            var response = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());
            var booking = await response.Content.ReadFromJsonAsync<BookingResultDto>();

            using var db = GetDbContext();
            var passengers = await db.FlightReservationPassengers
                .Where(x => x.FlightReservationId == booking.Id)
                .ToListAsync();
            passengers.Should().HaveCount(1);
            passengers[0].FullName.Should().Be("John Doe");
            passengers[0].PassengerType.Should().Be("Adult");
            passengers[0].Gender.Should().Be("Male");
            passengers[0].SeatNumber.Should().NotBeNullOrWhiteSpace();
        }

        [Fact]
        public async Task CancelFlightBooking_SetsStatusInDatabase()
        {
            var (flight, _) = await SeedFlightWithInventoryAsync();
            var client = GetAuthenticatedClient(userId: 102);
            var bookResp = await client.PostAsJsonAsync($"api/flightbookings/{flight.Id}/book", MakeBookingRequest());
            var booking = await bookResp.Content.ReadFromJsonAsync<BookingResultDto>();

            await client.PostAsync($"api/flightbookings/bookings/{booking.BookingId}/cancel", null);

            using var db = GetDbContext();
            var reservation = await db.FlightReservations.FindAsync(booking.Id);
            reservation.Status.Should().Be("Cancelled");
            reservation.CancelledAtUtc.Should().NotBeNull();
            reservation.CancellationReason.Should().Be("Cancelled by user");
        }

        #endregion
    }
}
