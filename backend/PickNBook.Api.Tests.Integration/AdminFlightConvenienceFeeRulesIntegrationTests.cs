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
    public class AdminFlightConvenienceFeeRulesIntegrationTests : IClassFixture<WebApplicationFactory<AdminFlightConvenienceFeeRulesController>>
    {
        private readonly WebApplicationFactory<AdminFlightConvenienceFeeRulesController> _factory;

        public AdminFlightConvenienceFeeRulesIntegrationTests(WebApplicationFactory<AdminFlightConvenienceFeeRulesController> factory)
        {
            var dbName = "InMemoryDbForFlightConvenienceFeeRulesIntegration_" + Guid.NewGuid().ToString();
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
            var response = await client.GetAsync("api/admin/flight-convenience-fee-rules");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/flight-convenience-fee-rules");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Endpoints_AllowedForSuperAdminRole()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.SuperAdmin);

            // Act
            var response = await client.GetAsync("api/admin/flight-convenience-fee-rules");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        #endregion

        #region GetAll Integration Tests

        [Fact]
        public async Task GetAll_HappyPath_Returns200WithRulesOrderedByTripType()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.FlightConvenienceFeeRules.AddRange(
                new FlightConvenienceFeeRule
                {
                    TripType = TripType.RoundTrip, FeeType = "Flat", FeeValue = 200, IsActive = true
                },
                new FlightConvenienceFeeRule
                {
                    TripType = TripType.OneWay, FeeType = "Percentage", FeeValue = 3, IsActive = true
                }
            );
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight-convenience-fee-rules");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<FlightConvenienceFeeRuleResponseDto>>();
            results.Should().NotBeNull();
            results.Should().HaveCount(2);
            results[0].TripType.Should().Be("OneWay"); // ordered by TripType ascending
            results[1].TripType.Should().Be("RoundTrip");
        }

        [Fact]
        public async Task GetAll_EmptyDatabase_Returns200WithEmptyArray()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight-convenience-fee-rules");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<FlightConvenienceFeeRuleResponseDto>>();
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
            var rule = new FlightConvenienceFeeRule
            {
                TripType = TripType.OneWay, FeeType = "Flat", FeeValue = 150, IsActive = true
            };
            db.FlightConvenienceFeeRules.Add(rule);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/admin/flight-convenience-fee-rules/{rule.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<FlightConvenienceFeeRuleResponseDto>();
            result.Should().NotBeNull();
            result.Id.Should().Be(rule.Id);
            result.TripType.Should().Be("OneWay");
            result.FeeType.Should().Be("Flat");
            result.FeeValue.Should().Be(150);
            result.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task GetById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight-convenience-fee-rules/9999");

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
            var request = new CreateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay,
                FeeType = "  Flat  ",
                FeeValue = 180,
                IsActive = true
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight-convenience-fee-rules", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var result = await response.Content.ReadFromJsonAsync<FlightConvenienceFeeRuleResponseDto>();
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);
            result.TripType.Should().Be("OneWay");
            result.FeeType.Should().Be("Flat");
            result.FeeValue.Should().Be(180);
            result.IsActive.Should().BeTrue();

            // Verify db state
            using var dbVerify = GetDbContext();
            var dbRule = await dbVerify.FlightConvenienceFeeRules.FindAsync(result.Id);
            dbRule.Should().NotBeNull();
            dbRule.FeeType.Should().Be("Flat");
            dbRule.FeeValue.Should().Be(180);
        }

        [Fact]
        public async Task Create_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PostAsJsonAsync<CreateFlightConvenienceFeeRuleDto>("api/admin/flight-convenience-fee-rules", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("validation errors occurred");
        }

        [Fact]
        public async Task Create_InvalidFeeType_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new CreateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay,
                FeeType = "InvalidType",
                FeeValue = 100,
                IsActive = true
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight-convenience-fee-rules", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("FeeType must be one of");
        }

        [Fact]
        public async Task Create_NullFeeType_Returns400BadRequest()
        {
            // Arrange — ASP.NET Core model validator rejects null for non-nullable FeeType
            var client = GetAuthenticatedClient();
            var request = new CreateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay,
                FeeType = null,
                FeeValue = 100,
                IsActive = true
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight-convenience-fee-rules", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        #region Update Integration Tests

        [Fact]
        public async Task Update_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var rule = new FlightConvenienceFeeRule
            {
                TripType = TripType.OneWay, FeeType = "Flat", FeeValue = 100, IsActive = true
            };
            db.FlightConvenienceFeeRules.Add(rule);
            await db.SaveChangesAsync();

            var request = new UpdateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.RoundTrip,
                FeeType = "Percentage",
                FeeValue = 4.25m,
                IsActive = false
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight-convenience-fee-rules/{rule.Id}", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<FlightConvenienceFeeRuleResponseDto>();
            result.Should().NotBeNull();
            result.TripType.Should().Be("RoundTrip");
            result.FeeType.Should().Be("Percentage");
            result.FeeValue.Should().Be(4.25m);
            result.IsActive.Should().BeFalse();

            // Verify db state
            using var dbVerify = GetDbContext();
            var dbRule = await dbVerify.FlightConvenienceFeeRules.FindAsync(rule.Id);
            dbRule.TripType.Should().Be(TripType.RoundTrip);
            dbRule.FeeType.Should().Be("Percentage");
            dbRule.FeeValue.Should().Be(4.25m);
            dbRule.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task Update_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new UpdateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay, FeeType = "Flat", FeeValue = 100, IsActive = true
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/flight-convenience-fee-rules/9999", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Update_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PutAsJsonAsync<UpdateFlightConvenienceFeeRuleDto>("api/admin/flight-convenience-fee-rules/1", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("validation errors occurred");
        }

        [Fact]
        public async Task Update_InvalidFeeType_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new UpdateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay,
                FeeType = "InvalidType",
                FeeValue = 100,
                IsActive = true
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/flight-convenience-fee-rules/1", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        #region Delete Integration Tests

        [Fact]
        public async Task Delete_ExistingId_Returns200AndRemoves()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var rule = new FlightConvenienceFeeRule
            {
                TripType = TripType.OneWay, FeeType = "Flat", FeeValue = 100, IsActive = true
            };
            db.FlightConvenienceFeeRules.Add(rule);
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync($"api/admin/flight-convenience-fee-rules/{rule.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("deleted successfully");

            // Verify db state
            using var dbVerify = GetDbContext();
            var dbRule = await dbVerify.FlightConvenienceFeeRules.FindAsync(rule.Id);
            dbRule.Should().BeNull();
        }

        [Fact]
        public async Task Delete_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.DeleteAsync("api/admin/flight-convenience-fee-rules/9999");

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
            var createRequest = new CreateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.RoundTrip,
                FeeType = "Flat",
                FeeValue = 250,
                IsActive = true
            };
            var createResponse = await client.PostAsJsonAsync("api/admin/flight-convenience-fee-rules", createRequest);
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var createdDto = await createResponse.Content.ReadFromJsonAsync<FlightConvenienceFeeRuleResponseDto>();
            createdDto.Should().NotBeNull();
            var id = createdDto.Id;

            // 2. Read
            var getResponse = await client.GetAsync($"api/admin/flight-convenience-fee-rules/{id}");
            getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var fetchedDto = await getResponse.Content.ReadFromJsonAsync<FlightConvenienceFeeRuleResponseDto>();
            fetchedDto.TripType.Should().Be("RoundTrip");
            fetchedDto.FeeValue.Should().Be(250);

            // 3. Update
            var updateRequest = new UpdateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.RoundTrip,
                FeeType = "Percentage",
                FeeValue = 7.5m,
                IsActive = true
            };
            var updateResponse = await client.PutAsJsonAsync($"api/admin/flight-convenience-fee-rules/{id}", updateRequest);
            updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 4. Verify Update
            var getUpdatedResponse = await client.GetAsync($"api/admin/flight-convenience-fee-rules/{id}");
            getUpdatedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var updatedDto = await getUpdatedResponse.Content.ReadFromJsonAsync<FlightConvenienceFeeRuleResponseDto>();
            updatedDto.FeeType.Should().Be("Percentage");
            updatedDto.FeeValue.Should().Be(7.5m);

            // 5. Delete
            var deleteResponse = await client.DeleteAsync($"api/admin/flight-convenience-fee-rules/{id}");
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 6. Verify Delete
            var getDeletedResponse = await client.GetAsync($"api/admin/flight-convenience-fee-rules/{id}");
            getDeletedResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion
    }
}
