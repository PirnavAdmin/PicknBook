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
using FluentAssertions;
using Xunit;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;

namespace PickNBook.Api.Tests.Integration
{
    public class AdminFlightMarkupIntegrationTests : IClassFixture<WebApplicationFactory<AdminFlightMarkupController>>
    {
        private readonly WebApplicationFactory<AdminFlightMarkupController> _factory;

        public AdminFlightMarkupIntegrationTests(WebApplicationFactory<AdminFlightMarkupController> factory)
        {
            var dbName = "InMemoryDbForFlightMarkupIntegration_" + Guid.NewGuid().ToString();
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
            var response = await client.GetAsync("api/admin/flight-markups");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/flight-markups");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Endpoints_AllowedForSuperAdminRole()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.SuperAdmin);

            // Act
            var response = await client.GetAsync("api/admin/flight-markups");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        #endregion

        #region GetAll Integration Tests

        [Fact]
        public async Task GetAll_HappyPath_Returns200WithRulesOrderedByPriorityDesc()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var now = DateTime.UtcNow;
            db.FlightMarkupRules.AddRange(
                new FlightMarkupRule
                {
                    AirlineCode = "AI", TripType = TripType.OneWay,
                    MarkupType = FlightMarkupType.Flat, MarkupValue = 100,
                    Priority = 5, IsActive = true, CreatedAtUtc = now, UpdatedAtUtc = now
                },
                new FlightMarkupRule
                {
                    AirlineCode = "6E", TripType = TripType.RoundTrip,
                    MarkupType = FlightMarkupType.Percentage, MarkupValue = 5,
                    Priority = 20, IsActive = true, CreatedAtUtc = now, UpdatedAtUtc = now
                }
            );
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight-markups");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<FlightMarkupRuleResponseDto>>();
            results.Should().NotBeNull();
            results.Should().HaveCount(2);
            results[0].Priority.Should().Be(20); // Sorted descending by priority
            results[0].AirlineCode.Should().Be("6E");
            results[0].TripType.Should().Be("RoundTrip");
            results[0].MarkupType.Should().Be("Percentage");

            results[1].Priority.Should().Be(5);
            results[1].AirlineCode.Should().Be("AI");
            results[1].TripType.Should().Be("OneWay");
            results[1].MarkupType.Should().Be("Flat");
        }

        [Fact]
        public async Task GetAll_EmptyDatabase_Returns200WithEmptyArray()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight-markups");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<FlightMarkupRuleResponseDto>>();
            results.Should().BeEmpty();
        }

        #endregion

        #region GetById Integration Tests

        [Fact]
        public async Task GetById_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var rule = new FlightMarkupRule
            {
                AirlineCode = "UK", TripType = TripType.RoundTrip,
                MarkupType = FlightMarkupType.Percentage, MarkupValue = 4.5m,
                Priority = 10, IsActive = true, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow
            };
            db.FlightMarkupRules.Add(rule);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/admin/flight-markups/{rule.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<FlightMarkupRuleResponseDto>();
            result.Should().NotBeNull();
            result.Id.Should().Be(rule.Id);
            result.AirlineCode.Should().Be("UK");
            result.TripType.Should().Be("RoundTrip");
            result.MarkupType.Should().Be("Percentage");
            result.MarkupValue.Should().Be(4.5m);
            result.Priority.Should().Be(10);
            result.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task GetById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight-markups/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        #region Create Integration Tests

        [Fact]
        public async Task Create_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "  ai  ",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 120,
                Priority = 1,
                IsActive = true
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight-markups", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var result = await response.Content.ReadFromJsonAsync<FlightMarkupRuleResponseDto>();
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);
            result.AirlineCode.Should().Be("AI"); // Trimmed and upper-cased
            result.TripType.Should().Be("OneWay");
            result.MarkupType.Should().Be("Flat");
            result.MarkupValue.Should().Be(120);
            result.Priority.Should().Be(1);
            result.IsActive.Should().BeTrue();

