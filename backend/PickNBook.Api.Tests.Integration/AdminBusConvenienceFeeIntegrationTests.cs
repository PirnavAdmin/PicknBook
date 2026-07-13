#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
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
    public class AdminBusConvenienceFeeIntegrationTests : IClassFixture<WebApplicationFactory<AdminBusController>>
    {
        private readonly WebApplicationFactory<AdminBusController> _factory;

        public AdminBusConvenienceFeeIntegrationTests(WebApplicationFactory<AdminBusController> factory)
        {
            var dbName = "InMemoryDbForConvenienceFeeIntegration_" + Guid.NewGuid().ToString();
            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Remove existing AppDbContext options and descriptors
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

                    // Add AppDbContext using InMemory database
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

        [Fact]
        public async Task Endpoints_UnauthorizedWhenNoTokenProvided()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("api/admin/bus/convenience-fee");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/bus/convenience-fee");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetConvenienceFee_HappyPath_Returns200WithNoConfiguredFeeMessage()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/bus/convenience-fee");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("No convenience fee configured.");
        }

        [Fact]
        public async Task GetConvenienceFee_HappyPath_Returns200WithFee()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusConvenienceFees.Add(new BusConvenienceFee
            {
                FeeInr = 150,
                Status = "Active",
                UpdatedBy = "admin",
                EntryDateUtc = DateTime.UtcNow,
                UpdateDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/bus/convenience-fee");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var fee = await response.Content.ReadFromJsonAsync<BusConvenienceFee>();
            fee.Should().NotBeNull();
            fee.FeeInr.Should().Be(150);
        }

        [Fact]
        public async Task UpdateConvenienceFee_HappyPath_CreatesNewFeeAndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusConvenienceFeeRequestDto
            {
                FeeInr = 120,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/convenience-fee", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var returnedFee = await response.Content.ReadFromJsonAsync<BusConvenienceFee>();
            returnedFee.Should().NotBeNull();
            returnedFee.FeeInr.Should().Be(120);

            // Verify in DB
            using var db = GetDbContext();
            var dbFee = await db.BusConvenienceFees.FirstOrDefaultAsync();
            dbFee.Should().NotBeNull();
            dbFee.FeeInr.Should().Be(120);
        }

        [Fact]
        public async Task UpdateConvenienceFee_HappyPath_UpdatesExistingFeeAndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusConvenienceFees.Add(new BusConvenienceFee
            {
                Id = 1,
                FeeInr = 100,
                Status = "Active",
                UpdatedBy = "admin",
                EntryDateUtc = DateTime.UtcNow.AddMinutes(-10),
                UpdateDateUtc = DateTime.UtcNow.AddMinutes(-10)
            });
            await db.SaveChangesAsync();

            var request = new BusConvenienceFeeRequestDto
            {
                FeeInr = 250,
                Status = "Inactive",
                UpdatedBy = "new_admin"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/convenience-fee", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var returnedFee = await response.Content.ReadFromJsonAsync<BusConvenienceFee>();
            returnedFee.Id.Should().Be(1);
            returnedFee.FeeInr.Should().Be(250);
            returnedFee.Status.Should().Be("Inactive");
            returnedFee.UpdatedBy.Should().Be("new_admin");

            // Verify in DB
            using var dbVerify = GetDbContext();
            var dbFee = await dbVerify.BusConvenienceFees.FindAsync(1);
            dbFee.FeeInr.Should().Be(250);
        }

        [Fact]
        public async Task UpdateConvenienceFee_NegativeFee_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusConvenienceFeeRequestDto
            {
                FeeInr = -50,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/convenience-fee", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Fee must be greater than or equal to 0.");
        }

        [Fact]
        public async Task UpdateConvenienceFee_MalformedJson_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var payload = "{\"FeeInr\": \"not-a-number\", \"Status\": \"Active\", \"UpdatedBy\": \"admin\"}";
            var contentToSend = new StringContent(payload, Encoding.UTF8, "application/json");

            // Act
            var response = await client.PutAsync("api/admin/bus/convenience-fee", contentToSend);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UpdateConvenienceFee_NullRequest_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PutAsJsonAsync<BusConvenienceFeeRequestDto>("api/admin/bus/convenience-fee", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("A non-empty request body is required.");
        }

        [Fact]
        public async Task UpdateConvenienceFee_DuplicateRequests_MaintainsSingleRecord()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request1 = new BusConvenienceFeeRequestDto
            {
                FeeInr = 100,
                Status = "Active",
                UpdatedBy = "admin"
            };
            var request2 = new BusConvenienceFeeRequestDto
            {
                FeeInr = 200,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response1 = await client.PutAsJsonAsync("api/admin/bus/convenience-fee", request1);
            var response2 = await client.PutAsJsonAsync("api/admin/bus/convenience-fee", request2);

            // Assert
            response1.StatusCode.Should().Be(HttpStatusCode.OK);
            response2.StatusCode.Should().Be(HttpStatusCode.OK);

            using var db = GetDbContext();
            var count = await db.BusConvenienceFees.CountAsync();
            count.Should().Be(1);
            var currentFee = await db.BusConvenienceFees.FirstOrDefaultAsync();
            currentFee.FeeInr.Should().Be(200);
        }
    }
}
