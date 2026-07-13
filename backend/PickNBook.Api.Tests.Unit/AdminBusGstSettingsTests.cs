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
    public class AdminBusGstSettingsTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        #region GetGstSettings Tests

        [Fact]
        public async Task GetGstSettings_HappyPath_ReturnsOkWithGstSettingsOrderedByUpdateDateUtcDesc()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            var setting1 = new BusGstSetting
            {
                Id = 1,
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active",
                EntryDateUtc = now.AddDays(-2),
                UpdateDateUtc = now.AddDays(-2)
            };
            var setting2 = new BusGstSetting
            {
                Id = 2,
                GstCategory = "Luxury",
                GstPercent = 28,
                Status = "Active",
                EntryDateUtc = now.AddDays(-1),
                UpdateDateUtc = now.AddDays(-1)
            };
            db.BusGstSettings.AddRange(setting1, setting2);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetGstSettings();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = (okResult.Value as IEnumerable<BusGstSetting>).ToList();
            list.Should().HaveCount(2);
            list[0].Id.Should().Be(2); // ordered descending by UpdateDateUtc
            list[1].Id.Should().Be(1);
        }

        [Fact]
        public async Task GetGstSettings_NoGstSettings_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetGstSettings();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as IEnumerable<BusGstSetting>;
            list.Should().BeEmpty();
        }

        #endregion

        #region GetGstSettingById Tests

        [Fact]
        public async Task GetGstSettingById_ExistingId_ReturnsOkWithGstSetting()
        {
            // Arrange
            using var db = CreateDbContext();
            var setting = new BusGstSetting
            {
                Id = 1,
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active"
            };
            db.BusGstSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetGstSettingById(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedSetting = okResult.Value.Should().BeOfType<BusGstSetting>().Subject;
            returnedSetting.Id.Should().Be(1);
            returnedSetting.GstCategory.Should().Be("Standard");
        }

        [Fact]
        public async Task GetGstSettingById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetGstSettingById(999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("GST setting not found.");
        }

        #endregion

        #region CreateGstSetting Tests

        [Fact]
        public async Task CreateGstSetting_HappyPath_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusGstRequestDto
            {
                GstCategory = " Standard ",
                GstPercent = 18,
                Status = " Active ",
                UpdatedBy = " admin ",
                Remark = " Test Remark "
            };

            // Action
            var result = await controller.CreateGstSetting(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var createdSetting = createdResult.Value.Should().BeOfType<BusGstSetting>().Subject;
            createdSetting.Id.Should().BeGreaterThan(0);
            createdSetting.GstCategory.Should().Be("Standard"); // Trimmed
            createdSetting.GstPercent.Should().Be(18);
            createdSetting.Status.Should().Be("Active"); // Trimmed
            createdSetting.UpdatedBy.Should().Be("admin"); // Trimmed
            createdSetting.Remark.Should().Be("Test Remark"); // Trimmed
            createdSetting.EntryDateUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
            createdSetting.UpdateDateUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

            // Verify in DB
            var dbSetting = await db.BusGstSettings.FindAsync(createdSetting.Id);
            dbSetting.Should().NotBeNull();
            dbSetting.GstCategory.Should().Be("Standard");
        }

        [Fact]
        public async Task CreateGstSetting_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.CreateGstSetting(null);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("Request payload is required.");
        }

        [Fact]
        public async Task CreateGstSetting_NullFields_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusGstRequestDto
            {
                GstCategory = null,
                GstPercent = 18,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Action
            var result = await controller.CreateGstSetting(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("GstCategory is required.");
        }

        [Fact]
        public async Task CreateGstSetting_EmptyStrings_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusGstRequestDto
            {
                GstCategory = "",
                GstPercent = 18,
                Status = "",
                UpdatedBy = "",
                Remark = ""
            };

            // Action
            var result = await controller.CreateGstSetting(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("GstCategory is required.");
        }

        [Fact]
        public async Task CreateGstSetting_ValueNegative_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusGstRequestDto
            {
                GstCategory = "Standard",
                GstPercent = -5,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Action
            var result = await controller.CreateGstSetting(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("GstPercent must be greater than 0.");
        }

        #endregion

        #region UpdateGstSetting Tests

        [Fact]
        public async Task UpdateGstSetting_ExistingId_ReturnsOkAndUpdates()
        {
            // Arrange
            using var db = CreateDbContext();
            var setting = new BusGstSetting
            {
                Id = 5,
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active",
                EntryDateUtc = DateTime.UtcNow.AddDays(-1),
                UpdateDateUtc = DateTime.UtcNow.AddDays(-1),
                UpdatedBy = "prev_admin"
            };
            db.BusGstSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new BusGstRequestDto
            {
                GstCategory = " Luxury ",
                GstPercent = 28,
                Status = " Inactive ",
                UpdatedBy = " new_admin ",
                Remark = " Updated remark "
            };

            // Action
            var result = await controller.UpdateGstSetting(5, request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var updatedSetting = okResult.Value.Should().BeOfType<BusGstSetting>().Subject;
            updatedSetting.GstCategory.Should().Be("Luxury");
            updatedSetting.GstPercent.Should().Be(28);
            updatedSetting.Status.Should().Be("Inactive");
            updatedSetting.UpdatedBy.Should().Be("new_admin");
            updatedSetting.Remark.Should().Be("Updated remark");
            updatedSetting.UpdateDateUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

            // Verify in DB
            var dbSetting = await db.BusGstSettings.FindAsync(5);
            dbSetting.GstCategory.Should().Be("Luxury");
            dbSetting.GstPercent.Should().Be(28);
        }

        [Fact]
        public async Task UpdateGstSetting_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusGstRequestDto
            {
                GstCategory = "Luxury",
                GstPercent = 28,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Action
            var result = await controller.UpdateGstSetting(999, request);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("GST setting not found.");
        }

        [Fact]
        public async Task UpdateGstSetting_NullFields_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var setting = new BusGstSetting
            {
                Id = 1,
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active"
            };
            db.BusGstSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new BusGstRequestDto
            {
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active",
                UpdatedBy = null
            };

            // Action
            var result = await controller.UpdateGstSetting(1, request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("UpdatedBy is required.");
        }

        #endregion

        #region DeleteGstSetting Tests

        [Fact]
        public async Task DeleteGstSetting_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            var setting = new BusGstSetting
            {
                Id = 10,
                GstCategory = "Standard",
                GstPercent = 18,
                Status = "Active"
            };
            db.BusGstSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.DeleteGstSetting(10);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();

            // Verify in DB
            var dbSetting = await db.BusGstSettings.FindAsync(10);
            dbSetting.Should().BeNull();
        }

        [Fact]
        public async Task DeleteGstSetting_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.DeleteGstSetting(999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("GST setting not found.");
        }

        #endregion
    }
}
