#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FluentAssertions;
using Xunit;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Tests.Unit
{
    public class AdminFlightPopularDestinationTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        #region GetPopularDestinations Tests

        [Fact]
        public async Task GetPopularDestinations_HappyPath_ReturnsOkWithDestinationsOrderedByEntryDateDesc()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.PopularDestinations.AddRange(
                new PopularDestination { Id = 1, Title = "Paris", Category = "Europe", EntryDateUtc = now.AddDays(-2) },
                new PopularDestination { Id = 2, Title = "London", Category = "Europe", EntryDateUtc = now.AddDays(-1) }
            );
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetPopularDestinations();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as List<PopularDestination>;
            list.Should().NotBeNull();
            list.Should().HaveCount(2);
            list[0].Title.Should().Be("London"); // Ordered descending by EntryDateUtc
            list[1].Title.Should().Be("Paris");
        }

        [Fact]
        public async Task GetPopularDestinations_EmptyDatabase_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetPopularDestinations();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as List<PopularDestination>;
            list.Should().BeEmpty();
        }

        #endregion

        #region GetPopularDestinationById Tests

        [Fact]
        public async Task GetPopularDestinationById_ExistingId_ReturnsOkWithDestination()
        {
            // Arrange
            using var db = CreateDbContext();
            var dest = new PopularDestination { Id = 3, Title = "Tokyo", Category = "Asia" };
            db.PopularDestinations.Add(dest);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetPopularDestinationById(3);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var item = okResult.Value as PopularDestination;
            item.Should().NotBeNull();
            item.Id.Should().Be(3);
            item.Title.Should().Be("Tokyo");
        }

        [Fact]
        public async Task GetPopularDestinationById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetPopularDestinationById(999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Popular destination not found.");
        }

        #endregion

        #region CreatePopularDestination Tests

        [Fact]
        public async Task CreatePopularDestination_HappyPath_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new PopularDestinationRequestDto
            {
                Title = "  New York  ",
                SubTitle = "  The Big Apple  ",
                Category = "  US  ",
                ImageUrl = "  http://ny.jpg  ",
                Placement = "  Featured  ",
                Url = "  http://ny.com  ",
                Status = "  Active  "
            };

            // Act
            var result = await controller.CreatePopularDestination(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var row = createdResult.Value as PopularDestination;
            row.Should().NotBeNull();
            row.Title.Should().Be("New York");
            row.SubTitle.Should().Be("The Big Apple");
            row.Category.Should().Be("US");
            row.ImageUrl.Should().Be("http://ny.jpg");
            row.Placement.Should().Be("Featured");
            row.Url.Should().Be("http://ny.com");
            row.Status.Should().Be("Active");

            // Verify database
            var dbRow = await db.PopularDestinations.FindAsync(row.Id);
            dbRow.Should().NotBeNull();
            dbRow.Title.Should().Be("New York");
        }

        [Fact]
        public async Task CreatePopularDestination_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.CreatePopularDestination(null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Request body is required.");
        }

        [Fact]
        public async Task CreatePopularDestination_NullTitle_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new PopularDestinationRequestDto { Title = null, Category = "Asia" };

            // Act
            var result = await controller.CreatePopularDestination(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Title is required.");
        }

        [Fact]
        public async Task CreatePopularDestination_NullCategory_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new PopularDestinationRequestDto { Title = "Tokyo", Category = null };

            // Act
            var result = await controller.CreatePopularDestination(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Category is required.");
        }

        [Fact]
        public async Task CreatePopularDestination_NullSubTitle_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new PopularDestinationRequestDto { Title = "Tokyo", Category = "Asia", SubTitle = null };

            // Act
            var result = await controller.CreatePopularDestination(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("SubTitle is required.");
        }

        #endregion

        #region UpdatePopularDestination Tests

        [Fact]
        public async Task UpdatePopularDestination_HappyPath_ReturnsOkAndUpdates()
        {
            // Arrange
            using var db = CreateDbContext();
            var dest = new PopularDestination { Id = 10, Title = "Paris", Category = "Europe", SubTitle = "City of Lights" };
            db.PopularDestinations.Add(dest);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);
            var dto = new PopularDestinationRequestDto
            {
                Title = "  Paris Updated  ",
                SubTitle = "  City of Romance  ",
                Category = "  France  ",
                ImageUrl = "  http://paris.jpg  ",
                Placement = "  Main  ",
                Url = "  http://paris.com  ",
                Status = "  Inactive  "
            };

            // Act
            var result = await controller.UpdatePopularDestination(10, dto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var updated = okResult.Value as PopularDestination;
            updated.Should().NotBeNull();
            updated.Id.Should().Be(10);
            updated.Title.Should().Be("Paris Updated");
            updated.SubTitle.Should().Be("City of Romance");
            updated.Category.Should().Be("France");
            updated.ImageUrl.Should().Be("http://paris.jpg");
            updated.Placement.Should().Be("Main");
            updated.Url.Should().Be("http://paris.com");
            updated.Status.Should().Be("Inactive");

            // Verify db
            var dbRow = await db.PopularDestinations.FindAsync(10);
            dbRow.Title.Should().Be("Paris Updated");
        }

        [Fact]
        public async Task UpdatePopularDestination_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new PopularDestinationRequestDto { Title = "London", Category = "Europe", SubTitle = "UK" };

            // Act
            var result = await controller.UpdatePopularDestination(999, dto);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Popular destination not found.");
        }

        [Fact]
        public async Task UpdatePopularDestination_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.PopularDestinations.Add(new PopularDestination { Id = 1, Title = "Paris", Category = "Europe" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.UpdatePopularDestination(1, null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Request body is required.");
        }

        [Fact]
        public async Task UpdatePopularDestination_NullTitle_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.PopularDestinations.Add(new PopularDestination { Id = 1, Title = "Paris", Category = "Europe" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);
            var dto = new PopularDestinationRequestDto { Title = null, Category = "Europe", SubTitle = "Lights" };

            // Act
            var result = await controller.UpdatePopularDestination(1, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Title is required.");
        }

        [Fact]
        public async Task UpdatePopularDestination_NullCategory_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.PopularDestinations.Add(new PopularDestination { Id = 1, Title = "Paris", Category = "Europe" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);
            var dto = new PopularDestinationRequestDto { Title = "Paris", Category = null, SubTitle = "Lights" };

            // Act
            var result = await controller.UpdatePopularDestination(1, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Category is required.");
        }

        #endregion

        #region DeletePopularDestination Tests

        [Fact]
        public async Task DeletePopularDestination_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            var dest = new PopularDestination { Id = 5, Title = "Rome", Category = "Europe" };
            db.PopularDestinations.Add(dest);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeletePopularDestination(5);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var val = okResult.Value;
            var prop = val.GetType().GetProperty("message");
            prop.GetValue(val).Should().Be("Popular destination deleted.");

            // Verify db
            var dbRow = await db.PopularDestinations.FindAsync(5);
            dbRow.Should().BeNull();
        }

        [Fact]
        public async Task DeletePopularDestination_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeletePopularDestination(999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Popular destination not found.");
        }

        [Fact]
        public async Task CreatePopularDestination_TitleTooLong_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new PopularDestinationRequestDto
            {
                Title = new string('A', 121),
                SubTitle = "SubTitle",
                Category = "Category"
            };

            // Act
            var result = await controller.CreatePopularDestination(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Title cannot exceed 120 characters.");
        }

        [Fact]
        public async Task UpdatePopularDestination_SubTitleTooLong_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.PopularDestinations.Add(new PopularDestination { Id = 1, Title = "Paris", Category = "Europe" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);
            var dto = new PopularDestinationRequestDto
            {
                Title = "Paris",
                SubTitle = new string('B', 181),
                Category = "Europe"
            };

            // Act
            var result = await controller.UpdatePopularDestination(1, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("SubTitle cannot exceed 180 characters.");
        }

        #endregion
    }
}
