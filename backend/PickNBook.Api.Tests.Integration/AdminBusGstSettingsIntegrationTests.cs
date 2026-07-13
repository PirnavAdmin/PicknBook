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
    public class AdminBusGstSettingsIntegrationTests : IClassFixture<WebApplicationFactory<AdminBusController>>
    {
        private readonly WebApplicationFactory<AdminBusController> _factory;

        public AdminBusGstSettingsIntegrationTests(WebApplicationFactory<AdminBusController> factory)
        {
            var dbName = "InMemoryDbForGstIntegration_" + Guid.NewGuid().ToString();
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
            var response = await client.GetAsync("api/admin/bus/gst-settings");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/bus/gst-settings");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetGstSettings_HappyPath_Returns200WithGstSettings()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusGstSettings.Add(new BusGstSetting
            {
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active",
                EntryDateUtc = DateTime.UtcNow,
                UpdateDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/bus/gst-settings");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await response.Content.ReadFromJsonAsync<List<BusGstSetting>>();
            list.Should().HaveCount(1);
            list[0].GstCategory.Should().Be("Standard");
        }

        [Fact]
        public async Task GetGstSettingById_ExistingId_Returns200WithGstSetting()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var setting = new BusGstSetting
            {
                Id = 10,
                GstCategory = "Luxury",
                GstPercent = 28,
                Status = "Active"
            };
            db.BusGstSettings.Add(setting);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/bus/gst-settings/10");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var returnedSetting = await response.Content.ReadFromJsonAsync<BusGstSetting>();
            returnedSetting.Should().NotBeNull();
            returnedSetting.Id.Should().Be(10);
            returnedSetting.GstCategory.Should().Be("Luxury");
        }

        [Fact]
        public async Task GetGstSettingById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/bus/gst-settings/999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task CreateGstSetting_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusGstRequestDto
            {
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active",
                UpdatedBy = "admin",
                Remark = "Initial config"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/bus/gst-settings", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var returnedSetting = await response.Content.ReadFromJsonAsync<BusGstSetting>();
            returnedSetting.Should().NotBeNull();
            returnedSetting.GstCategory.Should().Be("Standard");
            returnedSetting.GstPercent.Should().Be(18);

            // Verify in DB
            using var db = GetDbContext();
            var dbSetting = await db.BusGstSettings.FindAsync(returnedSetting.Id);
            dbSetting.Should().NotBeNull();
            dbSetting.GstPercent.Should().Be(18);
        }

        [Fact]
        public async Task CreateGstSetting_NullRequiredField_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusGstRequestDto
            {
                GstCategory = null,
                GstPercent = 18,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/bus/gst-settings", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("The GstCategory field is required.");
        }

        [Fact]
        public async Task CreateGstSetting_NegativeGstPercent_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusGstRequestDto
            {
                GstCategory = "Standard",
                GstPercent = -5,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/bus/gst-settings", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("GstPercent must be greater than 0.");
        }

        [Fact]
        public async Task UpdateGstSetting_NullRequiredField_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusGstSettings.Add(new BusGstSetting
            {
                Id = 31,
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var request = new BusGstRequestDto
            {
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active",
                UpdatedBy = null
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/gst-settings/31", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("The UpdatedBy field is required.");
        }



        [Fact]
        public async Task UpdateGstSetting_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusGstSettings.Add(new BusGstSetting
            {
                Id = 30,
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var request = new BusGstRequestDto
            {
                GstCategory = "Luxury",
                GstPercent = 28,
                Status = "Inactive",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/gst-settings/30", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify in DB
            using var dbVerify = GetDbContext();
            var dbSetting = await dbVerify.BusGstSettings.FindAsync(30);
            dbSetting.GstCategory.Should().Be("Luxury");
            dbSetting.GstPercent.Should().Be(28);
            dbSetting.Status.Should().Be("Inactive");
        }

        [Fact]
        public async Task UpdateGstSetting_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusGstRequestDto
            {
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/gst-settings/999", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task DeleteGstSetting_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusGstSettings.Add(new BusGstSetting
            {
                Id = 40,
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync("api/admin/bus/gst-settings/40");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify removed from DB
            using var dbVerify = GetDbContext();
            var dbSetting = await dbVerify.BusGstSettings.FindAsync(40);
            dbSetting.Should().BeNull();
        }
    }
}
