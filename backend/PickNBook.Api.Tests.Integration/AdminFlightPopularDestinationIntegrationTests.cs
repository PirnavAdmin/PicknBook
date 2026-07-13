#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
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
    public class AdminFlightPopularDestinationIntegrationTests : IClassFixture<WebApplicationFactory<AdminFlightController>>
    {
        private readonly WebApplicationFactory<AdminFlightController> _factory;

        public AdminFlightPopularDestinationIntegrationTests(WebApplicationFactory<AdminFlightController> factory)
        {
            var dbName = "InMemoryDbForFlightPopularDestinationIntegration_" + Guid.NewGuid().ToString();
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
            var response = await client.GetAsync("api/admin/flight/popular-destinations");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Endpoints_ForbiddenWhenUserRoleProvided()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.User);

            // Act
            var response = await client.GetAsync("api/admin/flight/popular-destinations");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Endpoints_AllowedForSuperAdminRole()
        {
            // Arrange
            var client = GetAuthenticatedClient(AuthRoles.SuperAdmin);

            // Act
            var response = await client.GetAsync("api/admin/flight/popular-destinations");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        #endregion

        #region GetPopularDestinations Integration Tests

        [Fact]
        public async Task GetPopularDestinations_HappyPath_Returns200WithSortedData()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var now = DateTime.UtcNow;
            db.PopularDestinations.AddRange(
                new PopularDestination { Title = "Paris", Category = "Europe", EntryDateUtc = now.AddDays(-2) },
                new PopularDestination { Title = "London", Category = "Europe", EntryDateUtc = now.AddDays(-1) }
            );
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/admin/flight/popular-destinations");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<PopularDestination>>();
            results.Should().NotBeNull();
            results.Should().HaveCount(2);
            results[0].Title.Should().Be("London");
            results[1].Title.Should().Be("Paris");
        }

        [Fact]
        public async Task GetPopularDestinations_EmptyDatabase_Returns200WithEmptyArray()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/popular-destinations");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var results = await response.Content.ReadFromJsonAsync<List<PopularDestination>>();
            results.Should().BeEmpty();
        }

        #endregion

        #region GetPopularDestinationById Integration Tests

        [Fact]
        public async Task GetPopularDestinationById_ExistingId_Returns200()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var row = new PopularDestination { Title = "Rome", Category = "Europe" };
            db.PopularDestinations.Add(row);
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync($"api/admin/flight/popular-destinations/{row.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<PopularDestination>();
            result.Should().NotBeNull();
            result.Id.Should().Be(row.Id);
            result.Title.Should().Be("Rome");
        }

        [Fact]
        public async Task GetPopularDestinationById_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.GetAsync("api/admin/flight/popular-destinations/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Popular destination not found.");
        }

        #endregion

        #region CreatePopularDestination Integration Tests

        [Fact]
        public async Task CreatePopularDestination_HappyPath_Returns201AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new PopularDestinationRequestDto
            {
                Title = "  Tokyo  ",
                SubTitle = "  Land of Rising Sun  ",
                Category = "  Asia  ",
                ImageUrl = "  http://tokyo.jpg  ",
                Placement = "  Featured  ",
                Url = "  http://tokyo.com  ",
                Status = "  Active  "
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/popular-destinations", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var result = await response.Content.ReadFromJsonAsync<PopularDestination>();
            result.Should().NotBeNull();
            result.Id.Should().BeGreaterThan(0);
            result.Title.Should().Be("Tokyo");
            result.SubTitle.Should().Be("Land of Rising Sun");
            result.Category.Should().Be("Asia");
            result.ImageUrl.Should().Be("http://tokyo.jpg");
            result.Placement.Should().Be("Featured");
            result.Url.Should().Be("http://tokyo.com");
            result.Status.Should().Be("Active");

            // Verify database
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.PopularDestinations.FindAsync(result.Id);
            dbRow.Should().NotBeNull();
            dbRow.Title.Should().Be("Tokyo");
        }

        [Fact]
        public async Task CreatePopularDestination_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PostAsJsonAsync<PopularDestinationRequestDto>("api/admin/flight/popular-destinations", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CreatePopularDestination_MissingTitle_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new PopularDestinationRequestDto
            {
                Title = "",
                Category = "Asia",
                SubTitle = "SubTitle"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/popular-destinations", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Title is required.");
        }

        [Fact]
        public async Task CreatePopularDestination_MissingCategory_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new PopularDestinationRequestDto
            {
                Title = "Tokyo",
                Category = " ",
                SubTitle = "SubTitle"
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/popular-destinations", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Category is required.");
        }

        [Fact]
        public async Task CreatePopularDestination_MissingSubTitle_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var request = new PopularDestinationRequestDto
            {
                Title = "Tokyo",
                Category = "Asia",
                SubTitle = ""
            };

            // Act
            var response = await client.PostAsJsonAsync("api/admin/flight/popular-destinations", request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("SubTitle is required.");
        }

        [Fact]
        public async Task CreatePopularDestination_FieldsTooLong_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            
            // 1. Title too long (> 120)
            var req1 = new PopularDestinationRequestDto { Title = new string('a', 121), Category = "Asia", SubTitle = "Sub" };
            var res1 = await client.PostAsJsonAsync("api/admin/flight/popular-destinations", req1);
            res1.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res1.Content.ReadAsStringAsync()).Should().Be("Title cannot exceed 120 characters.");

            // 2. SubTitle too long (> 180)
            var req2 = new PopularDestinationRequestDto { Title = "Tokyo", Category = "Asia", SubTitle = new string('b', 181) };
            var res2 = await client.PostAsJsonAsync("api/admin/flight/popular-destinations", req2);
            res2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res2.Content.ReadAsStringAsync()).Should().Be("SubTitle cannot exceed 180 characters.");

            // 3. ImageUrl too long (> 500)
            var req3 = new PopularDestinationRequestDto { Title = "Tokyo", Category = "Asia", SubTitle = "Sub", ImageUrl = new string('c', 501) };
            var res3 = await client.PostAsJsonAsync("api/admin/flight/popular-destinations", req3);
            res3.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res3.Content.ReadAsStringAsync()).Should().Be("ImageUrl cannot exceed 500 characters.");

            // 4. Category too long (> 80)
            var req4 = new PopularDestinationRequestDto { Title = "Tokyo", Category = new string('d', 81), SubTitle = "Sub" };
            var res4 = await client.PostAsJsonAsync("api/admin/flight/popular-destinations", req4);
            res4.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res4.Content.ReadAsStringAsync()).Should().Be("Category cannot exceed 80 characters.");
        }

        #endregion

        #region UpdatePopularDestination Integration Tests

        [Fact]
        public async Task UpdatePopularDestination_ExistingId_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var row = new PopularDestination { Title = "Rome", Category = "Europe", SubTitle = "Ancient Rome" };
            db.PopularDestinations.Add(row);
            await db.SaveChangesAsync();

            var updateDto = new PopularDestinationRequestDto
            {
                Title = "  Rome Updated  ",
                SubTitle = "  Beautiful Rome  ",
                Category = "  Italy  ",
                ImageUrl = "  http://rome.jpg  ",
                Placement = "  Main  ",
                Url = "  http://rome.com  ",
                Status = "  Inactive  "
            };

            // Act
            var response = await client.PutAsJsonAsync($"api/admin/flight/popular-destinations/{row.Id}", updateDto);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<PopularDestination>();
            result.Should().NotBeNull();
            result.Title.Should().Be("Rome Updated");
            result.SubTitle.Should().Be("Beautiful Rome");
            result.Category.Should().Be("Italy");
            result.ImageUrl.Should().Be("http://rome.jpg");
            result.Placement.Should().Be("Main");
            result.Url.Should().Be("http://rome.com");
            result.Status.Should().Be("Inactive");

            // Verify db
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.PopularDestinations.FindAsync(row.Id);
            dbRow.Title.Should().Be("Rome Updated");
        }

        [Fact]
        public async Task UpdatePopularDestination_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var updateDto = new PopularDestinationRequestDto { Title = "Rome", Category = "Europe", SubTitle = "Ancient" };

            // Act
            var response = await client.PutAsJsonAsync("api/admin/flight/popular-destinations/9999", updateDto);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Popular destination not found.");
        }

        [Fact]
        public async Task UpdatePopularDestination_NullDto_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.PutAsJsonAsync<PopularDestinationRequestDto>("api/admin/flight/popular-destinations/1", null);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task UpdatePopularDestination_MissingFields_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var row = new PopularDestination { Title = "Rome", Category = "Europe", SubTitle = "Ancient Rome" };
            db.PopularDestinations.Add(row);
            await db.SaveChangesAsync();

            // 1. Missing Title
            var req1 = new PopularDestinationRequestDto { Title = "", Category = "Europe", SubTitle = "Sub" };
            var res1 = await client.PutAsJsonAsync($"api/admin/flight/popular-destinations/{row.Id}", req1);
            res1.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res1.Content.ReadAsStringAsync()).Should().Be("Title is required.");

            // 2. Missing Category
            var req2 = new PopularDestinationRequestDto { Title = "Rome", Category = "", SubTitle = "Sub" };
            var res2 = await client.PutAsJsonAsync($"api/admin/flight/popular-destinations/{row.Id}", req2);
            res2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res2.Content.ReadAsStringAsync()).Should().Be("Category is required.");

            // 3. Missing SubTitle
            var req3 = new PopularDestinationRequestDto { Title = "Rome", Category = "Europe", SubTitle = " " };
            var res3 = await client.PutAsJsonAsync($"api/admin/flight/popular-destinations/{row.Id}", req3);
            res3.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await res3.Content.ReadAsStringAsync()).Should().Be("SubTitle is required.");
        }

        [Fact]
        public async Task UpdatePopularDestination_FieldsTooLong_Returns400BadRequest()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var row = new PopularDestination { Title = "Rome", Category = "Europe", SubTitle = "Ancient Rome" };
            db.PopularDestinations.Add(row);
            await db.SaveChangesAsync();

            // Title too long
            var req1 = new PopularDestinationRequestDto { Title = new string('a', 121), Category = "Europe", SubTitle = "Sub" };
            var res1 = await client.PutAsJsonAsync($"api/admin/flight/popular-destinations/{row.Id}", req1);
            res1.StatusCode.Should().Be(HttpStatusCode.BadRequest);

            // SubTitle too long
            var req2 = new PopularDestinationRequestDto { Title = "Rome", Category = "Europe", SubTitle = new string('b', 181) };
            var res2 = await client.PutAsJsonAsync($"api/admin/flight/popular-destinations/{row.Id}", req2);
            res2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        #endregion

        #region DeletePopularDestination Integration Tests

        [Fact]
        public async Task DeletePopularDestination_ExistingId_Returns200AndRemoves()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            var row = new PopularDestination { Title = "Rome", Category = "Europe" };
            db.PopularDestinations.Add(row);
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync($"api/admin/flight/popular-destinations/{row.Id}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Contain("Popular destination deleted.");

            // Verify db
            using var dbVerify = GetDbContext();
            var dbRow = await dbVerify.PopularDestinations.FindAsync(row.Id);
            dbRow.Should().BeNull();
        }

        [Fact]
        public async Task DeletePopularDestination_NonExistingId_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.DeleteAsync("api/admin/flight/popular-destinations/9999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
            var content = await response.Content.ReadAsStringAsync();
            content.Should().Be("Popular destination not found.");
        }

        #endregion

        #region Full E2E Workflow Tests

        [Fact]
        public async Task FullWorkflow_CreateReadUpdateDelete_WorksEndToEnd()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // 1. Create
            var createRequest = new PopularDestinationRequestDto
            {
                Title = "Rome",
                Category = "Europe",
                SubTitle = "Eternal City"
            };
            var createResponse = await client.PostAsJsonAsync("api/admin/flight/popular-destinations", createRequest);
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var created = await createResponse.Content.ReadFromJsonAsync<PopularDestination>();
            created.Should().NotBeNull();
            var id = created.Id;

            // 2. Read
            var getResponse = await client.GetAsync($"api/admin/flight/popular-destinations/{id}");
            getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            var fetched = await getResponse.Content.ReadFromJsonAsync<PopularDestination>();
            fetched.Title.Should().Be("Rome");

            // 3. Update
            var updateRequest = new PopularDestinationRequestDto
            {
                Title = "Rome Updated",
                Category = "Europe Updated",
                SubTitle = "Eternal City"
            };
            var updateResponse = await client.PutAsJsonAsync($"api/admin/flight/popular-destinations/{id}", updateRequest);
            updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 4. Verify Update
            var getUpdatedResponse = await client.GetAsync($"api/admin/flight/popular-destinations/{id}");
            var updated = await getUpdatedResponse.Content.ReadFromJsonAsync<PopularDestination>();
            updated.Title.Should().Be("Rome Updated");
            updated.Category.Should().Be("Europe Updated");

            // 5. Delete
            var deleteResponse = await client.DeleteAsync($"api/admin/flight/popular-destinations/{id}");
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            // 6. Verify Delete
            var getDeletedResponse = await client.GetAsync($"api/admin/flight/popular-destinations/{id}");
            getDeletedResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion
    }
}
