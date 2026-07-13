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
    public class AdminFlightCouponIntegrationTests : IClassFixture<WebApplicationFactory<AdminFlightController>>
    {
        private readonly WebApplicationFactory<AdminFlightController> _factory;

        public AdminFlightCouponIntegrationTests(WebApplicationFactory<AdminFlightController> factory)
        {
            var dbName = "InMemoryDbForFlightCouponIntegration_" + Guid.NewGuid().ToString();
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
        public async Task CouponEndpoints_UnauthorizedWhenNoTokenProvided()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task CouponEndpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task CouponEndpoints_AllowedForSuperAdminRole()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.SuperAdmin);

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        #endregion

        #region GetCoupons Integration Tests

        [Fact]
        public async Task GetCoupons_HappyPath_Returns200WithCoupons()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.FlightCoupons.Add(new FlightCoupon
            {
                Value = 15, CouponType = "Percentage", CouponCode = "INTCOUP15",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 100, UsedCount = 0, Status = "Active", EntryDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("INTCOUP15");
        }

        [Fact]
        public async Task GetCoupons_EmptyDatabase_Returns200WithEmptyArray()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        #endregion

        #region GetCouponById Integration Tests

        [Fact]
        public async Task GetCouponById_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var coupon = new FlightCoupon
            {
                Value = 20, CouponType = "Fixed", CouponCode = "GETBYID",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50, UsedCount = 0, Status = "Active", EntryDateUtc = DateTime.UtcNow
            };
            db.FlightCoupons.Add(coupon);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/admin/flight/coupons/{coupon.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("GETBYID");
        }

        [Fact]
        public async Task GetCouponById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons/99999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        #region CreateCoupon Integration Tests

        [Fact]
        public async Task CreateCoupon_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "INTCREATE",
                StartDate = new DateOnly(2026, 6, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 100,
                Status = "Active",
                Remark = "Integration test"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/coupons", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("INTCREATE");

            // Verify in DB
            using var db = GetDbContext();
            var dbRow = await db.FlightCoupons.FirstOrDefaultAsync(c => c.CouponCode == "INTCREATE");
            dbRow.Should().NotBeNull();
            dbRow.Value.Should().Be(10);
            dbRow.UsedCount.Should().Be(0);
        }

        [Fact]
        public async Task CreateCoupon_LowercaseCode_NormalizesToUpperCase()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "lowercase",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50,
                Status = "Active"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/coupons", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("LOWERCASE");
        }

        [Fact]
        public async Task CreateCoupon_ValueZero_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightCouponRequestDto
            {
                Value = 0,
                CouponType = "Percentage",
                CouponCode = "BAD",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/coupons", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Value must be greater than 0");
        }

        [Fact]
        public async Task CreateCoupon_EmptyCouponType_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "",
                CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/coupons", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("CouponType is required");
        }

        [Fact]
        public async Task CreateCoupon_InvalidCouponType_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Flat",
                CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/coupons", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("CouponType must be one of");
        }

        [Fact]
        public async Task CreateCoupon_EmptyCouponCode_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/coupons", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("CouponCode is required");
        }

        [Fact]
        public async Task CreateCoupon_ExpiryBeforeStart_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "CODE",
                StartDate = new DateOnly(2026, 12, 31),
                ExpiryDate = new DateOnly(2026, 1, 1),
                UseLimit = 50
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/coupons", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("ExpiryDate must be on or after StartDate");
        }

        [Fact]
        public async Task CreateCoupon_NegativeUseLimit_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = -1
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/coupons", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("UseLimit must be greater than or equal to 0");
        }

        [Fact]
        public async Task CreateCoupon_CouponTypeCaseInsensitive_NormalizesCorrectly()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "fIxEd",
                CouponCode = "CASENORM",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50,
                Status = "Active"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/coupons", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Fixed");
        }

        #endregion

        #region UpdateCoupon Integration Tests

        [Fact]
        public async Task UpdateCoupon_HappyPath_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var coupon = new FlightCoupon
            {
                Value = 10, CouponType = "Percentage", CouponCode = "BEFORE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 6, 30),
                UseLimit = 100, UsedCount = 5, Status = "Active", EntryDateUtc = DateTime.UtcNow
            };
            db.FlightCoupons.Add(coupon);
            await db.SaveChangesAsync();

            var request = new FlightCouponRequestDto
            {
                Value = 25,
                CouponType = "Fixed",
                CouponCode = "AFTER",
                StartDate = new DateOnly(2026, 7, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 200,
                Status = "Inactive",
                Remark = "Updated via integration"
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/coupons/{coupon.Id}", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            using var dbVerify = GetDbContext();
            var updated = await dbVerify.FlightCoupons.AsNoTracking().FirstOrDefaultAsync(c => c.Id == coupon.Id);
            updated.Should().NotBeNull();
            updated.CouponCode.Should().Be("AFTER");
            updated.Value.Should().Be(25);
            updated.CouponType.Should().Be("Fixed");
            updated.Status.Should().Be("Inactive");
            updated.Remark.Should().Be("Updated via integration");
        }

        [Fact]
        public async Task UpdateCoupon_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightCouponRequestDto
            {
                Value = 10, CouponType = "Percentage", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/flight/coupons/99999", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task UpdateCoupon_InvalidValue_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var coupon = new FlightCoupon
            {
                Value = 10, CouponType = "Percentage", CouponCode = "UPD",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50, Status = "Active", EntryDateUtc = DateTime.UtcNow
            };
            db.FlightCoupons.Add(coupon);
            await db.SaveChangesAsync();

            var request = new FlightCouponRequestDto
            {
                Value = -5, CouponType = "Percentage", CouponCode = "UPD",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/coupons/{coupon.Id}", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UpdateCoupon_ExpiryBeforeStart_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var coupon = new FlightCoupon
            {
                Value = 10, CouponType = "Percentage", CouponCode = "DATEUPD",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50, Status = "Active", EntryDateUtc = DateTime.UtcNow
            };
            db.FlightCoupons.Add(coupon);
            await db.SaveChangesAsync();

            var request = new FlightCouponRequestDto
            {
                Value = 10, CouponType = "Percentage", CouponCode = "DATEUPD",
                StartDate = new DateOnly(2026, 12, 31), ExpiryDate = new DateOnly(2026, 1, 1),
                UseLimit = 50
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/coupons/{coupon.Id}", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        #region DeleteCoupon Integration Tests

        [Fact]
        public async Task DeleteCoupon_ExistingId_Returns200AndRemoves()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var coupon = new FlightCoupon
            {
                Value = 10, CouponType = "Percentage", CouponCode = "TODELETE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50, Status = "Active", EntryDateUtc = DateTime.UtcNow
            };
            db.FlightCoupons.Add(coupon);
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync($"api/admin/flight/coupons/{coupon.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Coupon deleted");

            using var dbVerify = GetDbContext();
            var deleted = await dbVerify.FlightCoupons.FindAsync(coupon.Id);
            deleted.Should().BeNull();
        }

        [Fact]
        public async Task DeleteCoupon_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.DeleteAsync("api/admin/flight/coupons/99999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        #region GetUsedCoupons Integration Tests

        [Fact]
        public async Task GetUsedCoupons_HappyPath_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.FlightCouponUsages.Add(new FlightCouponUsage
            {
                FlightReservationId = 100, CouponCode = "USED10",
                UsedAtUtc = DateTime.UtcNow, TotalFareInr = 5000,
                CouponType = "Percentage", CouponValue = 10, CouponAmountInr = 500,
                BookingStatus = "Confirmed"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons/used");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("USED10");
        }

        [Fact]
        public async Task GetUsedCoupons_FilterByCouponCode_ReturnsFiltered()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.FlightCouponUsages.AddRange(
                new FlightCouponUsage
                {
                    FlightReservationId = 100, CouponCode = "ALPHA",
                    UsedAtUtc = DateTime.UtcNow, TotalFareInr = 5000,
                    CouponType = "Percentage", CouponValue = 10, CouponAmountInr = 500,
                    BookingStatus = "Confirmed"
                },
                new FlightCouponUsage
                {
                    FlightReservationId = 200, CouponCode = "BETA",
                    UsedAtUtc = DateTime.UtcNow, TotalFareInr = 8000,
                    CouponType = "Fixed", CouponValue = 500, CouponAmountInr = 500,
                    BookingStatus = "Confirmed"
                }
            );
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons/used?couponCode=ALPHA");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("ALPHA");
            content.Should().NotContain("BETA");
        }

        [Fact]
        public async Task GetUsedCoupons_LimitZero_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons/used?limit=0");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GetUsedCoupons_NegativeLimit_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons/used?limit=-5");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task GetUsedCoupons_NoUsages_Returns200WithEmptyArray()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons/used");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("[]");
        }

        [Fact]
        public async Task GetUsedCoupons_WithLimit_RespectsLimit()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            for (int i = 1; i <= 5; i++)
            {
                db.FlightCouponUsages.Add(new FlightCouponUsage
                {
                    FlightReservationId = i * 100, CouponCode = "CODE",
                    UsedAtUtc = DateTime.UtcNow.AddMinutes(-i), TotalFareInr = 1000 * i,
                    CouponType = "Fixed", CouponValue = 100, CouponAmountInr = 100,
                    BookingStatus = "Confirmed"
                });
            }
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight/coupons/used?limit=2");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var items = await response.Content.ReadFromJsonAsync<List<object>>();
            items.Should().HaveCount(2);
        }

        #endregion

        #region Full CRUD Workflow Integration Tests

        [Fact]
        public async Task FullCouponWorkflow_CreateReadUpdateDelete_WorksEndToEnd()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Step 1: Create
            var createRequest = new FlightCouponRequestDto
            {
                Value = 15,
                CouponType = "Percentage",
                CouponCode = "WORKFLOW",
                StartDate = new DateOnly(2026, 6, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 100,
                Status = "Active",
                Remark = "E2E test"
            };
            var createResponse = await client.PostAsJsonAsync("api/admin/flight/coupons", createRequest);
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var created = await createResponse.Content.ReadFromJsonAsync<FlightCoupon>();
            created.Should().NotBeNull();
            var id = created.Id;

            // Step 2: Read
            var getResponse = await client.GetAsync($"api/admin/flight/coupons/{id}");
            getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var fetched = await getResponse.Content.ReadFromJsonAsync<FlightCoupon>();
            fetched.CouponCode.Should().Be("WORKFLOW");
            fetched.UsedCount.Should().Be(0);

            // Step 3: List - should contain our coupon
            var listResponse = await client.GetAsync("api/admin/flight/coupons");
            listResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var listContent = await listResponse.Content.ReadAsStringAsync();
            listContent.Should().Contain("WORKFLOW");

            // Step 4: Update
            var updateRequest = new FlightCouponRequestDto
            {
                Value = 25,
                CouponType = "Fixed",
                CouponCode = "UPDATED",
                StartDate = new DateOnly(2026, 7, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 200,
                Status = "Inactive",
                Remark = "Updated"
            };
            var updateResponse = await client.PutAsJsonAsync($"api/admin/flight/coupons/{id}", updateRequest);
            updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Step 5: Verify update
            var getUpdatedResponse = await client.GetAsync($"api/admin/flight/coupons/{id}");
            var updated = await getUpdatedResponse.Content.ReadFromJsonAsync<FlightCoupon>();
            updated.CouponCode.Should().Be("UPDATED");
            updated.Value.Should().Be(25);
            updated.CouponType.Should().Be("Fixed");

            // Step 6: Delete
            var deleteResponse = await client.DeleteAsync($"api/admin/flight/coupons/{id}");
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Step 7: Verify delete
            var getDeletedResponse = await client.GetAsync($"api/admin/flight/coupons/{id}");
            getDeletedResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion
    }
}
