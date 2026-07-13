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
    public class AdminBusCouponsIntegrationTests : IClassFixture<WebApplicationFactory<AdminBusController>>
    {
        private readonly WebApplicationFactory<AdminBusController> _factory;

        public AdminBusCouponsIntegrationTests(WebApplicationFactory<AdminBusController> factory)
        {
            var dbName = "InMemoryDbForCouponsIntegration_" + Guid.NewGuid().ToString();
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
            var getResult = await client.GetAsync("api/admin/bus/coupons");

            // Assert
            getResult.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var getResult = await client.GetAsync("api/admin/bus/coupons");

            // Assert
            getResult.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetCoupons_HappyPath_Returns200WithCoupons()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusCoupons.Add(new BusCoupon
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "SAVE10",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/bus/coupons");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await response.Content.ReadFromJsonAsync<List<object>>();
            list.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetCouponById_ExistingId_Returns200WithCoupon()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var coupon = new BusCoupon
            {
                Id = 5,
                Value = 25,
                CouponType = "Percentage",
                CouponCode = "WELCOME25",
                Status = "Active"
            };
            db.BusCoupons.Add(coupon);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/bus/coupons/5");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var returnedCoupon = await response.Content.ReadFromJsonAsync<BusCoupon>();
            returnedCoupon.Should().NotBeNull();
            returnedCoupon.Id.Should().Be(5);
            returnedCoupon.CouponCode.Should().Be("WELCOME25");
        }

        [Fact]
        public async Task GetCouponById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/bus/coupons/999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task CreateCoupon_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusCouponRequestDto
            {
                Value = 15,
                CouponType = "Percentage",
                CouponCode = "HOLIDAY15",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
                UseLimit = 100,
                IsExclusive = true,
                Priority = 3,
                Status = "Active"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/bus/coupons", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var returnedCoupon = await response.Content.ReadFromJsonAsync<BusCoupon>();
            returnedCoupon.Should().NotBeNull();
            returnedCoupon.CouponCode.Should().Be("HOLIDAY15");

            // Verify in DB
            using var db = GetDbContext();
            var dbCoupon = await db.BusCoupons.FindAsync(returnedCoupon.Id);
            dbCoupon.Should().NotBeNull();
            dbCoupon.Value.Should().Be(15);
            dbCoupon.IsExclusive.Should().BeTrue();
            dbCoupon.Priority.Should().Be(3);
        }

        [Fact]
        public async Task CreateCoupon_ValidationFails_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusCouponRequestDto
            {
                Value = -5, // Invalid value
                CouponType = "Percentage",
                CouponCode = "BAD"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/bus/coupons", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UpdateCoupon_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusCoupons.Add(new BusCoupon
            {
                Id = 10,
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "SAVE10",
                IsExclusive = true,
                Priority = 2,
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var request = new BusCouponRequestDto
            {
                Value = 20,
                CouponType = "Fixed",
                CouponCode = "SAVE20",
                IsExclusive = false,
                Priority = 8,
                Status = "Inactive"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/coupons/10", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify in DB
            using var dbVerify = GetDbContext();
            var dbCoupon = await dbVerify.BusCoupons.FindAsync(10);
            dbCoupon.Value.Should().Be(20);
            dbCoupon.CouponCode.Should().Be("SAVE20");
            dbCoupon.IsExclusive.Should().BeFalse();
            dbCoupon.Priority.Should().Be(8);
            dbCoupon.Status.Should().Be("Inactive");
        }

        [Fact]
        public async Task UpdateCoupon_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "SAVE10"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/coupons/999", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task DeleteCoupon_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusCoupons.Add(new BusCoupon
            {
                Id = 15,
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "WELCOME15",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync("api/admin/bus/coupons/15");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify removed from DB
            using var dbVerify = GetDbContext();
            var dbCoupon = await dbVerify.BusCoupons.FindAsync(15);
            dbCoupon.Should().BeNull();
        }

        [Fact]
        public async Task GetUsedCoupons_HappyPath_Returns200WithUsages()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusCouponUsages.Add(new BusCouponUsage
            {
                CouponCode = "WELCOME10",
                UserId = "userA",
                UsedAtUtc = DateTime.UtcNow,
                BookingStatus = "Confirmed",
                CouponType = "Percentage",
                CouponValue = 10,
                CouponAmountInr = 10,
                TotalFareInr = 100
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/bus/coupons/used?couponCode=welcome10");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await response.Content.ReadFromJsonAsync<List<object>>();
            list.Should().HaveCount(1);
        }
    }
}
