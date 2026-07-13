#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;
using Xunit;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;

namespace PickNBook.Api.Tests.Integration
{
    public class AdminFlightAmendmentsIntegrationTests : IClassFixture<WebApplicationFactory<AdminFlightController>>
    {
        private readonly WebApplicationFactory<AdminFlightController> _factory;

        public AdminFlightAmendmentsIntegrationTests(WebApplicationFactory<AdminFlightController> factory)
        {
            var dbName = "InMemoryDbForFlightAmendmentsIntegration_" + Guid.NewGuid().ToString();
            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
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

                    services.AddDbContext<AppDbContext>(options =>
                    {
                        options.UseInMemoryDatabase(dbName);
                    });
                });
            });
        }

        private HttpClient GetAuthenticatedClient(string role = AuthRoles.Admin)
        {
            var client = _factory.CreateClient();

            using var scope = _factory.Services.CreateScope();
            var jwtService = scope.ServiceProvider.GetRequiredService<IJwtService>();
            var token = jwtService.GenerateToken(new User
            {
                Id = 1,
                Email = "admin@picknbook.com",
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

        #region Authorization Tests

        [Fact]
        public async Task Endpoints_UnauthorizedWhenNoTokenProvided()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/amendments");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/flight/amendments");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Endpoints_AllowedForSuperAdminRole()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.SuperAdmin);

            // Act
            var response = await client.GetAsync("api/admin/flight/amendments");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        #endregion

        #region GetAmendments Integration Tests

        [Fact]
        public async Task GetAmendments_HappyPath_Returns200WithProjectedData()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var now = DateTime.UtcNow;

            var booking = new FlightBooking
            {
                FromCity = "BLR",
                ToCity = "DEL",
                Airline = "Indigo",
                FlightNumber = "6E-505",
                DepartureTime = now,
                ArrivalTime = now.AddHours(2)
            };
            db.FlightBookings.Add(booking);
            await db.SaveChangesAsync();

            var reservation = new FlightReservation
            {
                FlightBookingId = booking.Id,
                PassengerName = "John Doe",
                BookingReference = "PNR123",
                UserId = "user_1"
            };
            db.FlightReservations.Add(reservation);
            await db.SaveChangesAsync();

            var request = new FlightAmendmentRequest
            {
                FlightReservationId = reservation.Id,
                RequestDateUtc = now,
                AmendmentStatus = "Pending",
                SupplierRemark = "SupInfo",
                CustomerRemark = "CustInfo",
                AdminRemark = "AdminInfo"
            };
            db.FlightAmendmentRequests.Add(request);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight/amendments");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<System.Text.Json.JsonElement>>();
            results.Should().NotBeNull();
            results.Should().HaveCount(1);

            var first = results[0];
            first.GetProperty("id").GetInt32().Should().Be(request.Id);
            first.GetProperty("segment").GetString().Should().Be("BLR - DEL");
            first.GetProperty("customer").GetString().Should().Be("John Doe");
            first.GetProperty("status").GetString().Should().Be("Pending");
            first.GetProperty("remark").GetString().Should().Be("AdminInfo");
        }

        [Fact]
        public async Task GetAmendments_EmptyDatabase_Returns200WithEmptyArray()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/amendments");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<System.Text.Json.JsonElement>>();
            results.Should().BeEmpty();
        }

        [Fact]
        public async Task GetAmendments_InvalidLimit_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/amendments?limit=0");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("limit must be greater than 0.");
        }

        #endregion

        #region GetAmendmentById Integration Tests

        [Fact]
        public async Task GetAmendmentById_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var now = DateTime.UtcNow;

            var request = new FlightAmendmentRequest
            {
                FlightReservationId = 99, // InMemory DB doesn't strictly check FK constraints unless configured, but let's seed anyway or use raw value if not strictly validated by DB
                RequestDateUtc = now,
                AmendmentStatus = "Pending"
            };
            db.FlightAmendmentRequests.Add(request);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/admin/flight/amendments/{request.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<FlightAmendmentRequest>();
            result.Should().NotBeNull();
            result.Id.Should().Be(request.Id);
            result.AmendmentStatus.Should().Be("Pending");
        }

        [Fact]
        public async Task GetAmendmentById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/amendments/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Amendment not found.");
        }

        #endregion

        #region CreateAmendment Integration Tests

        [Fact]
        public async Task CreateAmendment_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var res = new FlightReservation { PassengerName = "Alice Doe" };
            db.FlightReservations.Add(res);
            await db.SaveChangesAsync();

            var request = new FlightAmendmentRequestDto
            {
                FlightReservationId = res.Id,
                AmendmentStatus = "Pending",
                SupplierRemark = "SupRemark",
                CustomerRemark = "CustRemark",
                AdminRemark = "AdminRemark"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/amendments", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var result = await response.Content.ReadFromJsonAsync<FlightAmendmentRequest>();
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);
            result.FlightReservationId.Should().Be(res.Id);
            result.AmendmentStatus.Should().Be("Pending");
            result.SupplierRemark.Should().Be("SupRemark");

            // Verify in db
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.FlightAmendmentRequests.FindAsync(result.Id);
            dbRow.Should().NotBeNull();
            dbRow.SupplierRemark.Should().Be("SupRemark");
        }

        [Fact]
        public async Task CreateAmendment_InvalidReservationId_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightAmendmentRequestDto
            {
                FlightReservationId = 9999, // non-existent
                AmendmentStatus = "Pending"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/amendments", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("FlightReservationId is invalid.");
        }

        [Fact]
        public async Task CreateAmendment_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PostAsJsonAsync<FlightAmendmentRequestDto>("api/admin/flight/amendments", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        #region UpdateAmendment Integration Tests

        [Fact]
        public async Task UpdateAmendment_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();

            var request = new FlightAmendmentRequest
            {
                FlightReservationId = 50,
                RequestDateUtc = DateTime.UtcNow,
                AmendmentStatus = "Pending",
                SupplierRemark = "OldSup"
            };
            db.FlightAmendmentRequests.Add(request);
            await db.SaveChangesAsync();

            var updateDto = new FlightAmendmentRequestDto
            {
                FlightReservationId = 50,
                AmendmentStatus = "Approved",
                SupplierRemark = "NewSup",
                CustomerRemark = "NewCust",
                AdminRemark = "NewAdmin"
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/amendments/{request.Id}", updateDto);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<FlightAmendmentRequest>();
            result.Should().NotBeNull();
            result.AmendmentStatus.Should().Be("Approved");
            result.SupplierRemark.Should().Be("NewSup");
            result.CustomerRemark.Should().Be("NewCust");
            result.AdminRemark.Should().Be("NewAdmin");

            // Verify db
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.FlightAmendmentRequests.FindAsync(request.Id);
            dbRow.AmendmentStatus.Should().Be("Approved");
            dbRow.SupplierRemark.Should().Be("NewSup");
        }

        [Fact]
        public async Task UpdateAmendment_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightAmendmentRequestDto { AmendmentStatus = "Approved" };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/flight/amendments/9999", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Amendment not found.");
        }

        [Fact]
        public async Task UpdateAmendment_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PutAsJsonAsync<FlightAmendmentRequestDto>("api/admin/flight/amendments/1", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        #region DeleteAmendment Integration Tests

        [Fact]
        public async Task DeleteAmendment_ExistingId_Returns200AndRemoves()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var request = new FlightAmendmentRequest { FlightReservationId = 50, AmendmentStatus = "Pending" };
            db.FlightAmendmentRequests.Add(request);
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync($"api/admin/flight/amendments/{request.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Amendment deleted.");

            // Verify db state
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.FlightAmendmentRequests.FindAsync(request.Id);
            dbRow.Should().BeNull();
        }

        [Fact]
        public async Task DeleteAmendment_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.DeleteAsync("api/admin/flight/amendments/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Amendment not found.");
        }

        #endregion

        #region Full E2E Workflow Tests

        [Fact]
        public async Task FullWorkflow_CreateReadUpdateDelete_WorksEndToEnd()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var res = new FlightReservation { PassengerName = "Workflow passenger" };
            db.FlightReservations.Add(res);
            await db.SaveChangesAsync();

            // 1. Create
            var createRequest = new FlightAmendmentRequestDto
            {
                FlightReservationId = res.Id,
                AmendmentStatus = "Pending",
                SupplierRemark = "WorkflowSup",
                CustomerRemark = "WorkflowCust",
                AdminRemark = "WorkflowAdmin"
            };
            var createResponse = await client.PostAsJsonAsync("api/admin/flight/amendments", createRequest);
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var created = await createResponse.Content.ReadFromJsonAsync<FlightAmendmentRequest>();
            created.Should().NotBeNull();
            var id = created.Id;

            // 2. Read
            var getResponse = await client.GetAsync($"api/admin/flight/amendments/{id}");
            getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var fetched = await getResponse.Content.ReadFromJsonAsync<FlightAmendmentRequest>();
            fetched.SupplierRemark.Should().Be("WorkflowSup");

            // 3. Update
            var updateRequest = new FlightAmendmentRequestDto
            {
                FlightReservationId = res.Id,
                AmendmentStatus = "Approved",
                SupplierRemark = "WorkflowSupUpdated",
                CustomerRemark = "WorkflowCustUpdated",
                AdminRemark = "WorkflowAdminUpdated"
            };
            var updateResponse = await client.PutAsJsonAsync($"api/admin/flight/amendments/{id}", updateRequest);
            updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 4. Verify Update
            var getUpdatedResponse = await client.GetAsync($"api/admin/flight/amendments/{id}");
            var updated = await getUpdatedResponse.Content.ReadFromJsonAsync<FlightAmendmentRequest>();
            updated.AmendmentStatus.Should().Be("Approved");
            updated.SupplierRemark.Should().Be("WorkflowSupUpdated");

            // 5. Delete
            var deleteResponse = await client.DeleteAsync($"api/admin/flight/amendments/{id}");
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 6. Verify Delete
            var getDeletedResponse = await client.GetAsync($"api/admin/flight/amendments/{id}");
            getDeletedResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion
    }
}
