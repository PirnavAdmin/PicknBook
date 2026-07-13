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
    public class AdminFlightAirlineWebcheckTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        #region GetAirlineWebcheckLinks Tests

        [Fact]
        public async Task GetAirlineWebcheckLinks_HappyPath_ReturnsOkWithLinksSorted()
        {
            // Arrange
            using var db = CreateDbContext();
            db.AirlineWebcheckLinks.AddRange(
                new AirlineWebcheckLink { Id = 1, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" },
                new AirlineWebcheckLink { Id = 2, Airline = "AirIndia", AirlineCode = "AI", Url = "http://ai" }
            );
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetAirlineWebcheckLinks();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as List<AirlineWebcheckLink>;
            list.Should().NotBeNull();
            list.Should().HaveCount(2);
            list[0].Airline.Should().Be("AirIndia"); // Sorted alphabetically
            list[1].Airline.Should().Be("Indigo");
        }

        [Fact]
        public async Task GetAirlineWebcheckLinks_EmptyDatabase_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetAirlineWebcheckLinks();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as List<AirlineWebcheckLink>;
            list.Should().BeEmpty();
        }

        #endregion

        #region GetAirlineWebcheckLinkById Tests

        [Fact]
        public async Task GetAirlineWebcheckLinkById_ExistingId_ReturnsOkWithLink()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new AirlineWebcheckLink { Id = 5, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" };
            db.AirlineWebcheckLinks.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetAirlineWebcheckLinkById(5);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var item = okResult.Value as AirlineWebcheckLink;
            item.Should().NotBeNull();
            item.Id.Should().Be(5);
            item.Airline.Should().Be("Indigo");
        }

        [Fact]
        public async Task GetAirlineWebcheckLinkById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetAirlineWebcheckLinkById(999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Webcheck link not found.");
        }

        #endregion

        #region CreateAirlineWebcheckLink Tests

        [Fact]
        public async Task CreateAirlineWebcheckLink_HappyPath_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto
            {
                Airline = "  Indigo  ",
                AirlineCode = "  6e  ",
                Url = "  http://6e.com  "
            };

            // Act
            var result = await controller.CreateAirlineWebcheckLink(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var row = createdResult.Value as AirlineWebcheckLink;
            row.Should().NotBeNull();
            row.Airline.Should().Be("Indigo");
            row.AirlineCode.Should().Be("6E");
            row.Url.Should().Be("http://6e.com");

            // Verify db
            var dbRow = await db.AirlineWebcheckLinks.FindAsync(row.Id);
            dbRow.Should().NotBeNull();
            dbRow.Airline.Should().Be("Indigo");
        }

        [Fact]
        public async Task CreateAirlineWebcheckLink_EmptyAirline_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto1 = new AirlineWebcheckLinkRequestDto { Airline = "", AirlineCode = "6E", Url = "http://6e" };
            var dto2 = new AirlineWebcheckLinkRequestDto { Airline = "   ", AirlineCode = "6E", Url = "http://6e" };
            var dto3 = new AirlineWebcheckLinkRequestDto { Airline = null, AirlineCode = "6E", Url = "http://6e" };

            // Act
            var res1 = await controller.CreateAirlineWebcheckLink(dto1);
            var res2 = await controller.CreateAirlineWebcheckLink(dto2);
            var res3 = await controller.CreateAirlineWebcheckLink(dto3);

            // Assert
            res1.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("Airline, AirlineCode and Url are required.");
            res2.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("Airline, AirlineCode and Url are required.");
            res3.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("Airline, AirlineCode and Url are required.");
        }

        [Fact]
        public async Task CreateAirlineWebcheckLink_EmptyAirlineCode_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto1 = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = "", Url = "http://6e" };
            var dto2 = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = "   ", Url = "http://6e" };
            var dto3 = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = null, Url = "http://6e" };

            // Act
            var res1 = await controller.CreateAirlineWebcheckLink(dto1);
            var res2 = await controller.CreateAirlineWebcheckLink(dto2);
            var res3 = await controller.CreateAirlineWebcheckLink(dto3);

            // Assert
            res1.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("Airline, AirlineCode and Url are required.");
            res2.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("Airline, AirlineCode and Url are required.");
            res3.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("Airline, AirlineCode and Url are required.");
        }

        [Fact]
        public async Task CreateAirlineWebcheckLink_EmptyUrl_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto1 = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = "6E", Url = "" };
            var dto2 = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = "6E", Url = "   " };
            var dto3 = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = "6E", Url = null };

            // Act
            var res1 = await controller.CreateAirlineWebcheckLink(dto1);
            var res2 = await controller.CreateAirlineWebcheckLink(dto2);
            var res3 = await controller.CreateAirlineWebcheckLink(dto3);

            // Assert
            res1.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("Airline, AirlineCode and Url are required.");
            res2.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("Airline, AirlineCode and Url are required.");
            res3.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("Airline, AirlineCode and Url are required.");
        }

        [Fact]
        public async Task CreateAirlineWebcheckLink_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.CreateAirlineWebcheckLink(null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Request body is required.");
        }

        #endregion

        #region UpdateAirlineWebcheckLink Tests

        [Fact]
        public async Task UpdateAirlineWebcheckLink_HappyPath_ReturnsOkAndUpdates()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new AirlineWebcheckLink { Id = 5, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" };
            db.AirlineWebcheckLinks.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto
            {
                Airline = "  AirIndia  ",
                AirlineCode = "  ai  ",
                Url = "  http://ai.com  "
            };

            // Act
            var result = await controller.UpdateAirlineWebcheckLink(5, dto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var updated = okResult.Value as AirlineWebcheckLink;
            updated.Should().NotBeNull();
            updated.Id.Should().Be(5);
            updated.Airline.Should().Be("AirIndia");
            updated.AirlineCode.Should().Be("AI");
            updated.Url.Should().Be("http://ai.com");

            // Verify db
            var dbRow = await db.AirlineWebcheckLinks.FindAsync(5);
            dbRow.Airline.Should().Be("AirIndia");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto { Airline = "AI", AirlineCode = "AI", Url = "http://ai" };

            // Act
            var result = await controller.UpdateAirlineWebcheckLink(999, dto);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Webcheck link not found.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new AirlineWebcheckLink { Id = 5, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" };
            db.AirlineWebcheckLinks.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.UpdateAirlineWebcheckLink(5, null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Request body is required.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_NullAirline_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new AirlineWebcheckLink { Id = 5, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" };
            db.AirlineWebcheckLinks.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto { Airline = null, AirlineCode = "AI", Url = "http://ai" };

            // Act
            var result = await controller.UpdateAirlineWebcheckLink(5, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Airline, AirlineCode and Url are required.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_NullAirlineCode_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new AirlineWebcheckLink { Id = 5, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" };
            db.AirlineWebcheckLinks.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto { Airline = "AirIndia", AirlineCode = null, Url = "http://ai" };

            // Act
            var result = await controller.UpdateAirlineWebcheckLink(5, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Airline, AirlineCode and Url are required.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_NullUrl_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new AirlineWebcheckLink { Id = 5, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" };
            db.AirlineWebcheckLinks.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto { Airline = "AirIndia", AirlineCode = "AI", Url = null };

            // Act
            var result = await controller.UpdateAirlineWebcheckLink(5, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Airline, AirlineCode and Url are required.");
        }

        #endregion

        #region DeleteAirlineWebcheckLink Tests

        [Fact]
        public async Task DeleteAirlineWebcheckLink_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new AirlineWebcheckLink { Id = 5, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e" };
            db.AirlineWebcheckLinks.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteAirlineWebcheckLink(5);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var val = okResult.Value;
            var prop = val.GetType().GetProperty("message");
            prop.GetValue(val).Should().Be("Webcheck link deleted.");

            // Verify db
            var dbRow = await db.AirlineWebcheckLinks.FindAsync(5);
            dbRow.Should().BeNull();
        }

        [Fact]
        public async Task DeleteAirlineWebcheckLink_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteAirlineWebcheckLink(999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Webcheck link not found.");
        }

        #endregion

        #region Validation and Duplicate Tests

        [Fact]
        public async Task CreateAirlineWebcheckLink_DuplicateAirlineCode_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.AirlineWebcheckLinks.Add(new AirlineWebcheckLink { Airline = "Indigo", AirlineCode = "6E", Url = "http://6e.com" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto { Airline = "Different", AirlineCode = "6e", Url = "http://6e.com" };

            // Act
            var result = await controller.CreateAirlineWebcheckLink(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Webcheck link for airline code '6E' already exists.");
        }

        [Fact]
        public async Task CreateAirlineWebcheckLink_AirlineNameTooLong_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto
            {
                Airline = new string('A', 121),
                AirlineCode = "AI",
                Url = "http://ai.com"
            };

            // Act
            var result = await controller.CreateAirlineWebcheckLink(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Airline name cannot exceed 120 characters.");
        }

        [Fact]
        public async Task CreateAirlineWebcheckLink_AirlineCodeTooLong_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto
            {
                Airline = "AirIndia",
                AirlineCode = new string('C', 11),
                Url = "http://ai.com"
            };

            // Act
            var result = await controller.CreateAirlineWebcheckLink(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("AirlineCode cannot exceed 10 characters.");
        }

        [Fact]
        public async Task CreateAirlineWebcheckLink_UrlTooLong_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto
            {
                Airline = "AirIndia",
                AirlineCode = "AI",
                Url = "http://ai.com/" + new string('x', 500)
            };

            // Act
            var result = await controller.CreateAirlineWebcheckLink(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Url cannot exceed 500 characters.");
        }

        [Fact]
        public async Task CreateAirlineWebcheckLink_InvalidUrlFormat_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto { Airline = "AirIndia", AirlineCode = "AI", Url = "not-a-valid-url" };

            // Act
            var result = await controller.CreateAirlineWebcheckLink(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Url must be a valid HTTP or HTTPS URL.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_DuplicateAirlineCode_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.AirlineWebcheckLinks.AddRange(
                new AirlineWebcheckLink { Id = 1, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e.com" },
                new AirlineWebcheckLink { Id = 2, Airline = "AirIndia", AirlineCode = "AI", Url = "http://ai.com" }
            );
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto { Airline = "Indigo Updated", AirlineCode = "AI", Url = "http://ai.com" };

            // Act
            var result = await controller.UpdateAirlineWebcheckLink(1, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Webcheck link for airline code 'AI' already exists.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_AirlineNameTooLong_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.AirlineWebcheckLinks.Add(new AirlineWebcheckLink { Id = 1, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e.com" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto { Airline = new string('A', 121), AirlineCode = "6E", Url = "http://6e.com" };

            // Act
            var result = await controller.UpdateAirlineWebcheckLink(1, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Airline name cannot exceed 120 characters.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_AirlineCodeTooLong_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.AirlineWebcheckLinks.Add(new AirlineWebcheckLink { Id = 1, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e.com" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = new string('C', 11), Url = "http://6e.com" };

            // Act
            var result = await controller.UpdateAirlineWebcheckLink(1, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("AirlineCode cannot exceed 10 characters.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_UrlTooLong_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.AirlineWebcheckLinks.Add(new AirlineWebcheckLink { Id = 1, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e.com" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = "6E", Url = "http://6e.com/" + new string('x', 500) };

            // Act
            var result = await controller.UpdateAirlineWebcheckLink(1, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Url cannot exceed 500 characters.");
        }

        [Fact]
        public async Task UpdateAirlineWebcheckLink_InvalidUrlFormat_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.AirlineWebcheckLinks.Add(new AirlineWebcheckLink { Id = 1, Airline = "Indigo", AirlineCode = "6E", Url = "http://6e.com" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);
            var dto = new AirlineWebcheckLinkRequestDto { Airline = "Indigo", AirlineCode = "6E", Url = "not-a-valid-url" };

            // Act
            var result = await controller.UpdateAirlineWebcheckLink(1, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Url must be a valid HTTP or HTTPS URL.");
        }

        #endregion
    }
}
