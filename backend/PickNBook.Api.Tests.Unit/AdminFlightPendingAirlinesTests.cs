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
    public class AdminFlightPendingAirlinesTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        #region GetPendingAirlines Tests

        [Fact]
        public async Task GetPendingAirlines_HappyPath_ReturnsOkWithPendingAirlinesSorted()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.PendingAirlines.AddRange(
                new PendingAirline
                {
                    Id = 1,
                    AirlineCode = "6E",
                    FareType = "Corporate",
                    UpdatedBy = "user1",
                    UpdatedOnUtc = now.AddMinutes(-5)
                },
                new PendingAirline
                {
                    Id = 2,
                    AirlineCode = "AI",
                    FareType = "Refundable",
                    UpdatedBy = "user2",
                    UpdatedOnUtc = now // newer
                }
            );
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetPendingAirlines();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as List<PendingAirline>;
            list.Should().NotBeNull();
            list.Should().HaveCount(2);
            list[0].Id.Should().Be(2); // AI is newer
            list[1].Id.Should().Be(1);
        }

        [Fact]
        public async Task GetPendingAirlines_EmptyDatabase_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetPendingAirlines();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as List<PendingAirline>;
            list.Should().BeEmpty();
        }

        #endregion

        #region GetPendingAirlineById Tests

        [Fact]
        public async Task GetPendingAirlineById_ExistingId_ReturnsOkWithPendingAirline()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new PendingAirline
            {
                Id = 10,
                AirlineCode = "6E",
                FareType = "Corporate",
                UpdatedOnUtc = DateTime.UtcNow
            };
            db.PendingAirlines.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetPendingAirlineById(10);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var item = okResult.Value as PendingAirline;
            item.Should().NotBeNull();
            item.Id.Should().Be(10);
            item.AirlineCode.Should().Be("6E");
        }

        [Fact]
        public async Task GetPendingAirlineById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetPendingAirlineById(999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Pending airline not found.");
        }

        #endregion

        #region CreatePendingAirline Tests

        [Fact]
        public async Task CreatePendingAirline_HappyPath_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new PendingAirlineRequestDto
            {
                AirlineCode = "  6e  ",
                FareType = "  Corporate  ",
                UpdatedBy = "  admin_user  ",
                Remark = "  Some test remark  "
            };

            // Act
            var result = await controller.CreatePendingAirline(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var row = createdResult.Value as PendingAirline;
            row.Should().NotBeNull();
            row.AirlineCode.Should().Be("6E"); // Uppercased and trimmed
            row.FareType.Should().Be("Corporate"); // Trimmed
            row.UpdatedBy.Should().Be("admin_user"); // Trimmed
            row.Remark.Should().Be("Some test remark"); // Trimmed
            row.UpdatedOnUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

            // Verify in db
            var dbRow = await db.PendingAirlines.FindAsync(row.Id);
            dbRow.Should().NotBeNull();
            dbRow.AirlineCode.Should().Be("6E");
        }

        [Fact]
        public async Task CreatePendingAirline_EmptyAirlineCode_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto1 = new PendingAirlineRequestDto { AirlineCode = "", FareType = "Corp" };
            var dto2 = new PendingAirlineRequestDto { AirlineCode = "   ", FareType = "Corp" };
            var dto3 = new PendingAirlineRequestDto { AirlineCode = null, FareType = "Corp" };

            // Act
            var res1 = await controller.CreatePendingAirline(dto1);
            var res2 = await controller.CreatePendingAirline(dto2);
            var res3 = await controller.CreatePendingAirline(dto3);

            // Assert
            res1.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("AirlineCode and FareType are required.");
            res2.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("AirlineCode and FareType are required.");
            res3.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("AirlineCode and FareType are required.");
        }

        [Fact]
        public async Task CreatePendingAirline_EmptyFareType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto1 = new PendingAirlineRequestDto { AirlineCode = "6E", FareType = "" };
            var dto2 = new PendingAirlineRequestDto { AirlineCode = "6E", FareType = "   " };
            var dto3 = new PendingAirlineRequestDto { AirlineCode = "6E", FareType = null };

            // Act
            var res1 = await controller.CreatePendingAirline(dto1);
            var res2 = await controller.CreatePendingAirline(dto2);
            var res3 = await controller.CreatePendingAirline(dto3);

            // Assert
            res1.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("AirlineCode and FareType are required.");
            res2.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("AirlineCode and FareType are required.");
            res3.Should().BeOfType<BadRequestObjectResult>().Subject.Value.Should().Be("AirlineCode and FareType are required.");
        }

        [Fact]
        public async Task CreatePendingAirline_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.CreatePendingAirline(null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Request body is required.");
        }

        #endregion

        #region UpdatePendingAirline Tests

        [Fact]
        public async Task UpdatePendingAirline_HappyPath_ReturnsOkAndUpdates()
        {
            // Arrange
            using var db = CreateDbContext();
            var origTime = DateTime.UtcNow.AddHours(-1);
            var row = new PendingAirline
            {
                Id = 10,
                AirlineCode = "6E",
                FareType = "Corporate",
                UpdatedBy = "system",
                UpdatedOnUtc = origTime,
                Remark = "OldRemark"
            };
            db.PendingAirlines.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);
            var dto = new PendingAirlineRequestDto
            {
                AirlineCode = "  ai  ",
                FareType = "  Refundable  ",
                UpdatedBy = "  user2  ",
                Remark = "  NewRemark  "
            };

            // Act
            var result = await controller.UpdatePendingAirline(10, dto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var updated = okResult.Value as PendingAirline;
            updated.Should().NotBeNull();
            updated.Id.Should().Be(10);
            updated.AirlineCode.Should().Be("AI");
            updated.FareType.Should().Be("Refundable");
            updated.UpdatedBy.Should().Be("user2");
            updated.Remark.Should().Be("NewRemark");
            updated.UpdatedOnUtc.Should().BeAfter(origTime);

            // Verify db
            var dbRow = await db.PendingAirlines.FindAsync(10);
            dbRow.AirlineCode.Should().Be("AI");
        }

        [Fact]
        public async Task UpdatePendingAirline_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new PendingAirlineRequestDto { AirlineCode = "6E", FareType = "Corp" };

            // Act
            var result = await controller.UpdatePendingAirline(999, dto);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Pending airline not found.");
        }

        [Fact]
        public async Task UpdatePendingAirline_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new PendingAirline { Id = 10, AirlineCode = "6E", FareType = "Corp" };
            db.PendingAirlines.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.UpdatePendingAirline(10, null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Request body is required.");
        }

        [Fact]
        public async Task UpdatePendingAirline_NullAirlineCode_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new PendingAirline { Id = 10, AirlineCode = "6E", FareType = "Corp" };
            db.PendingAirlines.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);
            var dto = new PendingAirlineRequestDto { AirlineCode = null, FareType = "Corp" };

            // Act
            var result = await controller.UpdatePendingAirline(10, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("AirlineCode and FareType are required.");
        }

        [Fact]
        public async Task UpdatePendingAirline_NullFareType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new PendingAirline { Id = 10, AirlineCode = "6E", FareType = "Corp" };
            db.PendingAirlines.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);
            var dto = new PendingAirlineRequestDto { AirlineCode = "6E", FareType = null };

            // Act
            var result = await controller.UpdatePendingAirline(10, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("AirlineCode and FareType are required.");
        }

        #endregion

        #region DeletePendingAirline Tests

        [Fact]
        public async Task DeletePendingAirline_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new PendingAirline { Id = 10, AirlineCode = "6E", FareType = "Corp" };
            db.PendingAirlines.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeletePendingAirline(10);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var val = okResult.Value;
            var prop = val.GetType().GetProperty("message");
            prop.GetValue(val).Should().Be("Pending airline deleted.");

            // Verify db
            var dbRow = await db.PendingAirlines.FindAsync(10);
            dbRow.Should().BeNull();
        }

        [Fact]
        public async Task DeletePendingAirline_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeletePendingAirline(999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Pending airline not found.");
        }

        #endregion
    }
}
