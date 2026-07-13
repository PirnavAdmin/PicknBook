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
    public class HotelsControllerIntegrationTests
        : IClassFixture<WebApplicationFactory<HotelsController>>, IDisposable
    {
        private readonly WebApplicationFactory<HotelsController> _factory;
        private readonly Microsoft.Data.Sqlite.SqliteConnection _connection;
        private readonly Mock<IHotelService> _mockHotelService;

        public HotelsControllerIntegrationTests(WebApplicationFactory<HotelsController> factory)
        {
            _mockHotelService = new Mock<IHotelService>();

            // Setup sqlite connection
            _connection = new Microsoft.Data.Sqlite.SqliteConnection("DataSource=:memory:");
            _connection.Open();

            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Remove existing AppDbContext configuration
                    var optionsDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                    if (optionsDescriptor != null) services.Remove(optionsDescriptor);

                    var dbContextDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(AppDbContext));
                    if (dbContextDescriptor != null) services.Remove(dbContextDescriptor);

                    // Add AppDbContext using SQLite
                    services.AddDbContext<AppDbContext>(options =>
                    {
                        options.UseSqlite(_connection);
                    });

                    // Replace IHotelService with mock
                    var amadeusDesc = services.SingleOrDefault(
                        d => d.ServiceType == typeof(IHotelService));
                    if (amadeusDesc != null) services.Remove(amadeusDesc);
                    services.AddSingleton<IHotelService>(_mockHotelService.Object);
                });
            });

            // Initialize DB
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
        }

        public void Dispose()
        {
            _connection?.Close();
            _connection?.Dispose();
        }

        // Helper to get authenticated client
        private HttpClient GetAuthenticatedClient(string role = AuthRoles.User, int userId = 1)
        {
            var client = _factory.CreateClient();
            using var scope = _factory.Services.CreateScope();
            var jwtService = scope.ServiceProvider.GetRequiredService<IJwtService>();
            var token = jwtService.GenerateToken(new User
            {
                Id = userId,
                Email = $"user{userId}@picknbook.com",
                Role = role
            }, role);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        private AppDbContext GetDbContext()
        {
            var scope = _factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<AppDbContext>();
        }

        #region Search Integration Tests

        [Fact]
        public async Task Search_ValidRequest_ReturnsOkWithSearchResponse()
        {
            // Arrange
            var client = _factory.CreateClient();
            var checkIn = DateTime.UtcNow.Date.AddDays(1);
            var checkOut = checkIn.AddDays(2);

            var expectedResponse = new List<HotelSearchResponseDto>
            {
                new()
                {
                    HotelId = "H-NYC-101",
                    Name = "Manhattan Luxury Suites",
                    CityCode = "NYC",
                    Offers = new List<HotelOfferDto>
                    {
                        new() { OfferId = "O-101", HotelId = "H-NYC-101", Price = 300m }
                    }
                }
            };

            _mockHotelService.Setup(x => x.SearchHotelsAsync("NYC", checkIn, checkOut, 1, 1))
                .ReturnsAsync(expectedResponse);

            // Act
            var response = await client.GetAsync($"api/hotels/search?cityCode=NYC&checkInDate={checkIn:yyyy-MM-dd}&checkOutDate={checkOut:yyyy-MM-dd}&adults=1&rooms=1");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<List<HotelSearchResponseDto>>();
            result.Should().NotBeNull();
            result.Should().ContainSingle();
            result[0].HotelId.Should().Be("H-NYC-101");
            result[0].Offers.Should().ContainSingle();
            result[0].Offers[0].Price.Should().Be(300m);
        }

        [Fact]
        public async Task Search_MissingCityCode_ReturnsBadRequest()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync($"api/hotels/search?checkInDate=2026-07-01&checkOutDate=2026-07-03");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Search_InvalidDatesOrder_ReturnsBadRequest()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("api/hotels/search?cityCode=NYC&checkInDate=2026-07-03&checkOutDate=2026-07-01");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        #region GetOfferDetails Integration Tests

        [Fact]
        public async Task GetOfferDetails_ValidId_ReturnsOfferDetails()
        {
            // Arrange
            var client = _factory.CreateClient();
            var offer = new HotelOfferDto { OfferId = "O-999", HotelName = "Sunset Resort", Price = 250m };
            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O-999")).ReturnsAsync(offer);

            // Act
            var response = await client.GetAsync("api/hotels/offers/O-999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<HotelOfferDto>();
            result.Should().NotBeNull();
            result.OfferId.Should().Be("O-999");
            result.HotelName.Should().Be("Sunset Resort");
        }

        [Fact]
        public async Task GetOfferDetails_NonExistentOffer_ReturnsNotFound()
        {
            // Arrange
            var client = _factory.CreateClient();
            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O-UNKNOWN")).ReturnsAsync((HotelOfferDto)null);

            // Act
            var response = await client.GetAsync("api/hotels/offers/O-UNKNOWN");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        #region Book Integration Tests

        [Fact]
        public async Task Book_ValidRequest_CreatesBookingAndReturnsCreated()
        {
            // Arrange
            var client = GetAuthenticatedClient(userId: 42);

            var offer = new HotelOfferDto
            {
                OfferId = "O-111",
                HotelId = "H-111",
                HotelName = "Grand Central Inn",
                CityCode = "NYC",
                Price = 180m,
                Currency = "USD",
                CheckInDate = DateTime.UtcNow.AddDays(1).Date.ToString("yyyy-MM-dd"),
                CheckOutDate = DateTime.UtcNow.AddDays(4).Date.ToString("yyyy-MM-dd"),
                Beds = 2,
                RoomQuantity = 1
            };

            var bookingResponse = new HotelBookingResponseDto
            {
                ProviderBookingId = "AMAD-REF-8888"
            };

            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O-111")).ReturnsAsync(offer);
            _mockHotelService.Setup(x => x.BookHotelAsync("O-111", "Jane Doe", "jane@example.com", "9876543210", "42"))
                .ReturnsAsync(bookingResponse);

            var request = new HotelBookingRequestDto
            {
                OfferId = "O-111",
                GuestName = "Jane Doe",
                GuestEmail = "jane@example.com",
                GuestPhone = "9876543210"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/hotels/book", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var result = await response.Content.ReadFromJsonAsync<HotelBookingResponseDto>();
            result.Should().NotBeNull();
            result.ProviderBookingId.Should().Be("AMAD-REF-8888");
            result.Status.Should().Be("Confirmed");
            result.GuestName.Should().Be("Jane Doe");

            // Verify SQLite DB state
            using var db = GetDbContext();
            var reservation = await db.HotelReservations.FirstOrDefaultAsync(x => x.UserId == "42");
            reservation.Should().NotBeNull();
            reservation.Status.Should().Be("Confirmed");
            reservation.ProviderBookingId.Should().Be("AMAD-REF-8888");
            reservation.HotelName.Should().Be("Grand Central Inn");
        }

        [Fact]
        public async Task Book_NoToken_ReturnsUnauthorized()
        {
            // Arrange
            var client = _factory.CreateClient();
            var request = new HotelBookingRequestDto { OfferId = "O-111", GuestName = "Jane" };

            // Act
            var response = await client.PostAsJsonAsync("api/hotels/book", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Book_MissingRequiredRequestFields_ReturnsBadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new HotelBookingRequestDto
            {
                OfferId = "", // Missing
                GuestName = "Jane Doe",
                GuestEmail = "jane@example.com",
                GuestPhone = "12345"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/hotels/book", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Book_OfferDetailsNotFound_ReturnsNotFound()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O-EXPIRED")).ReturnsAsync((HotelOfferDto)null);

            var request = new HotelBookingRequestDto
            {
                OfferId = "O-EXPIRED",
                GuestName = "Jane Doe",
                GuestEmail = "jane@example.com",
                GuestPhone = "12345"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/hotels/book", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Book_AmadeusCallThrowsException_RollsBackLocalDbReservation()
        {
            // Arrange
            var client = GetAuthenticatedClient(userId: 55);

            var offer = new HotelOfferDto
            {
                OfferId = "O-222",
                HotelId = "H-222",
                HotelName = "Grand Plaza",
                Price = 120m,
                Currency = "USD"
            };

            _mockHotelService.Setup(x => x.GetOfferDetailsAsync("O-222")).ReturnsAsync(offer);
            _mockHotelService.Setup(x => x.BookHotelAsync("O-222", "Jane", "jane@example.com", "123", "55"))
                .ThrowsAsync(new Exception("Amadeus API connectivity failure"));

            var request = new HotelBookingRequestDto
            {
                OfferId = "O-222",
                GuestName = "Jane",
                GuestEmail = "jane@example.com",
                GuestPhone = "123"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/hotels/book", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

            // SQLite supports full transactions. Verify local DB was successfully rolled back and has no reservation.
            using var db = GetDbContext();
            var reservation = await db.HotelReservations.FirstOrDefaultAsync(x => x.UserId == "55");
            reservation.Should().BeNull();
        }

        #endregion

        #region MyBookings Integration Tests

        [Fact]
        public async Task MyBookings_ValidUser_ReturnsOnlyTheirBookings()
        {
            // Arrange
            using (var db = GetDbContext())
            {
                db.HotelReservations.Add(new HotelReservation
                {
                    UserId = "10",
                    HotelName = "Hotel Ten",
                    BookingReference = "HT-10",
                    GuestName = "User 10",
                    GuestEmail = "10@pick.com",
                    GuestPhone = "10",
                    Status = "Confirmed"
                });
                db.HotelReservations.Add(new HotelReservation
                {
                    UserId = "20", // Another user
                    HotelName = "Hotel Twenty",
                    BookingReference = "HT-20",
                    GuestName = "User 20",
                    GuestEmail = "20@pick.com",
                    GuestPhone = "20",
                    Status = "Confirmed"
                });
                await db.SaveChangesAsync();
            }

            var client = GetAuthenticatedClient(userId: 10);

            // Act
            var response = await client.GetAsync("api/hotels/my-bookings");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<List<HotelBookingHistoryDto>>();
            result.Should().NotBeNull();
            result.Should().ContainSingle();
            result[0].HotelName.Should().Be("Hotel Ten");
        }

        [Fact]
        public async Task MyBookings_NoToken_ReturnsUnauthorized()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("api/hotels/my-bookings");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        #endregion

        #region Cancel Integration Tests

        [Fact]
        public async Task Cancel_ValidRequest_CancelsBookingInDbAndRestoresStatus()
        {
            // Arrange
            int bookingId;
            using (var db = GetDbContext())
            {
                var res = new HotelReservation
                {
                    UserId = "100",
                    HotelName = "Ocean View Villa",
                    BookingReference = "HT-100",
                    ProviderBookingId = "PROV-88",
                    GuestName = "User 100",
                    GuestEmail = "100@pick.com",
                    GuestPhone = "100",
                    Status = "Confirmed"
                };
                db.HotelReservations.Add(res);
                await db.SaveChangesAsync();
                bookingId = res.Id;
            }

            _mockHotelService.Setup(x => x.CancelBookingAsync("PROV-88")).ReturnsAsync(true);
            var client = GetAuthenticatedClient(userId: 100);

            // Act
            var response = await client.PostAsync($"api/hotels/bookings/{bookingId}/cancel?reason=ChangedPlans", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<HotelCancellationDto>();
            result.Should().NotBeNull();
            result.Status.Should().Be("Cancelled");
            result.CancellationReason.Should().Be("ChangedPlans");
            result.Message.Should().Be("Booking successfully cancelled.");

            // Verify DB state
            using var dbVerify = GetDbContext();
            var updated = await dbVerify.HotelReservations.FindAsync(bookingId);
            updated.Status.Should().Be("Cancelled");
            updated.CancellationReason.Should().Be("ChangedPlans");
            updated.CancelledAt.Should().NotBeNull();
        }

        [Fact]
        public async Task Cancel_WrongUserCancels_ReturnsNotFound()
        {
            // Arrange
            int bookingId;
            using (var db = GetDbContext())
            {
                var res = new HotelReservation
                {
                    UserId = "100",
                    HotelName = "Ocean View Villa",
                    BookingReference = "HT-100",
                    ProviderBookingId = "PROV-88",
                    GuestName = "User 100",
                    GuestEmail = "100@pick.com",
                    GuestPhone = "100",
                    Status = "Confirmed"
                };
                db.HotelReservations.Add(res);
                await db.SaveChangesAsync();
                bookingId = res.Id;
            }

            // Client logged in as user 200, attempting to cancel user 100's booking
            var client = GetAuthenticatedClient(userId: 200);

            // Act
            var response = await client.PostAsync($"api/hotels/bookings/{bookingId}/cancel", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Cancel_AlreadyCancelled_ReturnsBadRequest()
        {
            // Arrange
            int bookingId;
            using (var db = GetDbContext())
            {
                var res = new HotelReservation
                {
                    UserId = "100",
                    HotelName = "Ocean View Villa",
                    BookingReference = "HT-100",
                    ProviderBookingId = "PROV-88",
                    GuestName = "User 100",
                    GuestEmail = "100@pick.com",
                    GuestPhone = "100",
                    Status = "Cancelled"
                };
                db.HotelReservations.Add(res);
                await db.SaveChangesAsync();
                bookingId = res.Id;
            }

            var client = GetAuthenticatedClient(userId: 100);

            // Act
            var response = await client.PostAsync($"api/hotels/bookings/{bookingId}/cancel", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Cancel_NoToken_ReturnsUnauthorized()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.PostAsync("api/hotels/bookings/1/cancel", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        #endregion
    }
}
