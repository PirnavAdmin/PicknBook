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
    public class AdminFlightDiscountIntegrationTests : IClassFixture<WebApplicationFactory<AdminFlightController>>
    {
        private readonly WebApplicationFactory<AdminFlightController> _factory;

        public AdminFlightDiscountIntegrationTests(WebApplicationFactory<AdminFlightController> factory)
        {
            var dbName = "InMemoryDbForFlightDiscountIntegration_" + Guid.NewGuid().ToString();
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
            var response = await client.GetAsync("api/admin/flight/discounts");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/flight/discounts");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Endpoints_AllowedForSuperAdminRole()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.SuperAdmin);

            // Act
            var response = await client.GetAsync("api/admin/flight/discounts");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        #endregion

        #region GetDiscounts Integration Tests

        [Fact]
        public async Task GetDiscounts_HappyPath_Returns200WithDiscounts()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Value = 10, DiscountType = "Percentage", Name = "IntegrationDiscount",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight/discounts");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("IntegrationDiscount");
        }

        [Fact]
        public async Task GetDiscounts_EmptyDatabase_Returns200WithEmptyArray()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/discounts");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        #endregion

        #region GetDiscountById Integration Tests

        [Fact]
        public async Task GetDiscountById_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var discount = new FlightDiscount
            {
                Value = 15, DiscountType = "Fixed", Name = "GetByIdTest",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            };
            db.FlightDiscounts.Add(discount);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/admin/flight/discounts/{discount.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("GetByIdTest");
        }

        [Fact]
        public async Task GetDiscountById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/discounts/99999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        #region CreateDiscount Integration Tests

        [Fact]
        public async Task CreateDiscount_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "Integration Create",
                Status = "Active",
                UpdatedBy = "admin",
                Remark = "Test remark"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/discounts", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Integration Create");

            // Verify in DB
            using var db = GetDbContext();
            var dbRow = await db.FlightDiscounts.FirstOrDefaultAsync(d => d.Name == "Integration Create");
            dbRow.Should().NotBeNull();
            dbRow.Value.Should().Be(10);
        }

        [Fact]
        public async Task CreateDiscount_InvalidValue_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightDiscountRequestDto
            {
                Value = 0,
                DiscountType = "Percentage",
                Name = "BadValue",
                Status = "Active"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/discounts", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Value must be greater than 0");
        }

        [Fact]
        public async Task CreateDiscount_EmptyName_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "",
                Status = "Active"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/discounts", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Name is required");
        }

        [Fact]
        public async Task CreateDiscount_InvalidDiscountType_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "FlatRate",
                Name = "BadType",
                Status = "Active"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/discounts", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("DiscountType must be one of");
        }

        [Fact]
        public async Task CreateDiscount_EmptyDiscountType_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "",
                Name = "NoType",
                Status = "Active"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/discounts", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("DiscountType is required");
        }

        [Fact]
        public async Task CreateDiscount_FixedType_Returns201()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightDiscountRequestDto
            {
                Value = 500,
                DiscountType = "Fixed",
                Name = "Fixed Integration",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/discounts", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Fixed");
        }

        [Fact]
        public async Task CreateDiscount_CaseInsensitiveType_NormalizesCorrectly()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "pErCeNtAgE",
                Name = "CaseInsensitive",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/discounts", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Percentage");
        }

        #endregion

        #region UpdateDiscount Integration Tests

        [Fact]
        public async Task UpdateDiscount_HappyPath_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var discount = new FlightDiscount
            {
                Value = 10, DiscountType = "Percentage", Name = "BeforeUpdate",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            };
            db.FlightDiscounts.Add(discount);
            await db.SaveChangesAsync();

            var request = new FlightDiscountRequestDto
            {
                Value = 25,
                DiscountType = "Fixed",
                Name = "AfterUpdate",
                Status = "Inactive",
                UpdatedBy = "superadmin",
                Remark = "Updated"
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/discounts/{discount.Id}", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            using var dbVerify = GetDbContext();
            var updated = await dbVerify.FlightDiscounts.AsNoTracking().FirstOrDefaultAsync(d => d.Id == discount.Id);
            updated.Should().NotBeNull();
            updated.Name.Should().Be("AfterUpdate");
            updated.Value.Should().Be(25);
            updated.DiscountType.Should().Be("Fixed");
            updated.Status.Should().Be("Inactive");
        }

        [Fact]
        public async Task UpdateDiscount_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "Test",
                Status = "Active"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/flight/discounts/99999", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task UpdateDiscount_InvalidValue_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var discount = new FlightDiscount
            {
                Value = 10, DiscountType = "Percentage", Name = "ToUpdate",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            };
            db.FlightDiscounts.Add(discount);
            await db.SaveChangesAsync();

            var request = new FlightDiscountRequestDto
            {
                Value = -1,
                DiscountType = "Percentage",
                Name = "Test",
                Status = "Active"
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/discounts/{discount.Id}", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        #region DeleteDiscount Integration Tests

        [Fact]
        public async Task DeleteDiscount_ExistingId_Returns200AndRemoves()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var discount = new FlightDiscount
            {
                Value = 10, DiscountType = "Percentage", Name = "ToDelete",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            };
            db.FlightDiscounts.Add(discount);
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync($"api/admin/flight/discounts/{discount.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            using var dbVerify = GetDbContext();
            var deleted = await dbVerify.FlightDiscounts.FindAsync(discount.Id);
            deleted.Should().BeNull();
        }

        [Fact]
        public async Task DeleteDiscount_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.DeleteAsync("api/admin/flight/discounts/99999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        #region DiscountCondition Integration Tests

        [Fact]
        public async Task AddDiscountCondition_HappyPath_Returns200AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var discount = new FlightDiscount
            {
                Value = 10, DiscountType = "Percentage", Name = "ConditionParent",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            };
            db.FlightDiscounts.Add(discount);
            await db.SaveChangesAsync();

            var request = new CreateFlightDiscountConditionDto
            {
                ConditionType = "Route",
                ConditionOperator = "Equals",
                Value1 = "DEL-BOM",
                Value2 = null
            };

            // Act
            var response = await client.PostAsJsonAsync($"api/admin/flight/discounts/{discount.Id}/conditions", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Discount condition added successfully");

            using var dbVerify = GetDbContext();
            var conditions = await dbVerify.FlightDiscountConditions
                .Where(c => c.FlightDiscountId == discount.Id)
                .ToListAsync();
            conditions.Should().HaveCount(1);
            conditions[0].ConditionType.Should().Be("Route");
        }

        [Fact]
        public async Task AddDiscountCondition_NonExistingDiscount_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new CreateFlightDiscountConditionDto
            {
                ConditionType = "Route",
                ConditionOperator = "Equals",
                Value1 = "DEL-BOM"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/discounts/99999/conditions", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetDiscountConditions_HappyPath_Returns200WithConditions()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var discount = new FlightDiscount
            {
                Value = 10, DiscountType = "Percentage", Name = "CondListParent",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            };
            db.FlightDiscounts.Add(discount);
            await db.SaveChangesAsync();

            db.FlightDiscountConditions.Add(new FlightDiscountCondition
            {
                FlightDiscountId = discount.Id,
                ConditionType = "Airline",
                ConditionOperator = "Equals",
                Value1 = "6E"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/admin/flight/discounts/{discount.Id}/conditions");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Airline");
            content.Should().Contain("6E");
        }

        [Fact]
        public async Task GetDiscountConditions_NonExistingDiscount_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/discounts/99999/conditions");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetDiscountConditions_NoConditions_Returns200WithEmptyArray()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var discount = new FlightDiscount
            {
                Value = 10, DiscountType = "Percentage", Name = "NoConditions",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            };
            db.FlightDiscounts.Add(discount);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/admin/flight/discounts/{discount.Id}/conditions");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("[]");
        }

        [Fact]
        public async Task DeleteDiscountCondition_ExistingId_Returns200AndRemoves()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var discount = new FlightDiscount
            {
                Value = 10, DiscountType = "Percentage", Name = "DeleteCondParent",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            };
            db.FlightDiscounts.Add(discount);
            await db.SaveChangesAsync();

            var condition = new FlightDiscountCondition
            {
                FlightDiscountId = discount.Id,
                ConditionType = "Route",
                ConditionOperator = "Equals",
                Value1 = "BOM-DEL"
            };
            db.FlightDiscountConditions.Add(condition);
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync($"api/admin/flight/discounts/conditions/{condition.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Condition deleted successfully");

            using var dbVerify = GetDbContext();
            var deleted = await dbVerify.FlightDiscountConditions.FindAsync(condition.Id);
            deleted.Should().BeNull();
        }

        [Fact]
        public async Task DeleteDiscountCondition_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.DeleteAsync("api/admin/flight/discounts/conditions/99999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        #region Full CRUD Workflow Integration Tests

        [Fact]
        public async Task FullDiscountWorkflow_CreateReadUpdateDelete_WorksEndToEnd()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Step 1: Create
            var createRequest = new FlightDiscountRequestDto
            {
                Value = 15,
                DiscountType = "Percentage",
                Name = "Workflow Test",
                Status = "Active",
                UpdatedBy = "admin",
                Remark = "E2E test"
            };
            var createResponse = await client.PostAsJsonAsync("api/admin/flight/discounts", createRequest);
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var created = await createResponse.Content.ReadFromJsonAsync<FlightDiscount>();
            created.Should().NotBeNull();
            var id = created.Id;

            // Step 2: Read
            var getResponse = await client.GetAsync($"api/admin/flight/discounts/{id}");
            getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var fetched = await getResponse.Content.ReadFromJsonAsync<FlightDiscount>();
            fetched.Name.Should().Be("Workflow Test");

            // Step 3: Update
            var updateRequest = new FlightDiscountRequestDto
            {
                Value = 25,
                DiscountType = "Fixed",
                Name = "Updated Workflow",
                Status = "Inactive",
                UpdatedBy = "superadmin",
                Remark = "Updated"
            };
            var updateResponse = await client.PutAsJsonAsync($"api/admin/flight/discounts/{id}", updateRequest);
            updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Step 4: Verify update
            var getUpdatedResponse = await client.GetAsync($"api/admin/flight/discounts/{id}");
            var updated = await getUpdatedResponse.Content.ReadFromJsonAsync<FlightDiscount>();
            updated.Name.Should().Be("Updated Workflow");
            updated.Value.Should().Be(25);

            // Step 5: Delete
            var deleteResponse = await client.DeleteAsync($"api/admin/flight/discounts/{id}");
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Step 6: Verify delete
            var getDeletedResponse = await client.GetAsync($"api/admin/flight/discounts/{id}");
            getDeletedResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task FullConditionWorkflow_AddGetDelete_WorksEndToEnd()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Create parent discount first
            var discountRequest = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "Condition Workflow Parent",
                Status = "Active",
                UpdatedBy = "admin"
            };
            var discountResponse = await client.PostAsJsonAsync("api/admin/flight/discounts", discountRequest);
            discountResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var discount = await discountResponse.Content.ReadFromJsonAsync<FlightDiscount>();
            var discountId = discount.Id;

            // Step 1: Add condition
            var condRequest = new CreateFlightDiscountConditionDto
            {
                ConditionType = "Airline",
                ConditionOperator = "Equals",
                Value1 = "AI"
            };
            var addResponse = await client.PostAsJsonAsync($"api/admin/flight/discounts/{discountId}/conditions", condRequest);
            addResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Step 2: Get conditions
            var getResponse = await client.GetAsync($"api/admin/flight/discounts/{discountId}/conditions");
            getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var conditions = await getResponse.Content.ReadFromJsonAsync<List<FlightDiscountCondition>>();
            conditions.Should().HaveCount(1);
            var conditionId = conditions[0].Id;

            // Step 3: Delete condition
            var deleteResponse = await client.DeleteAsync($"api/admin/flight/discounts/conditions/{conditionId}");
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // Step 4: Verify deletion
            var getAfterDelete = await client.GetAsync($"api/admin/flight/discounts/{discountId}/conditions");
            var conditionsAfter = await getAfterDelete.Content.ReadFromJsonAsync<List<FlightDiscountCondition>>();
            conditionsAfter.Should().BeEmpty();
        }

        #endregion
    }
}
