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
    public class AdminBusMarkupSettingsTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        #region GetMarkupSettings Tests

        [Fact]
        public async Task GetMarkupSettings_HappyPath_ReturnsOkWithMarkupSettingsOrderedByUpdateDateUtcDesc()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            var setting1 = new BusMarkupSetting
            {
                Id = 1,
                SeatType = "Sleeper",
                Value = 100,
                MarkupType = "Fixed",
                Status = "Active",
                EntryDateUtc = now.AddDays(-2),
                UpdateDateUtc = now.AddDays(-2)
            };
            var setting2 = new BusMarkupSetting
            {
                Id = 2,
                SeatType = "Seater",
                Value = 50,
                MarkupType = "Percentage",
                Status = "Active",
                EntryDateUtc = now.AddDays(-1),
                UpdateDateUtc = now.AddDays(-1)
            };
            db.BusMarkupSettings.AddRange(setting1, setting2);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetMarkupSettings();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = (okResult.Value as IEnumerable<BusMarkupSetting>).ToList();
            list.Should().HaveCount(2);
            list[0].Id.Should().Be(2); // ordered descending by UpdateDateUtc
            list[1].Id.Should().Be(1);
        }

        [Fact]
        public async Task GetMarkupSettings_NoMarkupSettings_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetMarkupSettings();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as IEnumerable<BusMarkupSetting>;
            list.Should().BeEmpty();
        }

        #endregion

        #region GetMarkupSettingById Tests

        [Fact]
        public async Task GetMarkupSettingById_ExistingId_ReturnsOkWithMarkupSetting()
        {
            // Arrange
            using var db = CreateDbContext();
            var setting = new BusMarkupSetting
            {
                Id = 1,
                SeatType = "Sleeper",
                Value = 100,
                MarkupType = "Fixed",
                Status = "Active"
            };
            db.BusMarkupSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetMarkupSettingById(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedSetting = okResult.Value.Should().BeOfType<BusMarkupSetting>().Subject;
            returnedSetting.Id.Should().Be(1);
            returnedSetting.SeatType.Should().Be("Sleeper");
        }

        [Fact]
        public async Task GetMarkupSettingById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetMarkupSettingById(999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Markup setting not found.");
        }

        #endregion

        #region CreateMarkupSetting Tests

        [Fact]
        public async Task CreateMarkupSetting_HappyPath_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusMarkupRequestDto
            {
                SeatType = " AC Sleeper  ",
                Value = 120,
                MarkupType = " Fixed ",
                Status = " Active ",
                UpdatedBy = " admin ",
                Remark = " New setting "
            };

            // Action
            var result = await controller.CreateMarkupSetting(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var createdSetting = createdResult.Value.Should().BeOfType<BusMarkupSetting>().Subject;
            createdSetting.Id.Should().BeGreaterThan(0);
            createdSetting.SeatType.Should().Be("AC Sleeper"); // Trimmed
            createdSetting.MarkupType.Should().Be("Fixed"); // Trimmed
            createdSetting.Status.Should().Be("Active"); // Trimmed
            createdSetting.UpdatedBy.Should().Be("admin"); // Trimmed
            createdSetting.Remark.Should().Be("New setting"); // Trimmed
            createdSetting.EntryDateUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
            createdSetting.UpdateDateUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

            // Verify in DB
            var dbSetting = await db.BusMarkupSettings.FindAsync(createdSetting.Id);
            dbSetting.Should().NotBeNull();
            dbSetting.SeatType.Should().Be("AC Sleeper");
        }

        [Fact]
        public async Task CreateMarkupSetting_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.CreateMarkupSetting(null);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("Request payload is required.");
        }

        [Fact]
        public async Task CreateMarkupSetting_NullFields_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusMarkupRequestDto
            {
                SeatType = null,
                Value = 10,
                MarkupType = "Fixed",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Action
            var result = await controller.CreateMarkupSetting(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("SeatType is required.");
        }

        [Fact]
        public async Task CreateMarkupSetting_EmptyStrings_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusMarkupRequestDto
            {
                SeatType = "",
                Value = 10,
                MarkupType = "",
                Status = "",
                UpdatedBy = "",
                Remark = ""
            };

            // Action
            var result = await controller.CreateMarkupSetting(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("SeatType is required.");
        }

        [Fact]
        public async Task CreateMarkupSetting_ValueNegative_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusMarkupRequestDto
            {
                SeatType = "Sleeper",
                Value = -10,
                MarkupType = "Fixed",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Action
            var result = await controller.CreateMarkupSetting(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("Value must be greater than 0.");
        }

        #endregion

        #region UpdateMarkupSetting Tests

        [Fact]
        public async Task UpdateMarkupSetting_ExistingId_ReturnsOkAndUpdates()
        {
            // Arrange
            using var db = CreateDbContext();
            var setting = new BusMarkupSetting
            {
                Id = 5,
                SeatType = "Sleeper",
                Value = 100,
                MarkupType = "Fixed",
                Status = "Active",
                EntryDateUtc = DateTime.UtcNow.AddDays(-1),
                UpdateDateUtc = DateTime.UtcNow.AddDays(-1),
                UpdatedBy = "prev_admin"
            };
            db.BusMarkupSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new BusMarkupRequestDto
            {
                SeatType = " Seater ",
                Value = 200,
                MarkupType = " Percentage ",
                Status = " Inactive ",
                UpdatedBy = " new_admin ",
                Remark = " Updated remark "
            };

            // Action
            var result = await controller.UpdateMarkupSetting(5, request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var updatedSetting = okResult.Value.Should().BeOfType<BusMarkupSetting>().Subject;
            updatedSetting.SeatType.Should().Be("Seater");
            updatedSetting.Value.Should().Be(200);
            updatedSetting.MarkupType.Should().Be("Percentage");
            updatedSetting.Status.Should().Be("Inactive");
            updatedSetting.UpdatedBy.Should().Be("new_admin");
            updatedSetting.Remark.Should().Be("Updated remark");
            updatedSetting.UpdateDateUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

            // Verify in DB
            var dbSetting = await db.BusMarkupSettings.FindAsync(5);
            dbSetting.SeatType.Should().Be("Seater");
            dbSetting.Value.Should().Be(200);
        }

        [Fact]
        public async Task UpdateMarkupSetting_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusMarkupRequestDto
            {
                SeatType = "Seater",
                Value = 10,
                MarkupType = "Percentage",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Action
            var result = await controller.UpdateMarkupSetting(999, request);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Markup setting not found.");
        }

        [Fact]
        public async Task UpdateMarkupSetting_NullFields_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var setting = new BusMarkupSetting
            {
                Id = 1,
                SeatType = "Sleeper",
                Value = 10,
                MarkupType = "Fixed",
                Status = "Active"
            };
            db.BusMarkupSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new BusMarkupRequestDto
            {
                SeatType = "Sleeper",
                Value = 20,
                MarkupType = null,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Action
            var result = await controller.UpdateMarkupSetting(1, request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("MarkupType is required.");
        }

        #endregion

        #region DeleteMarkupSetting Tests

        [Fact]
        public async Task DeleteMarkupSetting_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            var setting = new BusMarkupSetting
            {
                Id = 10,
                SeatType = "Sleeper",
                Value = 100,
                MarkupType = "Fixed",
                Status = "Active"
            };
            db.BusMarkupSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.DeleteMarkupSetting(10);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();

            // Verify in DB
            var dbSetting = await db.BusMarkupSettings.FindAsync(10);
            dbSetting.Should().BeNull();
        }

        [Fact]
        public async Task DeleteMarkupSetting_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.DeleteMarkupSetting(999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Markup setting not found.");
        }

        #endregion
    }
}
