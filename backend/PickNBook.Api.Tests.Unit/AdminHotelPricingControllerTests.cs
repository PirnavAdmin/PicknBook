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
    public class AdminHotelPricingControllerTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        [Fact]
        public async Task GetAll_ReturnsOkWithList()
        {
            // Arrange
            using var db = CreateDbContext();
            var setting1 = new HotelPricingSetting
            {
                Id = 1,
                MarkupType = "Percentage",
                MarkupValue = 10,
                ConvenienceFeeType = "Flat",
                ConvenienceFeeValue = 250,
                GstPercent = 18,
                IsActive = false,
                UpdatedAtUtc = DateTime.UtcNow.AddDays(-2)
            };
            var setting2 = new HotelPricingSetting
            {
                Id = 2,
                MarkupType = "Flat",
                MarkupValue = 500,
                ConvenienceFeeType = "Flat",
                ConvenienceFeeValue = 200,
                GstPercent = 18,
                IsActive = true,
                UpdatedAtUtc = DateTime.UtcNow.AddDays(-1)
            };
            db.HotelPricingSettings.AddRange(setting1, setting2);
            await db.SaveChangesAsync();

            var controller = new AdminHotelPricingController(db);

            // Action
            var result = await controller.GetAll();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = (okResult.Value as IEnumerable<HotelPricingSettingResponseDto>).ToList();
            list.Should().HaveCount(2);
            list[0].Id.Should().Be(2); // Active setting should be ordered first
            list[0].IsActive.Should().BeTrue();
            list[1].Id.Should().Be(1);
            list[1].IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task GetById_ExistingId_ReturnsOk()
        {
            // Arrange
            using var db = CreateDbContext();
            var setting = new HotelPricingSetting
            {
                Id = 1,
                MarkupType = "Percentage",
                MarkupValue = 10,
                ConvenienceFeeType = "Flat",
                ConvenienceFeeValue = 250,
                GstPercent = 18,
                IsActive = true
            };
            db.HotelPricingSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = new AdminHotelPricingController(db);

            // Action
            var result = await controller.GetById(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value.Should().BeOfType<HotelPricingSettingResponseDto>().Subject;
            response.Id.Should().Be(1);
            response.MarkupValue.Should().Be(10);
            response.ConvenienceFeeValue.Should().Be(250);
        }

        [Fact]
        public async Task GetById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminHotelPricingController(db);

            // Action
            var result = await controller.GetById(99);

            // Assert
            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task Create_ActiveSetting_DeactivatesPreviousActiveSettings()
        {
            // Arrange
            using var db = CreateDbContext();
            var previousActive = new HotelPricingSetting
            {
                Id = 1,
                MarkupType = "Percentage",
                MarkupValue = 5,
                ConvenienceFeeType = "Flat",
                ConvenienceFeeValue = 200,
                GstPercent = 18,
                IsActive = true
            };
            db.HotelPricingSettings.Add(previousActive);
            await db.SaveChangesAsync();

            var controller = new AdminHotelPricingController(db);
            var dto = new CreateHotelPricingSettingDto
            {
                MarkupType = "Percentage",
                MarkupValue = 10,
                ConvenienceFeeType = "Flat",
                ConvenienceFeeValue = 250,
                GstPercent = 18,
                IsActive = true
            };

            // Action
            var result = await controller.Create(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var response = createdResult.Value.Should().BeOfType<HotelPricingSettingResponseDto>().Subject;
            response.IsActive.Should().BeTrue();
            response.MarkupValue.Should().Be(10);

            // Check db
            var dbPrevious = await db.HotelPricingSettings.FindAsync(1);
            dbPrevious.IsActive.Should().BeFalse(); // Should be deactivated
        }

        [Fact]
        public async Task Update_ExistingId_UpdatesFieldsAndHandlesActivation()
        {
            // Arrange
            using var db = CreateDbContext();
            var oldSetting = new HotelPricingSetting
            {
                Id = 1,
                MarkupType = "Percentage",
                MarkupValue = 5,
                ConvenienceFeeType = "Flat",
                ConvenienceFeeValue = 200,
                GstPercent = 18,
                IsActive = false
            };
            var activeSetting = new HotelPricingSetting
            {
                Id = 2,
                MarkupType = "Percentage",
                MarkupValue = 8,
                ConvenienceFeeType = "Flat",
                ConvenienceFeeValue = 220,
                GstPercent = 18,
                IsActive = true
            };
            db.HotelPricingSettings.AddRange(oldSetting, activeSetting);
            await db.SaveChangesAsync();

            var controller = new AdminHotelPricingController(db);
            var dto = new UpdateHotelPricingSettingDto
            {
                MarkupType = "Flat",
                MarkupValue = 400,
                ConvenienceFeeType = "Percentage",
                ConvenienceFeeValue = 2,
                GstPercent = 18,
                IsActive = true
            };

            // Action
            var result = await controller.Update(1, dto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value.Should().BeOfType<HotelPricingSettingResponseDto>().Subject;
            response.Id.Should().Be(1);
            response.IsActive.Should().BeTrue();
            response.MarkupType.Should().Be("Flat");
            response.MarkupValue.Should().Be(400);

            // Verify db state
            var dbOld = await db.HotelPricingSettings.FindAsync(1);
            dbOld.MarkupType.Should().Be("Flat");
            dbOld.IsActive.Should().BeTrue();

            var dbActive = await db.HotelPricingSettings.FindAsync(2);
            dbActive.IsActive.Should().BeFalse(); // Deactivated when id 1 was set to active
        }

        [Fact]
        public async Task Delete_ExistingId_RemovesFromDatabase()
        {
            // Arrange
            using var db = CreateDbContext();
            var setting = new HotelPricingSetting
            {
                Id = 1,
                MarkupType = "Percentage",
                MarkupValue = 10,
                ConvenienceFeeType = "Flat",
                ConvenienceFeeValue = 250,
                GstPercent = 18,
                IsActive = true
            };
            db.HotelPricingSettings.Add(setting);
            await db.SaveChangesAsync();

            var controller = new AdminHotelPricingController(db);

            // Action
            var result = await controller.Delete(1);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            
            var dbSetting = await db.HotelPricingSettings.FindAsync(1);
            dbSetting.Should().BeNull();
        }
    }
}
