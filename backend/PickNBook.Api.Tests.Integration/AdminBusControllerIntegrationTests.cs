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
    public class AdminBusControllerIntegrationTests : IClassFixture<WebApplicationFactory<AdminBusController>>
    {
        private readonly WebApplicationFactory<AdminBusController> _factory;

        public AdminBusControllerIntegrationTests(WebApplicationFactory<AdminBusController> factory)
        {
            var dbName = "InMemoryDbForIntegration_" + Guid.NewGuid().ToString();
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

                    // Add AppDbContext with a fresh InMemory database
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
            var getResult = await client.GetAsync("api/admin/bus/discounts");

            // Assert
            getResult.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var getResult = await client.GetAsync("api/admin/bus/discounts");

            // Assert
            getResult.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task GetDiscounts_HappyPath_Returns200WithDiscounts()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusDiscounts.Add(new BusDiscount
            {
                Value = 10,
                DiscountType = "Percentage",
                UpdatedBy = "admin",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/bus/discounts");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await response.Content.ReadFromJsonAsync<List<object>>();
            list.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetDiscountById_ExistingId_Returns200WithDiscount()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var discount = new BusDiscount
            {
                Id = 10,
                Value = 15,
                DiscountType = "Percentage",
                UpdatedBy = "admin",
                Status = "Active"
            };
            db.BusDiscounts.Add(discount);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/bus/discounts/10");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var returnedDiscount = await response.Content.ReadFromJsonAsync<BusDiscount>();
            returnedDiscount.Should().NotBeNull();
            returnedDiscount.Id.Should().Be(10);
            returnedDiscount.Value.Should().Be(15);
        }

        [Fact]
        public async Task GetDiscountById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/bus/discounts/999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task CreateDiscount_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusDiscountRequestDto
            {
                Code = "SAVE25",
                Title = "Save 25",
                Value = 25,
                DiscountType = "Percentage",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/bus/discounts", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var returnedDiscount = await response.Content.ReadFromJsonAsync<BusDiscount>();
            returnedDiscount.Should().NotBeNull();
            returnedDiscount.Code.Should().Be("SAVE25");

            // Verify DB Persistence
            using var db = GetDbContext();
            var dbDiscount = await db.BusDiscounts.FindAsync(returnedDiscount.Id);
            dbDiscount.Should().NotBeNull();
            dbDiscount.Code.Should().Be("SAVE25");
        }

        [Fact]
        public async Task CreateDiscount_ValidationFails_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusDiscountRequestDto
            {
                Value = -5, // Invalid Value
                DiscountType = "Percentage"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/bus/discounts", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UpdateDiscount_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusDiscounts.Add(new BusDiscount
            {
                Id = 5,
                Value = 10,
                DiscountType = "Percentage",
                UpdatedBy = "admin",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var request = new BusDiscountRequestDto
            {
                Value = 20,
                DiscountType = "Fixed",
                UpdatedBy = "admin_updated",
                Status = "Inactive"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/discounts/5", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var updatedDiscount = await response.Content.ReadFromJsonAsync<BusDiscount>();
            updatedDiscount.Should().NotBeNull();
            updatedDiscount.Value.Should().Be(20);
            updatedDiscount.DiscountType.Should().Be("Fixed");

            // Verify in DB
            using var dbVerify = GetDbContext();
            var dbDiscount = await dbVerify.BusDiscounts.FindAsync(5);
            dbDiscount.Value.Should().Be(20);
            dbDiscount.Status.Should().Be("Inactive");
        }

        [Fact]
        public async Task UpdateDiscount_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new BusDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/discounts/999", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task DeleteDiscount_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusDiscounts.Add(new BusDiscount
            {
                Id = 8,
                Value = 10,
                DiscountType = "Percentage",
                UpdatedBy = "admin",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync("api/admin/bus/discounts/8");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify removed from DB
            using var dbVerify = GetDbContext();
            var dbDiscount = await dbVerify.BusDiscounts.FindAsync(8);
            dbDiscount.Should().BeNull();
        }

        [Fact]
        public async Task AddDiscountCondition_HappyPath_Returns200AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusDiscounts.Add(new BusDiscount
            {
                Id = 12,
                Value = 10,
                DiscountType = "Percentage",
                UpdatedBy = "admin",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var request = new CreateBusDiscountConditionDto
            {
                ConditionType = "Operator",
                ConditionOperator = "Equals",
                Value1 = "Volvo"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/bus/discounts/12/conditions", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify in DB
            using var dbVerify = GetDbContext();
            var condition = await dbVerify.BusDiscountConditions.FirstOrDefaultAsync(x => x.BusDiscountId == 12);
            condition.Should().NotBeNull();
            condition.ConditionType.Should().Be("Operator");
            condition.Value1.Should().Be("Volvo");
        }

        [Fact]
        public async Task GetDiscountConditions_ExistingId_Returns200WithConditions()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusDiscountConditions.Add(new BusDiscountCondition
            {
                BusDiscountId = 15,
                ConditionType = "Operator",
                ConditionOperator = "Equals",
                Value1 = "Volvo"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/bus/discounts/15/conditions");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var list = await response.Content.ReadFromJsonAsync<List<BusDiscountCondition>>();
            list.Should().HaveCount(1);
            list[0].Value1.Should().Be("Volvo");
        }

        [Fact]
        public async Task UpdateDiscountCondition_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var condition = new BusDiscountCondition
            {
                Id = 22,
                BusDiscountId = 15,
                ConditionType = "Operator",
                ConditionOperator = "Equals",
                Value1 = "Volvo"
            };
            db.BusDiscountConditions.Add(condition);
            await db.SaveChangesAsync();

            var request = new UpdateBusDiscountConditionDto
            {
                ConditionType = "Operator",
                ConditionOperator = "NotEquals",
                Value1 = "Scania"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/bus/discounts/conditions/22", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify in DB
            using var dbVerify = GetDbContext();
            var dbCond = await dbVerify.BusDiscountConditions.FindAsync(22);
            dbCond.Should().NotBeNull();
            dbCond.ConditionOperator.Should().Be("NotEquals");
            dbCond.Value1.Should().Be("Scania");
        }

        [Fact]
        public async Task DeleteDiscountCondition_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BusDiscountConditions.Add(new BusDiscountCondition
            {
                Id = 30,
                BusDiscountId = 15,
                ConditionType = "Operator",
                ConditionOperator = "Equals",
                Value1 = "Volvo"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync("api/admin/bus/discounts/conditions/30");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Verify in DB
            using var dbVerify = GetDbContext();
            var dbCond = await dbVerify.BusDiscountConditions.FindAsync(30);
            dbCond.Should().BeNull();
        }
    }
}
