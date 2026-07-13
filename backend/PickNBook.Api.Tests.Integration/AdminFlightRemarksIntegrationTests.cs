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
    public class AdminFlightRemarksIntegrationTests : IClassFixture<WebApplicationFactory<AdminFlightController>>
    {
        private readonly WebApplicationFactory<AdminFlightController> _factory;

        public AdminFlightRemarksIntegrationTests(WebApplicationFactory<AdminFlightController> factory)
        {
            var dbName = "InMemoryDbForFlightRemarksIntegration_" + Guid.NewGuid().ToString();
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
            var response = await client.GetAsync("api/admin/flight/remarks");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/flight/remarks");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Endpoints_AllowedForSuperAdminRole()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.SuperAdmin);

            // Act
            var response = await client.GetAsync("api/admin/flight/remarks");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        #endregion

        #region GetRemarks Integration Tests

        [Fact]
        public async Task GetRemarks_HappyPath_Returns200WithRemarksSortedByUpdateDateUtcDesc()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var now = DateTime.UtcNow;
            db.FlightRemarks.AddRange(
                new FlightRemark
                {
                    SourceType = "Supplier", Remark = "First remark", Status = "Active", UpdateDateUtc = now.AddMinutes(-10), EntryDateUtc = now.AddMinutes(-10)
                },
                new FlightRemark
                {
                    SourceType = "Admin", Remark = "Second remark", Status = "Active", UpdateDateUtc = now, EntryDateUtc = now
                }
            );
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight/remarks");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<FlightRemark>>();
            results.Should().NotBeNull();
            results.Should().HaveCount(2);
            // Sorting order check
            results[0].Remark.Should().Be("Second remark");
            results[1].Remark.Should().Be("First remark");
        }

        [Fact]
        public async Task GetRemarks_EmptyDatabase_Returns200WithEmptyArray()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/remarks");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<FlightRemark>>();
            results.Should().BeEmpty();
        }

        #endregion

        #region GetRemarkById Integration Tests

        [Fact]
        public async Task GetRemarkById_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var remark = new FlightRemark
            {
                SourceType = "Admin", Remark = "Get by ID testing", Status = "Active", EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow
            };
            db.FlightRemarks.Add(remark);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/admin/flight/remarks/{remark.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<FlightRemark>();
            result.Should().NotBeNull();
            result.Id.Should().Be(remark.Id);
            result.SourceType.Should().Be("Admin");
            result.Remark.Should().Be("Get by ID testing");
        }

        [Fact]
        public async Task GetRemarkById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/remarks/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Remark not found.");
        }

        #endregion

        #region CreateRemark Integration Tests

        [Fact]
        public async Task CreateRemark_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightRemarkRequestDto
            {
                SourceType = "  Supplier  ",
                Remark = "  Integrate Create Remark  ",
                UpdatedBy = "  integration_admin  ",
                Status = "  Active  "
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/remarks", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var result = await response.Content.ReadFromJsonAsync<FlightRemark>();
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);
            result.SourceType.Should().Be("Supplier");
            result.Remark.Should().Be("Integrate Create Remark");
            result.UpdatedBy.Should().Be("integration_admin");
            result.Status.Should().Be("Active");

            // Verify db state
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.FlightRemarks.FindAsync(result.Id);
            dbRow.Should().NotBeNull();
            dbRow.Remark.Should().Be("Integrate Create Remark");
        }

        [Fact]
        public async Task CreateRemark_NullDto_Returns400BadRequest()
        {
            // Arrange — ASP.NET Core automatic validation rejects empty body
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PostAsJsonAsync<FlightRemarkRequestDto>("api/admin/flight/remarks", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("validation errors occurred");
        }

        [Fact]
        public async Task CreateRemark_EmptySourceType_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightRemarkRequestDto
            {
                SourceType = "   ",
                Remark = "Remark details"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/remarks", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("SourceType is required.");
        }

        [Fact]
        public async Task CreateRemark_EmptyRemark_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightRemarkRequestDto
            {
                SourceType = "Admin",
                Remark = ""
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/remarks", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Remark is required.");
        }

        #endregion

        #region UpdateRemark Integration Tests

        [Fact]
        public async Task UpdateRemark_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var remark = new FlightRemark
            {
                SourceType = "Supplier", Remark = "Old Remark", Status = "Active", EntryDateUtc = DateTime.UtcNow.AddDays(-1), UpdateDateUtc = DateTime.UtcNow.AddDays(-1)
            };
            db.FlightRemarks.Add(remark);
            await db.SaveChangesAsync();

            var request = new FlightRemarkRequestDto
            {
                SourceType = "Admin",
                Remark = "Updated Remark via Put",
                UpdatedBy = "super_admin",
                Status = "Inactive"
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/remarks/{remark.Id}", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<FlightRemark>();
            result.Should().NotBeNull();
            result.SourceType.Should().Be("Admin");
            result.Remark.Should().Be("Updated Remark via Put");
            result.UpdatedBy.Should().Be("super_admin");
            result.Status.Should().Be("Inactive");

            // Verify db state
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.FlightRemarks.FindAsync(remark.Id);
            dbRow.Remark.Should().Be("Updated Remark via Put");
            dbRow.Status.Should().Be("Inactive");
        }

        [Fact]
        public async Task UpdateRemark_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new FlightRemarkRequestDto
            {
                SourceType = "Admin", Remark = "Update non existing"
            };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/flight/remarks/9999", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Remark not found.");
        }

        [Fact]
        public async Task UpdateRemark_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PutAsJsonAsync<FlightRemarkRequestDto>("api/admin/flight/remarks/1", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UpdateRemark_EmptyFields_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var remark = new FlightRemark
            {
                SourceType = "Admin", Remark = "Existing Remark", Status = "Active",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow
            };
            db.FlightRemarks.Add(remark);
            await db.SaveChangesAsync();

            var request = new FlightRemarkRequestDto
            {
                SourceType = "",
                Remark = "Testing update error"
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/remarks/{remark.Id}", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("SourceType is required.");
        }

        #endregion

        #region DeleteRemark Integration Tests

        [Fact]
        public async Task DeleteRemark_ExistingId_Returns200AndRemoves()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var remark = new FlightRemark { SourceType = "Admin", Remark = "Delete testing" };
            db.FlightRemarks.Add(remark);
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync($"api/admin/flight/remarks/{remark.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Remark deleted.");

            // Verify db state
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.FlightRemarks.FindAsync(remark.Id);
            dbRow.Should().BeNull();
        }

        [Fact]
        public async Task DeleteRemark_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.DeleteAsync("api/admin/flight/remarks/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Remark not found.");
        }

        #endregion

        #region Full E2E Workflow Tests

        [Fact]
        public async Task FullWorkflow_CreateReadUpdateDelete_WorksEndToEnd()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // 1. Create
            var createRequest = new FlightRemarkRequestDto
            {
                SourceType = "Admin",
                Remark = "E2E workflow testing remark",
                UpdatedBy = "e2e_user",
                Status = "Active"
            };
            var createResponse = await client.PostAsJsonAsync("api/admin/flight/remarks", createRequest);
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var created = await createResponse.Content.ReadFromJsonAsync<FlightRemark>();
            created.Should().NotBeNull();
            var id = created.Id;

            // 2. Read
            var getResponse = await client.GetAsync($"api/admin/flight/remarks/{id}");
            getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var fetched = await getResponse.Content.ReadFromJsonAsync<FlightRemark>();
            fetched.Remark.Should().Be("E2E workflow testing remark");

            // 3. Update
            var updateRequest = new FlightRemarkRequestDto
            {
                SourceType = "Supplier",
                Remark = "E2E workflow testing remark - updated",
                UpdatedBy = "e2e_user_updated",
                Status = "Inactive"
            };
            var updateResponse = await client.PutAsJsonAsync($"api/admin/flight/remarks/{id}", updateRequest);
            updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 4. Verify Update
            var getUpdatedResponse = await client.GetAsync($"api/admin/flight/remarks/{id}");
            var updated = await getUpdatedResponse.Content.ReadFromJsonAsync<FlightRemark>();
            updated.Remark.Should().Be("E2E workflow testing remark - updated");
            updated.SourceType.Should().Be("Supplier");
            updated.Status.Should().Be("Inactive");

            // 5. Delete
            var deleteResponse = await client.DeleteAsync($"api/admin/flight/remarks/{id}");
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 6. Verify Delete
            var getDeletedResponse = await client.GetAsync($"api/admin/flight/remarks/{id}");
            getDeletedResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion
    }
}
