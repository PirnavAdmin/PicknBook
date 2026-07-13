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
    public class AdminBusMarkupSettingsIntegrationTests : IClassFixture<WebApplicationFactory<AdminBusController>>
    {
        private readonly WebApplicationFactory<AdminBusController> _factory;

        public AdminBusMarkupSettingsIntegrationTests(WebApplicationFactory<AdminBusController> factory)
        {
            var dbName = "InMemoryDbForMarkupIntegration_" + Guid.NewGuid().ToString();
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
            var response = await client.GetAsync("api/admin/bus/markup-settings");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/bus/markup-settings");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetMarkupSettings_HappyPath_Returns200WithMarkupSettings()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusMarkupSettings.Add(new BusMarkupSetting
            {
                SeatType = "Sleeper",
                Value = 100,
                MarkupType = "Fixed",
                Status = "Active",
                EntryDateUtc = DateTime.UtcNow,
                UpdateDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/bus/markup-settings");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await response.Content.ReadFromJsonAsync<List<BusMarkupSetting>>();
            list.Should().HaveCount(1);
            list[0].SeatType.Should().Be("Sleeper");
        }

        [Fact]
        public async Task GetMarkupSettingById_ExistingId_Returns200WithMarkupSetting()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var setting = new BusMarkupSetting
            {
                Id = 20,
                SeatType = "Seater",
                Value = 15,
                MarkupType = "Percentage",
                Status = "Active"
            };
            db.BusMarkupSettings.Add(setting);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/bus/markup-settings/20");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var returnedSetting = await response.Content.ReadFromJsonAsync<BusMarkupSetting>();
            returnedSetting.Should().NotBeNull();
            returnedSetting.Id.Should().Be(20);
            returnedSetting.SeatType.Should().Be("Seater");
        }

        [Fact]
        public async Task GetMarkupSettingById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/bus/markup-settings/999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task CreateMarkupSetting_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusMarkupRequestDto
            {
                SeatType = "Sleeper",
                Value = 80,
                MarkupType = "Fixed",
                Status = "Active",
                UpdatedBy = "admin",
                Remark = "Initial config"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/bus/markup-settings", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var returnedSetting = await response.Content.ReadFromJsonAsync<BusMarkupSetting>();
            returnedSetting.Should().NotBeNull();
            returnedSetting.SeatType.Should().Be("Sleeper");
            returnedSetting.Value.Should().Be(80);

            // Verify in DB
            using var db = GetDbContext();
            var dbSetting = await db.BusMarkupSettings.FindAsync(returnedSetting.Id);
            dbSetting.Should().NotBeNull();
            dbSetting.Value.Should().Be(80);
        }

        [Fact]
        public async Task CreateMarkupSetting_NullRequiredField_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusMarkupRequestDto
            {
                SeatType = null, // will cause model binding / validation validation failure
                Value = 80,
                MarkupType = "Fixed",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/bus/markup-settings", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CreateMarkupSetting_ValueNegative_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusMarkupRequestDto
            {
                SeatType = "Sleeper",
                Value = -10, // Invalid negative value
                MarkupType = "Fixed",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/bus/markup-settings", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var errorMessage = await response.Content.ReadAsStringAsync();
            errorMessage.Should().Be("Value must be greater than 0.");
        }

        [Fact]
        public async Task UpdateMarkupSetting_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusMarkupSettings.Add(new BusMarkupSetting
            {
                Id = 30,
                SeatType = "Sleeper",
                Value = 10,
                MarkupType = "Percentage",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var request = new BusMarkupRequestDto
            {
                SeatType = "Sleeper",
                Value = 20,
                MarkupType = "Percentage",
                Status = "Inactive",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/markup-settings/30", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify in DB
            using var dbVerify = GetDbContext();
            var dbSetting = await dbVerify.BusMarkupSettings.FindAsync(30);
            dbSetting.Value.Should().Be(20);
            dbSetting.Status.Should().Be("Inactive");
        }

        [Fact]
        public async Task UpdateMarkupSetting_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusMarkupRequestDto
            {
                SeatType = "Sleeper",
                Value = 10,
                MarkupType = "Percentage",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/markup-settings/999", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task DeleteMarkupSetting_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusMarkupSettings.Add(new BusMarkupSetting
            {
                Id = 40,
                SeatType = "Sleeper",
                Value = 10,
                MarkupType = "Percentage",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync("api/admin/bus/markup-settings/40");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify removed from DB
            using var dbVerify = GetDbContext();
            var dbSetting = await dbVerify.BusMarkupSettings.FindAsync(40);
            dbSetting.Should().BeNull();
        }
    }
}
