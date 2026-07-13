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
    public class AdminFlightPendingAirlinesIntegrationTests : IClassFixture<WebApplicationFactory<AdminFlightController>>
    {
        private readonly WebApplicationFactory<AdminFlightController> _factory;

        public AdminFlightPendingAirlinesIntegrationTests(WebApplicationFactory<AdminFlightController> factory)
        {
            var dbName = "InMemoryDbForFlightPendingAirlinesIntegration_" + Guid.NewGuid().ToString();
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
            var response = await client.GetAsync("api/admin/flight/pending-airlines");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/flight/pending-airlines");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Endpoints_AllowedForSuperAdminRole()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.SuperAdmin);

            // Act
            var response = await client.GetAsync("api/admin/flight/pending-airlines");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        #endregion

        #region GetPendingAirlines Integration Tests

        [Fact]
        public async Task GetPendingAirlines_HappyPath_Returns200WithSortedData()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var now = DateTime.UtcNow;

            db.PendingAirlines.AddRange(
                new PendingAirline { AirlineCode = "6E", FareType = "Corporate", UpdatedOnUtc = now.AddMinutes(-5) },
                new PendingAirline { AirlineCode = "AI", FareType = "Refundable", UpdatedOnUtc = now }
            );
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight/pending-airlines");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<PendingAirline>>();
            results.Should().NotBeNull();
            results.Should().HaveCount(2);
            results[0].AirlineCode.Should().Be("AI"); // newer
            results[1].AirlineCode.Should().Be("6E");
        }

        [Fact]
        public async Task GetPendingAirlines_EmptyDatabase_Returns200WithEmptyArray()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/pending-airlines");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<PendingAirline>>();
            results.Should().BeEmpty();
        }

        #endregion

        #region GetPendingAirlineById Integration Tests

        [Fact]
        public async Task GetPendingAirlineById_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var row = new PendingAirline { AirlineCode = "6E", FareType = "Corporate", UpdatedOnUtc = DateTime.UtcNow };
            db.PendingAirlines.Add(row);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/admin/flight/pending-airlines/{row.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<PendingAirline>();
            result.Should().NotBeNull();
            result.Id.Should().Be(row.Id);
            result.AirlineCode.Should().Be("6E");
        }

        [Fact]
        public async Task GetPendingAirlineById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/pending-airlines/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Pending airline not found.");
        }

        #endregion

        #region CreatePendingAirline Integration Tests

        [Fact]
        public async Task CreatePendingAirline_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new PendingAirlineRequestDto
            {
                AirlineCode = "  ai  ",
                FareType = "  Corporate  ",
                UpdatedBy = "  integrator  ",
                Remark = "  Int test  "
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/pending-airlines", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var result = await response.Content.ReadFromJsonAsync<PendingAirline>();
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);
            result.AirlineCode.Should().Be("AI");
            result.FareType.Should().Be("Corporate");
            result.UpdatedBy.Should().Be("integrator");
            result.Remark.Should().Be("Int test");

            // Verify db
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.PendingAirlines.FindAsync(result.Id);
            dbRow.Should().NotBeNull();
            dbRow.AirlineCode.Should().Be("AI");
        }

        [Fact]
        public async Task CreatePendingAirline_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PostAsJsonAsync<PendingAirlineRequestDto>("api/admin/flight/pending-airlines", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CreatePendingAirline_ValidationErrors_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new PendingAirlineRequestDto
            {
                AirlineCode = "", // missing required field
                FareType = "Corporate"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/pending-airlines", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("AirlineCode and FareType are required.");
        }

        #endregion

        #region UpdatePendingAirline Integration Tests

        [Fact]
        public async Task UpdatePendingAirline_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var row = new PendingAirline { AirlineCode = "6E", FareType = "Corporate", UpdatedOnUtc = DateTime.UtcNow };
            db.PendingAirlines.Add(row);
            await db.SaveChangesAsync();

            var updateDto = new PendingAirlineRequestDto
            {
                AirlineCode = "  ai  ",
                FareType = "  Refundable  ",
                UpdatedBy = "  user_upd  ",
                Remark = "  new_rem  "
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/pending-airlines/{row.Id}", updateDto);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<PendingAirline>();
            result.Should().NotBeNull();
            result.AirlineCode.Should().Be("AI");
            result.FareType.Should().Be("Refundable");
            result.UpdatedBy.Should().Be("user_upd");
            result.Remark.Should().Be("new_rem");

            // Verify db
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.PendingAirlines.FindAsync(row.Id);
            dbRow.AirlineCode.Should().Be("AI");
        }

        [Fact]
        public async Task UpdatePendingAirline_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var updateDto = new PendingAirlineRequestDto { AirlineCode = "6E", FareType = "Corporate" };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/flight/pending-airlines/9999", updateDto);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Pending airline not found.");
        }

        [Fact]
        public async Task UpdatePendingAirline_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PutAsJsonAsync<PendingAirlineRequestDto>("api/admin/flight/pending-airlines/1", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        #region DeletePendingAirline Integration Tests

        [Fact]
        public async Task DeletePendingAirline_ExistingId_Returns200AndRemoves()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var row = new PendingAirline { AirlineCode = "6E", FareType = "Corporate", UpdatedOnUtc = DateTime.UtcNow };
            db.PendingAirlines.Add(row);
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync($"api/admin/flight/pending-airlines/{row.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Pending airline deleted.");

            // Verify db
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.PendingAirlines.FindAsync(row.Id);
            dbRow.Should().BeNull();
        }

        [Fact]
        public async Task DeletePendingAirline_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.DeleteAsync("api/admin/flight/pending-airlines/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Pending airline not found.");
        }

        #endregion

        #region Full E2E Workflow Tests

        [Fact]
        public async Task FullWorkflow_CreateReadUpdateDelete_WorksEndToEnd()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // 1. Create
            var createRequest = new PendingAirlineRequestDto
            {
                AirlineCode = "AI",
                FareType = "Corporate",
                UpdatedBy = "e2e_admin",
                Remark = "e2e remark"
            };
            var createResponse = await client.PostAsJsonAsync("api/admin/flight/pending-airlines", createRequest);
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var created = await createResponse.Content.ReadFromJsonAsync<PendingAirline>();
            created.Should().NotBeNull();
            var id = created.Id;

            // 2. Read
            var getResponse = await client.GetAsync($"api/admin/flight/pending-airlines/{id}");
            getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var fetched = await getResponse.Content.ReadFromJsonAsync<PendingAirline>();
            fetched.AirlineCode.Should().Be("AI");

            // 3. Update
            var updateRequest = new PendingAirlineRequestDto
            {
                AirlineCode = "6E",
                FareType = "Refundable",
                UpdatedBy = "e2e_admin_upd",
                Remark = "e2e remark upd"
            };
            var updateResponse = await client.PutAsJsonAsync($"api/admin/flight/pending-airlines/{id}", updateRequest);
            updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 4. Verify Update
            var getUpdatedResponse = await client.GetAsync($"api/admin/flight/pending-airlines/{id}");
            var updated = await getUpdatedResponse.Content.ReadFromJsonAsync<PendingAirline>();
            updated.AirlineCode.Should().Be("6E");
            updated.FareType.Should().Be("Refundable");

            // 5. Delete
            var deleteResponse = await client.DeleteAsync($"api/admin/flight/pending-airlines/{id}");
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 6. Verify Delete
            var getDeletedResponse = await client.GetAsync($"api/admin/flight/pending-airlines/{id}");
            getDeletedResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion
    }
}
