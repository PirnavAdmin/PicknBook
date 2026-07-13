#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
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
    public class BusBookingsControllerIntegrationTests : IClassFixture<WebApplicationFactory<BusBookingsController>>, IDisposable
    {
        private readonly WebApplicationFactory<BusBookingsController> _factory;
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;
        private readonly Mock<ITicketEmailService> _mockTicketEmailService;
        private readonly Mock<IWhatsAppService> _mockWhatsAppService;

        public BusBookingsControllerIntegrationTests(WebApplicationFactory<BusBookingsController> factory)
        {
            _mockTicketEmailService = new Mock<ITicketEmailService>();
            _mockWhatsAppService = new Mock<IWhatsAppService>();

            _connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:");
            _connection.Open();

            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Remove existing AppDbContext options and implementation descriptors
                    var optionsDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                    if (optionsDescriptor != null)
                    {
                        services.Remove(optionsDescriptor);
                    }

                    var dbContextDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(AppDbContext));
                    if (dbContextDescriptor != null)
                    {
                        services.Remove(dbContextDescriptor);
                    }

                    // Replace with Sqlite in-memory database using the same connection instance
                    services.AddDbContext<AppDbContext>(options =>
                    {
                        options.UseSqlite(_connection);
                    });

                    // Replace external notification services with mocks
                    var emailDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(ITicketEmailService));
                    if (emailDescriptor != null)
                    {
                        services.Remove(emailDescriptor);
                    }
                    services.AddSingleton<ITicketEmailService>(_mockTicketEmailService.Object);

                    var whatsAppDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(IWhatsAppService));
                    if (whatsAppDescriptor != null)
                    {
                        services.Remove(whatsAppDescriptor);
                    }
                    services.AddSingleton<IWhatsAppService>(_mockWhatsAppService.Object);
                });
            });

            // Ensure the schema is created on our open connection
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
        }

        public void Dispose()
        {
            _connection?.Close();
            _connection?.Dispose();
        }

        private HttpClient GetAuthenticatedClient(string role = AuthRoles.User, int userId = 1)
        {
            var client = _factory.CreateClient();

            using var scope = _factory.Services.CreateScope();
            var jwtService = scope.ServiceProvider.GetRequiredService<IJwtService>();
            var token = jwtService.GenerateToken(new User
            {
                Id = userId,
                Email = "user@picknbook.com",
                Role = role
            }, role);

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        private HttpClient GetAnonymousClientWithGuestHeader()
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("X-Guest-Id", "guest_integration-test");
            return client;
        }

        private AppDbContext GetDbContext()
        {
            var scope = _factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<AppDbContext>();
        }

        private class CouponResponseDto
        {
            public int Id { get; set; }
            public string CouponCode { get; set; }
        }

        private class SearchBusResponseDto
        {
            public int Id { get; set; }
            public string BusNumber { get; set; }
        }

        private class PricingConfigResponse
        {
            public decimal BaseFare { get; set; }
            public string MarkupType { get; set; }
            public decimal MarkupValue { get; set; }
            public decimal MarkupAmount { get; set; }
            public decimal SellingFare { get; set; }
            public decimal GstPercent { get; set; }
            public decimal GstAmount { get; set; }
            public decimal ConvenienceFee { get; set; }
            public decimal GrandTotal { get; set; }
        }

        #region Endpoints Auth & Basic tests

        [Fact]
        public async Task BookBus_UnauthorizedWhenNoTokenProvided_Returns401()
        {
            var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("api/busbookings/1/book", new CreateBusBookingRequestDto());
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetBusBookings_UnauthorizedWhenNoTokenProvided_Returns401()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("api/busbookings/bookings");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetBusBookingById_UnauthorizedWhenNoTokenProvided_Returns401()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync("api/busbookings/bookings/1");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task CancelBusBooking_UnauthorizedWhenNoTokenProvided_Returns401()
        {
            var client = _factory.CreateClient();
            var response = await client.PostAsync("api/busbookings/bookings/1/cancel", null);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        #endregion

        #region GetAvailableCoupons Integration Tests

        [Fact]
        public async Task GetAvailableCoupons_HappyPath_ReturnsActiveCoupons()
        {
            // Arrange
            var client = _factory.CreateClient();
            using var db = GetDbContext();
            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5));
            db.BusCoupons.Add(new BusCoupon
            {
                CouponCode = "SAVE20",
                CouponType = "Percentage",
                Value = 20,
                Status = "Active",
                StartDate = today.AddDays(-1),
                ExpiryDate = today.AddDays(5)
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/busbookings/user/available");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await response.Content.ReadFromJsonAsync<List<CouponResponseDto>>();
            list.Should().NotBeNull();
            list.Count.Should().Be(1);
            list[0].CouponCode.Should().Be("SAVE20");
        }

        #endregion

        #region SearchBuses Integration Tests

        [Fact]
        public async Task SearchBuses_HappyPath_ReturnsBusesAndIncrementsLogs()
        {
            // Arrange
            var client = GetAnonymousClientWithGuestHeader();
            using var db = GetDbContext();
            var depTime = DateTime.UtcNow.AddHours(12);
            var bus = new BusBooking
            {
                BusNumber = "KA-02-5678",
                OperatorName = "SRS Travels",
                BusType = "AC Seater",
                GstCategory = "AC",
                FromCity = "Mumbai",
                ToCity = "Pune",
                BoardingPoint = "Borivali",
                DroppingPoint = "Swargate",
                DepartureTime = depTime,
                ArrivalTime = depTime.AddHours(4),
                PriceInr = 600,
                TotalSeats = 40,
                AvailableSeats = 40
            };
            db.BusBookings.Add(bus);
            await db.SaveChangesAsync();

            var dateStr = depTime.AddHours(5.5).ToString("dd-MM-yyyy");

            // Act
            var response = await client.GetAsync($"api/busbookings?fromCity=Mumbai&toCity=Pune&date={dateStr}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await response.Content.ReadFromJsonAsync<List<SearchBusResponseDto>>();
            list.Should().NotBeNull();
            list.Count.Should().BeGreaterThan(0);

            // Verify Log/Stat updated in DB
            using var verifyDb = GetDbContext();
            var stat = await verifyDb.BusRouteStats.FirstOrDefaultAsync(x => x.FromCity == "Mumbai" && x.ToCity == "Pune");
            stat.Should().NotBeNull();
            stat.SearchCount.Should().Be(1);
        }

        [Fact]
        public async Task SearchBuses_InvalidDate_Returns400()
        {
            var client = GetAnonymousClientWithGuestHeader();
            var response = await client.GetAsync("api/busbookings?date=2026-06-14");
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        #region GetHotRoutes Integration Tests

        [Fact]
        public async Task GetHotRoutes_HappyPath_ReturnsTopRoutes()
        {
            // Arrange
            var client = _factory.CreateClient();
            using var db = GetDbContext();
            db.BusRouteStats.Add(new BusRouteStat
            {
                FromCity = "Chennai",
                ToCity = "Bangalore",
                SearchCount = 50,
                BookingCount = 10
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/busbookings/hot-routes?metric=score");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await response.Content.ReadFromJsonAsync<List<object>>();
            list.Should().NotBeNull();
            list.Count.Should().BeGreaterThan(0);
        }

        #endregion

        #region GetBusSeatMap Integration Tests

        [Fact]
        public async Task GetBusSeatMap_HappyPath_ReturnsSeatLayout()
        {
            // Arrange
            var client = _factory.CreateClient();
            using var db = GetDbContext();
            var bus = new BusBooking
            {
                BusNumber = "KA-03-9999",
                OperatorName = "KSRTC",
                BusType = "AC Sleeper",
                FromCity = "Bangalore",
                ToCity = "Mangalore",
                BoardingPoint = "Majestic",
                DroppingPoint = "Mangaluru",
                PriceInr = 1000,
                TotalSeats = 10,
                AvailableSeats = 10
            };
            db.BusBookings.Add(bus);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/busbookings/{bus.Id}/seats");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var map = await response.Content.ReadFromJsonAsync<SeatMapResponseDto>();
            map.Should().NotBeNull();
            map.TotalSeats.Should().Be(10);
            map.Seats.Should().HaveCount(10);
        }

        #endregion

        #region GetPricingPreview Integration Tests

        [Fact]
        public async Task GetPricingPreview_HappyPath_ReturnsCalculations()
        {
            // Arrange
            var client = _factory.CreateClient();
            using var db = GetDbContext();
            var bus = new BusBooking
            {
                BusNumber = "KA-04-1111",
                OperatorName = "SRS",
                BusType = "AC Sleeper",
                FromCity = "Bangalore",
                ToCity = "Goa",
                BoardingPoint = "Majestic",
                DroppingPoint = "Panaji",
                PriceInr = 1000,
                TotalSeats = 4,
                AvailableSeats = 4
            };
            db.BusBookings.Add(bus);
            await db.SaveChangesAsync(); // Save bus first to generate ID

            db.BusSeats.Add(new BusSeat { BusBookingId = bus.Id, SeatCode = "L1", SeatType = "Sleeper", IsBooked = false });
            db.BusConvenienceFees.Add(new BusConvenienceFee { FeeInr = 50, Status = "Active" });
            db.BusGstSettings.Add(new BusGstSetting { GstCategory = "AC", GstPercent = 5, Status = "Active" });
            await db.SaveChangesAsync();

            var request = new BusPricingPreviewRequestDto
            {
                BusId = bus.Id,
                SeatCodes = new List<string> { "L1" }
            };

            // Act
            var response = await client.PostAsJsonAsync("api/busbookings/pricing-preview", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var pricing = await response.Content.ReadFromJsonAsync<BusPricingPreviewResponseDto>();
            pricing.Should().NotBeNull();
            pricing.GrandTotal.Should().Be(1100); // 1000 base + 50 gst (5% of 1000) + 50 convenience fee = 1100
        }

        #endregion

        #region GetPricingConfig Integration Tests

        [Fact]
        public async Task GetPricingConfig_HappyPath_ReturnsPricingDetails()
        {
            // Arrange
            var client = _factory.CreateClient();
            using var db = GetDbContext();
            db.BusMarkupSettings.Add(new BusMarkupSetting { SeatType = "Sleeper", Value = 100, MarkupType = "Fixed", Status = "Active" });
            db.BusGstSettings.Add(new BusGstSetting { GstCategory = "AC", GstPercent = 10, Status = "Active" });
            db.BusConvenienceFees.Add(new BusConvenienceFee { FeeInr = 50, Status = "Active" });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/busbookings/pricing-config?seatType=Sleeper&gstCategory=AC&baseFare=1000");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var pricing = await response.Content.ReadFromJsonAsync<PricingConfigResponse>();
            pricing.Should().NotBeNull();
            pricing.GrandTotal.Should().Be(1260); // base = 1000, markup = 100, selling = 1100, gst = 110 (10% of 1100), fee = 50. Total = 1260.
        }

        #endregion

        #region BookBus Integration Tests

        [Fact]
        public async Task BookBus_HappyPath_CreatesBookingAndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User, 101);
            using var db = GetDbContext();
            var bus = new BusBooking
            {
                BusNumber = "KA-05-3333",
                OperatorName = "SRS",
                BusType = "AC Sleeper",
                FromCity = "Bangalore",
                ToCity = "Goa",
                BoardingPoint = "Majestic",
                DroppingPoint = "Panaji",
                DepartureTime = DateTime.UtcNow.AddDays(1),
                ArrivalTime = DateTime.UtcNow.AddDays(1).AddHours(8),
                PriceInr = 1000,
                TotalSeats = 4,
                AvailableSeats = 4
            };
            db.BusBookings.Add(bus);
            await db.SaveChangesAsync(); // Save bus first to generate ID

            db.BusSeats.Add(new BusSeat { BusBookingId = bus.Id, SeatCode = "L1", SeatType = "Sleeper", IsBooked = false });
            db.BusConvenienceFees.Add(new BusConvenienceFee { FeeInr = 50, Status = "Active" });
            db.BusGstSettings.Add(new BusGstSetting { GstCategory = "AC", GstPercent = 5, Status = "Active" });
            await db.SaveChangesAsync();

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
            var response = await client.PostAsJsonAsync($"api/busbookings/{bus.Id}/book", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);

            // Verify in DB
            using var verifyDb = GetDbContext();
            var dbReservation = await verifyDb.BusReservations.FirstOrDefaultAsync(x => x.UserId == "101");
            dbReservation.Should().NotBeNull();
            dbReservation.TotalPriceInr.Should().Be(1100);
            dbReservation.Pnr.Should().NotBeNullOrEmpty();
            dbReservation.Pnr.Length.Should().Be(8);
            dbReservation.Pnr.Should().NotBe(dbReservation.BookingReference);

            // Verify response payload contains PNR
            var responseJson = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            responseJson.GetProperty("pnr").GetString().Should().Be(dbReservation.Pnr);
            responseJson.GetProperty("bookingReference").GetString().Should().Be(dbReservation.BookingReference);

            var dbSeat = await verifyDb.BusSeats.FirstOrDefaultAsync(x => x.BusBookingId == bus.Id && x.SeatCode == "L1");
            dbSeat.IsBooked.Should().BeTrue();
        }

        [Fact]
        public async Task BookBus_AdjacentSeatGenderMismatch_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User, 102);
            using var db = GetDbContext();
            var bus = new BusBooking
            {
                BusNumber = "KA-05-4444",
                OperatorName = "SRS",
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
            await db.SaveChangesAsync(); // Save bus first to generate ID

            db.BusSeats.AddRange(
                new BusSeat { BusBookingId = bus.Id, SeatCode = "L1", SeatType = "Sleeper", IsBooked = false },
                new BusSeat { BusBookingId = bus.Id, SeatCode = "L2", SeatType = "Sleeper", IsBooked = true },
                new BusSeat { BusBookingId = bus.Id, SeatCode = "L3", SeatType = "Sleeper", IsBooked = false },
                new BusSeat { BusBookingId = bus.Id, SeatCode = "U1", SeatType = "Sleeper", IsBooked = false },
                new BusSeat { BusBookingId = bus.Id, SeatCode = "U2", SeatType = "Sleeper", IsBooked = false },
                new BusSeat { BusBookingId = bus.Id, SeatCode = "U3", SeatType = "Sleeper", IsBooked = false }
            );

            // Seed a female on L2
            var existingReservation = new BusReservation
            {
                BookingReference = "BS-OLD-INT",
                UserId = "200",
                BusBookingId = bus.Id,
                PassengerName = "Jane Doe",
                PassengerPhone = "8888888888",
                Status = "Booked",
                TotalPriceInr = 1000
            };
            db.BusReservations.Add(existingReservation);
            db.BusReservationPassengers.Add(new BusReservationPassenger
            {
                BusReservation = existingReservation,
                FullName = "Jane Doe",
                Gender = "Female",
                SeatNumber = "L2",
                Age = 25
            });
            await db.SaveChangesAsync();

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
            var response = await client.PostAsJsonAsync($"api/busbookings/{bus.Id}/book", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("blocked. Adjacent seat");
        }

        #endregion

        #region GetBusBookings & Cancel Integration Tests

        [Fact]
        public async Task GetBusBookings_HappyPath_ReturnsUserBookings()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User, 201);
            using var db = GetDbContext();
            var bus = new BusBooking { BusNumber = "123", OperatorName = "Test", FromCity = "A", ToCity = "B", BoardingPoint = "A", DroppingPoint = "B" };
            db.BusBookings.Add(bus);
            await db.SaveChangesAsync();

            var reservation = new BusReservation
            {
                BookingReference = "BS-201",
                UserId = "201",
                BusBookingId = bus.Id,
                PassengerName = "Jane",
                PassengerPhone = "999",
                Status = "Booked"
            };
            db.BusReservations.Add(reservation);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/busbookings/bookings");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await response.Content.ReadFromJsonAsync<List<object>>();
            list.Should().NotBeEmpty();
        }

        [Fact]
        public async Task CancelBusBooking_HappyPath_CancelsBookingAndReleasesSeats()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User, 301);
            using var db = GetDbContext();
            var bus = new BusBooking
            {
                BusNumber = "123",
                OperatorName = "Test",
                FromCity = "A",
                ToCity = "B",
                BoardingPoint = "A",
                DroppingPoint = "B",
                DepartureTime = DateTime.UtcNow.AddHours(20),
                AvailableSeats = 29,
                TotalSeats = 30
            };
            db.BusBookings.Add(bus);
            await db.SaveChangesAsync(); // Save bus first to generate ID

            var seat = new BusSeat { BusBookingId = bus.Id, SeatCode = "L1", SeatType = "Sleeper", IsBooked = true };
            db.BusSeats.Add(seat);

            var reservation = new BusReservation
            {
                BookingReference = "BS-301",
                UserId = "301",
                BusBookingId = bus.Id,
                PassengerName = "John",
                PassengerPhone = "999",
                Status = "Booked",
                TotalPriceInr = 1000,
                SeatsBooked = 1
            };
            db.BusReservations.Add(reservation);

            db.BusReservationPassengers.Add(new BusReservationPassenger
            {
                BusReservation = reservation,
                FullName = "John",
                Gender = "Male",
                SeatNumber = "L1"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.PostAsync($"api/busbookings/bookings/{reservation.Id}/cancel?reason=User_requested", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify status and refund in DB
            using var verifyDb = GetDbContext();
            var dbRes = await verifyDb.BusReservations.FindAsync(reservation.Id);
            dbRes.Status.Should().Be("Cancelled");
            dbRes.RefundAmountInr.Should().Be(1000);

            var dbSeat = await verifyDb.BusSeats.FirstOrDefaultAsync(x => x.BusBookingId == bus.Id && x.SeatCode == "L1");
            dbSeat.IsBooked.Should().BeFalse();
        }

        #endregion

        #region First Time User Promotion Tests

        [Fact]
        public async Task BookBus_FirstTimeUserPromotion_Success_And_FailsWhenBookedPrior()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User, 501);
            using var db = GetDbContext();
            
            // Create bus
            var bus = new BusBooking
            {
                BusNumber = "KA-05-501",
                OperatorName = "SRS",
                BusType = "AC Sleeper",
                FromCity = "Bangalore",
                ToCity = "Goa",
                DepartureTime = DateTime.UtcNow.AddDays(1),
                ArrivalTime = DateTime.UtcNow.AddDays(1).AddHours(8),
                PriceInr = 1000,
                TotalSeats = 10,
                AvailableSeats = 10
            };
            db.BusBookings.Add(bus);
            await db.SaveChangesAsync();

            db.BusSeats.AddRange(
                new BusSeat { BusBookingId = bus.Id, SeatCode = "L1", SeatType = "Sleeper", IsBooked = false },
                new BusSeat { BusBookingId = bus.Id, SeatCode = "L2", SeatType = "Sleeper", IsBooked = false }
            );

            // Add FirstTime Promotion/Coupon
            var promo = new BusPromotion
            {
                Code = "FIRSTTIME",
                Title = "First Booking Discount",
                PromotionType = "Coupon",
                DiscountType = "Flat",
                DiscountValue = 100,
                IsActive = true,
                IsAutoApply = false,
                IsFirstTimeUserOnly = true
            };
            db.BusPromotions.Add(promo);

            db.BusConvenienceFees.Add(new BusConvenienceFee { FeeInr = 50, Status = "Active" });
            db.BusGstSettings.Add(new BusGstSetting { GstCategory = "AC", GstPercent = 0, Status = "Active" });
            await db.SaveChangesAsync();

            var request = new CreateBusBookingRequestDto
            {
                PassengerName = "Alice",
                PassengerPhone = "8888888888",
                PassengerEmail = "alice@example.com",
                CouponCode = "FIRSTTIME",
                Passengers = new List<CreateBusPassengerDto>
                {
                    new CreateBusPassengerDto { FullName = "Alice", Gender = "Female", SeatNumber = "L1", Age = 25 }
                }
            };

            // Act 1: First booking should succeed
            var res1 = await client.PostAsJsonAsync($"api/busbookings/{bus.Id}/book", request);
            res1.StatusCode.Should().Be(HttpStatusCode.Created);

            // Verify promotion discount was applied
            using var verifyDb = GetDbContext();
            var dbRes1 = await verifyDb.BusReservations.FirstOrDefaultAsync(x => x.UserId == "501" && x.Status == "Booked");
            dbRes1.Should().NotBeNull();
            dbRes1.DiscountAmountInr.Should().Be(100);

            // Act 2: Second booking with same coupon and user should fail
            var request2 = new CreateBusBookingRequestDto
            {
                PassengerName = "Alice",
                PassengerPhone = "8888888888",
                PassengerEmail = "alice@example.com",
                CouponCode = "FIRSTTIME",
                Passengers = new List<CreateBusPassengerDto>
                {
                    new CreateBusPassengerDto { FullName = "Alice", Gender = "Female", SeatNumber = "L2", Age = 25 }
                }
            };
            var res2 = await client.PostAsJsonAsync($"api/busbookings/{bus.Id}/book", request2);
            res2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var errContent = await res2.Content.ReadAsStringAsync();
            errContent.Should().Contain("This promotion is only valid for your first booking.");
        }

        [Fact]
        public async Task BookBus_FirstTimeUserPromotion_FailsIfPhoneHasPriorBooking()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User, 503); // Different user ID
            using var db = GetDbContext();

            // Create user 502 with a prior booking using phone "9876543210"
            var bus = new BusBooking
            {
                BusNumber = "KA-05-502",
                OperatorName = "SRS",
                BusType = "AC Sleeper",
                FromCity = "Bangalore",
                ToCity = "Goa",
                DepartureTime = DateTime.UtcNow.AddDays(1),
                ArrivalTime = DateTime.UtcNow.AddDays(1).AddHours(8),
                PriceInr = 1000,
                TotalSeats = 10,
                AvailableSeats = 10
            };
            db.BusBookings.Add(bus);
            await db.SaveChangesAsync();

            db.BusSeats.AddRange(
                new BusSeat { BusBookingId = bus.Id, SeatCode = "L1", SeatType = "Sleeper", IsBooked = true },
                new BusSeat { BusBookingId = bus.Id, SeatCode = "L2", SeatType = "Sleeper", IsBooked = false }
            );

            // Prior booking for user 502 with phone 9876543210
            db.BusReservations.Add(new BusReservation
            {
                BookingReference = "BS-PRIOR",
                UserId = "502",
                BusBookingId = bus.Id,
                PassengerName = "Bob",
                PassengerPhone = "9876543210",
                Status = "Booked",
                TotalPriceInr = 1000,
                SeatsBooked = 1
            });

            // Add FirstTime Coupon
            db.BusPromotions.Add(new BusPromotion
            {
                Code = "FIRSTTIME",
                Title = "First Booking Discount",
                PromotionType = "Coupon",
                DiscountType = "Flat",
                DiscountValue = 100,
                IsActive = true,
                IsAutoApply = false,
                IsFirstTimeUserOnly = true
            });

            db.BusConvenienceFees.Add(new BusConvenienceFee { FeeInr = 50, Status = "Active" });
            db.BusGstSettings.Add(new BusGstSetting { GstCategory = "AC", GstPercent = 0, Status = "Active" });
            await db.SaveChangesAsync();

            var request = new CreateBusBookingRequestDto
            {
                PassengerName = "Charlie",
                PassengerPhone = "9876543210", // Phone number that already has booking history
                PassengerEmail = "charlie@example.com",
                CouponCode = "FIRSTTIME",
                Passengers = new List<CreateBusPassengerDto>
                {
                    new CreateBusPassengerDto { FullName = "Charlie", Gender = "Male", SeatNumber = "L2", Age = 28 }
                }
            };

            // Act: Try booking as user 503 but with Bob's phone number
            var response = await client.PostAsJsonAsync($"api/busbookings/{bus.Id}/book", request);
            
            // Assert: Should fail because of phone booking history
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var errContent = await response.Content.ReadAsStringAsync();
            errContent.Should().Contain("This promotion is only valid for your first booking.");
        }

        #endregion
    }
}
