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
    public class AdminFlightAirlineWebcheckIntegrationTests : IClassFixture<WebApplicationFactory<AdminFlightController>>
    {
        private readonly WebApplicationFactory<AdminFlightController> _factory;

        public AdminFlightAirlineWebcheckIntegrationTests(WebApplicationFactory<AdminFlightController> factory)
        {
            var dbName = "InMemoryDbForFlightAirlineWebcheckIntegration_" + Guid.NewGuid().ToString();
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
            var response = await client.GetAsync("api/admin/flight/airline-webcheck");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/flight/airline-webcheck");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Endpoints_AllowedForSuperAdminRole()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.SuperAdmin);

            // Act
            var response = await client.GetAsync("api/admin/flight/airline-webcheck");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        #endregion

        #region GetAirlineWebcheckLinks Integration Tests

        [Fact]
        public async Task GetAirlineWebcheckLinks_HappyPath_Returns200WithSortedData()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.AirlineWebcheckLinks.AddRange(
                new AirlineWebcheckLink { Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" },
                new AirlineWebcheckLink { Airline = "AirIndia", AirlineCode = "AI", Url = "http://ai" }
            );
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight/airline-webcheck");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<AirlineWebcheckLink>>();
            results.Should().NotBeNull();
            results.Should().HaveCount(2);
            results[0].Airline.Should().Be("AirIndia"); // Sorted alphabetically
            results[1].Airline.Should().Be("Indigo");
        }

        [Fact]
        public async Task GetAirlineWebcheckLinks_EmptyDatabase_Returns200WithEmptyArray()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/airline-webcheck");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<AirlineWebcheckLink>>();
            results.Should().BeEmpty();
        }

        #endregion

        #region GetAirlineWebcheckLinkById Integration Tests

        [Fact]
        public async Task GetAirlineWebcheckLinkById_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var row = new AirlineWebcheckLink { Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" };
            db.AirlineWebcheckLinks.Add(row);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/admin/flight/airline-webcheck/{row.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<AirlineWebcheckLink>();
            result.Should().NotBeNull();
            result.Id.Should().Be(row.Id);
            result.Airline.Should().Be("Indigo");
        }

        [Fact]
        public async Task GetAirlineWebcheckLinkById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/airline-webcheck/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Webcheck link not found.");
        }

        #endregion

        #region CreateAirlineWebcheckLink Integration Tests

        [Fact]
        public async Task CreateAirlineWebcheckLink_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new AirlineWebcheckLinkRequestDto
            {
                Airline = "  AirIndia  ",
                AirlineCode = "  ai  ",
                Url = "  http://ai.com  "
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/airline-webcheck", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var result = await response.Content.ReadFromJsonAsync<AirlineWebcheckLink>();
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);
            result.Airline.Should().Be("AirIndia");
            result.AirlineCode.Should().Be("AI");
            result.Url.Should().Be("http://ai.com");

            // Verify db
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.AirlineWebcheckLinks.FindAsync(result.Id);
            dbRow.Should().NotBeNull();
            dbRow.Airline.Should().Be("AirIndia");
        }

        [Fact]
        public async Task CreateAirlineWebcheckLink_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PostAsJsonAsync<AirlineWebcheckLinkRequestDto>("api/admin/flight/airline-webcheck", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CreateAirlineWebcheckLink_ValidationErrors_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new AirlineWebcheckLinkRequestDto
            {
                Airline = "", // missing required field
                AirlineCode = "AI",
                Url = "http://ai.com"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/airline-webcheck", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Airline, AirlineCode and Url are required.");
        }

        #endregion

        #region UpdateAirlineWebcheckLink Integration Tests

        [Fact]
        public async Task UpdateAirlineWebcheckLink_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var row = new AirlineWebcheckLink { Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" };
            db.AirlineWebcheckLinks.Add(row);
            await db.SaveChangesAsync();

            var updateDto = new AirlineWebcheckLinkRequestDto
            {
                Airline = "  AirIndia  ",
                AirlineCode = "  ai  ",
                Url = "  http://ai.com  "
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/airline-webcheck/{row.Id}", updateDto);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<AirlineWebcheckLink>();
            result.Should().NotBeNull();
            result.Airline.Should().Be("AirIndia");
            result.AirlineCode.Should().Be("AI");
            result.Url.Should().Be("http://ai.com");

            // Verify db
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.AirlineWebcheckLinks.FindAsync(row.Id);
            dbRow.Airline.Should().Be("AirIndia");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var updateDto = new AirlineWebcheckLinkRequestDto { Airline = "AI", AirlineCode = "AI", Url = "http://ai.com" };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/flight/airline-webcheck/9999", updateDto);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Webcheck link not found.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PutAsJsonAsync<AirlineWebcheckLinkRequestDto>("api/admin/flight/airline-webcheck/1", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        #region DeleteAirlineWebcheckLink Integration Tests

        [Fact]
        public async Task DeleteAirlineWebcheckLink_ExistingId_Returns200AndRemoves()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var row = new AirlineWebcheckLink { Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" };
            db.AirlineWebcheckLinks.Add(row);
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync($"api/admin/flight/airline-webcheck/{row.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Webcheck link deleted.");

            // Verify db
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.AirlineWebcheckLinks.FindAsync(row.Id);
            dbRow.Should().BeNull();
        }

        [Fact]
        public async Task DeleteAirlineWebcheckLink_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.DeleteAsync("api/admin/flight/airline-webcheck/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Webcheck link not found.");
        }

        #endregion

        #region Full E2E Workflow Tests

        [Fact]
        public async Task FullWorkflow_CreateReadUpdateDelete_WorksEndToEnd()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // 1. Create
            var createRequest = new AirlineWebcheckLinkRequestDto
            {
                Airline = "AirIndia",
                AirlineCode = "AI",
                Url = "http://ai"
            };
            var createResponse = await client.PostAsJsonAsync("api/admin/flight/airline-webcheck", createRequest);
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var created = await createResponse.Content.ReadFromJsonAsync<AirlineWebcheckLink>();
            created.Should().NotBeNull();
            var id = created.Id;

            // 2. Read
            var getResponse = await client.GetAsync($"api/admin/flight/airline-webcheck/{id}");
            getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var fetched = await getResponse.Content.ReadFromJsonAsync<AirlineWebcheckLink>();
            fetched.Airline.Should().Be("AirIndia");

            // 3. Update
            var updateRequest = new AirlineWebcheckLinkRequestDto
            {
                Airline = "Indigo",
                AirlineCode = "6E",
                Url = "http://6e"
            };
            var updateResponse = await client.PutAsJsonAsync($"api/admin/flight/airline-webcheck/{id}", updateRequest);
            updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 4. Verify Update
            var getUpdatedResponse = await client.GetAsync($"api/admin/flight/airline-webcheck/{id}");
            var updated = await getUpdatedResponse.Content.ReadFromJsonAsync<AirlineWebcheckLink>();
            updated.Airline.Should().Be("Indigo");
            updated.AirlineCode.Should().Be("6E");

            // 5. Delete
            var deleteResponse = await client.DeleteAsync($"api/admin/flight/airline-webcheck/{id}");
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 6. Verify Delete
            var getDeletedResponse = await client.GetAsync($"api/admin/flight/airline-webcheck/{id}");
            getDeletedResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        #region Additional Validation Integration Tests

        [Fact]
        public async Task CreateAirlineWebcheckLink_DuplicateAirlineCode_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.AirlineWebcheckLinks.Add(new AirlineWebcheckLink { Airline = "Indigo", AirlineCode = "6E", Url = "http://6e.com" });
            await db.SaveChangesAsync();

            var request = new AirlineWebcheckLinkRequestDto { Airline = "Different", AirlineCode = "6e", Url = "http://diff.com" };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/airline-webcheck", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Webcheck link for airline code '6E' already exists.");
        }

        [Fact]
        public async Task CreateAirlineWebcheckLink_LengthAndUrlValidationErrors_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var tooLongAirlineRequest = new AirlineWebcheckLinkRequestDto { Airline = new string('A', 121), AirlineCode = "AI", Url = "http://ai.com" };
            var tooLongCodeRequest = new AirlineWebcheckLinkRequestDto { Airline = "AI", AirlineCode = new string('C', 11), Url = "http://ai.com" };
            var tooLongUrlRequest = new AirlineWebcheckLinkRequestDto { Airline = "AI", AirlineCode = "AI", Url = "http://ai.com/" + new string('x', 500) };
            var invalidUrlRequest = new AirlineWebcheckLinkRequestDto { Airline = "AI", AirlineCode = "AI", Url = "not-a-valid-url" };

            // Act
            var res1 = await client.PostAsJsonAsync("api/admin/flight/airline-webcheck", tooLongAirlineRequest);
            var res2 = await client.PostAsJsonAsync("api/admin/flight/airline-webcheck", tooLongCodeRequest);
            var res3 = await client.PostAsJsonAsync("api/admin/flight/airline-webcheck", tooLongUrlRequest);
            var res4 = await client.PostAsJsonAsync("api/admin/flight/airline-webcheck", invalidUrlRequest);

            // Assert
            res1.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res1.Content.ReadAsStringAsync()).Should().Be("Airline name cannot exceed 120 characters.");

            res2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res2.Content.ReadAsStringAsync()).Should().Be("AirlineCode cannot exceed 10 characters.");

            res3.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res3.Content.ReadAsStringAsync()).Should().Be("Url cannot exceed 500 characters.");

            res4.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res4.Content.ReadAsStringAsync()).Should().Be("Url must be a valid HTTP or HTTPS URL.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_DuplicateAirlineCode_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.AirlineWebcheckLinks.AddRange(
                new AirlineWebcheckLink { Airline = "Indigo", AirlineCode = "6E", Url = "http://6e.com" },
                new AirlineWebcheckLink { Airline = "AirIndia", AirlineCode = "AI", Url = "http://ai.com" }
            );
            await db.SaveChangesAsync();

            var request = new AirlineWebcheckLinkRequestDto { Airline = "Indigo Updated", AirlineCode = "AI", Url = "http://ai.com" };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/airline-webcheck/1", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Webcheck link for airline code 'AI' already exists.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_LengthAndUrlValidationErrors_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.AirlineWebcheckLinks.Add(new AirlineWebcheckLink { Airline = "Indigo", AirlineCode = "6E", Url = "http://6e.com" });
            await db.SaveChangesAsync();

            var tooLongAirlineRequest = new AirlineWebcheckLinkRequestDto { Airline = new string('A', 121), AirlineCode = "6E", Url = "http://6e.com" };
            var tooLongCodeRequest = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = new string('C', 11), Url = "http://6e.com" };
            var tooLongUrlRequest = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = "6E", Url = "http://6e.com/" + new string('x', 500) };
            var invalidUrlRequest = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = "6E", Url = "not-a-valid-url" };

            // Act
            var res1 = await client.PutAsJsonAsync("api/admin/flight/airline-webcheck/1", tooLongAirlineRequest);
            var res2 = await client.PutAsJsonAsync("api/admin/flight/airline-webcheck/1", tooLongCodeRequest);
            var res3 = await client.PutAsJsonAsync("api/admin/flight/airline-webcheck/1", tooLongUrlRequest);
            var res4 = await client.PutAsJsonAsync("api/admin/flight/airline-webcheck/1", invalidUrlRequest);

            // Assert
            res1.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res1.Content.ReadAsStringAsync()).Should().Be("Airline name cannot exceed 120 characters.");

            res2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res2.Content.ReadAsStringAsync()).Should().Be("AirlineCode cannot exceed 10 characters.");

            res3.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res3.Content.ReadAsStringAsync()).Should().Be("Url cannot exceed 500 characters.");

            res4.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res4.Content.ReadAsStringAsync()).Should().Be("Url must be a valid HTTP or HTTPS URL.");
        }

        #endregion
    }
}
