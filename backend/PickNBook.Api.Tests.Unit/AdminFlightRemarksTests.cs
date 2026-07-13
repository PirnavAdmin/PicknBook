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
    public class AdminFlightRemarksTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        #region GetRemarks Tests

        [Fact]
        public async Task GetRemarks_HappyPath_ReturnsOkWithRemarksSortedByUpdateDateUtcDesc()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.FlightRemarks.AddRange(
                new FlightRemark
                {
                    Id = 1, SourceType = "Supplier", Remark = "Remark 1", Status = "Active", UpdateDateUtc = now.AddMinutes(-5), EntryDateUtc = now.AddMinutes(-5)
                },
                new FlightRemark
                {
                    Id = 2, SourceType = "Admin", Remark = "Remark 2", Status = "Active", UpdateDateUtc = now, EntryDateUtc = now
                }
            );
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetRemarks();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = okResult.Value as List<FlightRemark>;
            items.Should().NotBeNull();
            items.Should().HaveCount(2);
            // Id 2 should come first since it has a later UpdateDateUtc
            items[0].Id.Should().Be(2);
            items[1].Id.Should().Be(1);
        }

        [Fact]
        public async Task GetRemarks_NoRemarks_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetRemarks();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = okResult.Value as List<FlightRemark>;
            items.Should().BeEmpty();
        }

        #endregion

        #region GetRemarkById Tests

        [Fact]
        public async Task GetRemarkById_ExistingId_ReturnsOkWithRemark()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightRemarks.Add(new FlightRemark
            {
                Id = 5, SourceType = "Admin", Remark = "Test Remark", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetRemarkById(5);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var remark = okResult.Value as FlightRemark;
            remark.Should().NotBeNull();
            remark.Id.Should().Be(5);
            remark.SourceType.Should().Be("Admin");
            remark.Remark.Should().Be("Test Remark");
        }

        [Fact]
        public async Task GetRemarkById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetRemarkById(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Remark not found.");
        }

        #endregion

        #region CreateRemark Tests

        [Fact]
        public async Task CreateRemark_HappyPath_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new FlightRemarkRequestDto
            {
                SourceType = "  Supplier  ",
                Remark = "  New remark content  ",
                UpdatedBy = "  admin_user  ",
                Status = "  Inactive  "
            };

            // Act
            var result = await controller.CreateRemark(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var remark = createdResult.Value as FlightRemark;
            remark.Should().NotBeNull();
            remark.SourceType.Should().Be("Supplier"); // Trimmed
            remark.Remark.Should().Be("New remark content"); // Trimmed
            remark.UpdatedBy.Should().Be("admin_user"); // Trimmed
            remark.Status.Should().Be("Inactive"); // Trimmed

            // Verify in db
            var dbRow = await db.FlightRemarks.FindAsync(remark.Id);
            dbRow.Should().NotBeNull();
            dbRow.SourceType.Should().Be("Supplier");
            dbRow.Remark.Should().Be("New remark content");
        }

        [Fact]
        public async Task CreateRemark_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.CreateRemark(null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Request body is required.");
        }

        [Fact]
        public async Task CreateRemark_EmptySourceType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new FlightRemarkRequestDto
            {
                SourceType = "",
                Remark = "Testing remark"
            };

            // Act
            var result = await controller.CreateRemark(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("SourceType is required.");
        }

        [Fact]
        public async Task CreateRemark_EmptyRemark_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new FlightRemarkRequestDto
            {
                SourceType = "Admin",
                Remark = "   "
            };

            // Act
            var result = await controller.CreateRemark(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Remark is required.");
        }

        [Fact]
        public async Task CreateRemark_NormalizationOfFields_NormalizesStatusAndUpdatedBy()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new FlightRemarkRequestDto
            {
                SourceType = "Admin",
                Remark = "Remark text",
                UpdatedBy = null, // Should default to "system"
                Status = null // Should default to "Active"
            };

            // Act
            var result = await controller.CreateRemark(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var remark = createdResult.Value as FlightRemark;
            remark.UpdatedBy.Should().Be("system");
            remark.Status.Should().Be("Active");
        }

        #endregion

        #region UpdateRemark Tests

        [Fact]
        public async Task UpdateRemark_HappyPath_ReturnsOkAndUpdates()
        {
            // Arrange
            using var db = CreateDbContext();
            var originalTime = DateTime.UtcNow.AddHours(-1);
            var row = new FlightRemark
            {
                Id = 1, SourceType = "Admin", Remark = "Old Remark", Status = "Active", EntryDateUtc = originalTime, UpdateDateUtc = originalTime
            };
            db.FlightRemarks.Add(row);
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var dto = new FlightRemarkRequestDto
            {
                SourceType = "  Supplier  ",
                Remark = "  Updated Remark  ",
                UpdatedBy = "  mod_user  ",
                Status = "  Inactive  "
            };

            // Act
            var result = await controller.UpdateRemark(1, dto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var remark = okResult.Value as FlightRemark;
            remark.SourceType.Should().Be("Supplier");
            remark.Remark.Should().Be("Updated Remark");
            remark.UpdatedBy.Should().Be("mod_user");
            remark.Status.Should().Be("Inactive");
            remark.EntryDateUtc.Should().Be(originalTime); // entry date preserved
            remark.UpdateDateUtc.Should().BeAfter(originalTime);

            // Verify in db
            var dbRow = await db.FlightRemarks.FindAsync(1);
            dbRow.Remark.Should().Be("Updated Remark");
            dbRow.SourceType.Should().Be("Supplier");
            dbRow.Status.Should().Be("Inactive");
        }

        [Fact]
        public async Task UpdateRemark_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new FlightRemarkRequestDto
            {
                SourceType = "Admin", Remark = "New Remark"
            };

            // Act
            var result = await controller.UpdateRemark(999, dto);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Remark not found.");
        }

        [Fact]
        public async Task UpdateRemark_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightRemarks.Add(new FlightRemark { Id = 1, SourceType = "Admin", Remark = "Old" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.UpdateRemark(1, null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Request body is required.");
        }

        [Fact]
        public async Task UpdateRemark_EmptySourceType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightRemarks.Add(new FlightRemark { Id = 1, SourceType = "Admin", Remark = "Old" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);
            var dto = new FlightRemarkRequestDto
            {
                SourceType = "",
                Remark = "Testing remark"
            };

            // Act
            var result = await controller.UpdateRemark(1, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("SourceType is required.");
        }

        [Fact]
        public async Task UpdateRemark_EmptyRemark_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightRemarks.Add(new FlightRemark { Id = 1, SourceType = "Admin", Remark = "Old" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);
            var dto = new FlightRemarkRequestDto
            {
                SourceType = "Admin",
                Remark = "   "
            };

            // Act
            var result = await controller.UpdateRemark(1, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Remark is required.");
        }

        #endregion

        #region DeleteRemark Tests

        [Fact]
        public async Task DeleteRemark_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightRemarks.Add(new FlightRemark { Id = 1, SourceType = "Admin", Remark = "Remark" });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteRemark(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var value = okResult.Value;
            var messageProp = value.GetType().GetProperty("message");
            messageProp.GetValue(value).Should().Be("Remark deleted.");

            // Verify in db
            var dbRow = await db.FlightRemarks.FindAsync(1);
            dbRow.Should().BeNull();
        }

        [Fact]
        public async Task DeleteRemark_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteRemark(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Remark not found.");
        }

        #endregion
    }
}