            // Verify db state
            using var dbVerify = GetDbContext();
            var dbRule = await dbVerify.FlightMarkupRules.FindAsync(result.Id);
            dbRule.Should().NotBeNull();
            dbRule.AirlineCode.Should().Be("AI");
            dbRule.MarkupValue.Should().Be(120);
        }

        [Fact]
        public async Task Create_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PostAsJsonAsync<CreateFlightMarkupRuleDto>("api/admin/flight-markups", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("validation errors occurred");
        }

        #endregion

        #region Update Integration Tests

        [Fact]
        public async Task Update_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var originalCreated = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var rule = new FlightMarkupRule
            {
                AirlineCode = "AI", TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat, MarkupValue = 100,
                Priority = 1, IsActive = true, CreatedAtUtc = originalCreated, UpdatedAtUtc = originalCreated
            };
            db.FlightMarkupRules.Add(rule);
            await db.SaveChangesAsync();

            var request = new UpdateFlightMarkupRuleDto
            {
                AirlineCode = "  sg  ",
                TripType = TripType.RoundTrip,
                MarkupType = FlightMarkupType.Percentage,
                MarkupValue = 8.5m,
                Priority = 5,
                IsActive = false
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight-markups/{rule.Id}", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<FlightMarkupRuleResponseDto>();
            result.Should().NotBeNull();
            result.AirlineCode.Should().Be("SG");
            result.TripType.Should().Be("RoundTrip");
            result.MarkupType.Should().Be("Percentage");
            result.MarkupValue.Should().Be(8.5m);
            result.Priority.Should().Be(5);
            result.IsActive.Should().BeFalse();
            result.CreatedAtUtc.Should().Be(originalCreated);
            result.UpdatedAtUtc.Should().BeAfter(originalCreated);

            // Verify db state
            using var dbVerify = GetDbContext();
            var dbRule = await dbVerify.FlightMarkupRules.FindAsync(rule.Id);
            dbRule.AirlineCode.Should().Be("SG");
            dbRule.MarkupValue.Should().Be(8.5m);
            dbRule.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task Update_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new UpdateFlightMarkupRuleDto
            {
                AirlineCode = "AI", TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat, MarkupValue = 100,
                Priority = 1, IsActive = true
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/flight-markups/9999", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Update_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PutAsJsonAsync<UpdateFlightMarkupRuleDto>("api/admin/flight-markups/1", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("validation errors occurred");
        }

        #endregion

        #region Delete Integration Tests

        [Fact]
        public async Task Delete_ExistingId_Returns200AndRemoves()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var rule = new FlightMarkupRule
            {
                AirlineCode = "AI", TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat, MarkupValue = 100,
                Priority = 1, IsActive = true, CreatedAtUtc = DateTime.UtcNow, UpdatedAtUtc = DateTime.UtcNow
            };
            db.FlightMarkupRules.Add(rule);
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync($"api/admin/flight-markups/{rule.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("deleted successfully");

            // Verify db state
            using var dbVerify = GetDbContext();
            var dbRule = await dbVerify.FlightMarkupRules.FindAsync(rule.Id);
            dbRule.Should().BeNull();
        }

        [Fact]
        public async Task Delete_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.DeleteAsync("api/admin/flight-markups/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        #region Full E2E Workflow Tests

        [Fact]
        public async Task FullWorkflow_CreateReadUpdateDelete_WorksEndToEnd()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // 1. Create
            var createRequest = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "EK",
                TripType = TripType.RoundTrip,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 250,
                Priority = 50,
                IsActive = true
            };
            var createResponse = await client.PostAsJsonAsync("api/admin/flight-markups", createRequest);
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var createdDto = await createResponse.Content.ReadFromJsonAsync<FlightMarkupRuleResponseDto>();
            createdDto.Should().NotBeNull();
            var id = createdDto.Id;

            // 2. Read
            var getResponse = await client.GetAsync($"api/admin/flight-markups/{id}");
            getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var fetchedDto = await getResponse.Content.ReadFromJsonAsync<FlightMarkupRuleResponseDto>();
            fetchedDto.AirlineCode.Should().Be("EK");
            fetchedDto.TripType.Should().Be("RoundTrip");
            fetchedDto.MarkupValue.Should().Be(250);

            // 3. Update
            var updateRequest = new UpdateFlightMarkupRuleDto
            {
                AirlineCode = "  ek  ",
                TripType = TripType.RoundTrip,
                MarkupType = FlightMarkupType.Percentage,
                MarkupValue = 10,
                Priority = 60,
                IsActive = true
            };
            var updateResponse = await client.PutAsJsonAsync($"api/admin/flight-markups/{id}", updateRequest);
            updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 4. Verify Update
            var getUpdatedResponse = await client.GetAsync($"api/admin/flight-markups/{id}");
            getUpdatedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var updatedDto = await getUpdatedResponse.Content.ReadFromJsonAsync<FlightMarkupRuleResponseDto>();
            updatedDto.MarkupType.Should().Be("Percentage");
            updatedDto.MarkupValue.Should().Be(10);
            updatedDto.Priority.Should().Be(60);

            // 5. Delete
            var deleteResponse = await client.DeleteAsync($"api/admin/flight-markups/{id}");
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 6. Verify Delete
            var getDeletedResponse = await client.GetAsync($"api/admin/flight-markups/{id}");
            getDeletedResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion
    }
}
