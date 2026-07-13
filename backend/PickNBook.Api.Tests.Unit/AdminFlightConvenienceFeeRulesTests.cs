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
    public class AdminFlightConvenienceFeeRulesTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        #region GetAll Tests

        [Fact]
        public async Task GetAll_HappyPath_ReturnsOkWithRulesOrderedByTripType()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightConvenienceFeeRules.AddRange(
                new FlightConvenienceFeeRule
                {
                    Id = 1, TripType = TripType.RoundTrip, FeeType = "Flat", FeeValue = 150, IsActive = true
                },
                new FlightConvenienceFeeRule
                {
                    Id = 2, TripType = TripType.OneWay, FeeType = "Percentage", FeeValue = 2.5m, IsActive = true
                }
            );
            await db.SaveChangesAsync();
            var controller = new AdminFlightConvenienceFeeRulesController(db);

            // Act
            var result = await controller.GetAll();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = okResult.Value as List<FlightConvenienceFeeRuleResponseDto>;
            items.Should().NotBeNull();
            items.Should().HaveCount(2);
            // OneWay (0) should come before RoundTrip (1)
            items[0].TripType.Should().Be("OneWay");
            items[1].TripType.Should().Be("RoundTrip");
        }

        [Fact]
        public async Task GetAll_NoRules_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);

            // Act
            var result = await controller.GetAll();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = okResult.Value as List<FlightConvenienceFeeRuleResponseDto>;
            items.Should().BeEmpty();
        }

        [Fact]
        public async Task GetAll_MapsEnumsToStrings()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightConvenienceFeeRules.Add(new FlightConvenienceFeeRule
            {
                Id = 1, TripType = TripType.OneWay, FeeType = "Percentage", FeeValue = 3.5m, IsActive = true
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightConvenienceFeeRulesController(db);

            // Act
            var result = await controller.GetAll();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = okResult.Value as List<FlightConvenienceFeeRuleResponseDto>;
            items[0].TripType.Should().Be("OneWay");
        }

        #endregion

        #region GetById Tests

        [Fact]
        public async Task GetById_ExistingId_ReturnsOkWithRule()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightConvenienceFeeRules.Add(new FlightConvenienceFeeRule
            {
                Id = 10, TripType = TripType.RoundTrip, FeeType = "Flat", FeeValue = 200, IsActive = true
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightConvenienceFeeRulesController(db);

            // Act
            var result = await controller.GetById(10);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var dto = okResult.Value as FlightConvenienceFeeRuleResponseDto;
            dto.Should().NotBeNull();
            dto.Id.Should().Be(10);
            dto.TripType.Should().Be("RoundTrip");
            dto.FeeType.Should().Be("Flat");
            dto.FeeValue.Should().Be(200);
            dto.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task GetById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);

            // Act
            var result = await controller.GetById(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            // The controller returns anonymous object `new { message = "Flight convenience fee rule not found." }`
            // Let's assert the message property using reflection or JSON conversion
            var value = notFoundResult.Value;
            value.Should().NotBeNull();
            var messageProp = value.GetType().GetProperty("message");
            messageProp.Should().NotBeNull();
            messageProp.GetValue(value).Should().Be("Flight convenience fee rule not found.");
        }

        #endregion

        #region Create Tests

        [Fact]
        public async Task Create_HappyPathFlatFee_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);
            var dto = new CreateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay,
                FeeType = "Flat",
                FeeValue = 150,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as FlightConvenienceFeeRuleResponseDto;
            responseDto.Should().NotBeNull();
            responseDto.TripType.Should().Be("OneWay");
            responseDto.FeeType.Should().Be("Flat");
            responseDto.FeeValue.Should().Be(150);
            responseDto.IsActive.Should().BeTrue();

            // Verify db state
            var dbRow = await db.FlightConvenienceFeeRules.FindAsync(responseDto.Id);
            dbRow.Should().NotBeNull();
            dbRow.TripType.Should().Be(TripType.OneWay);
            dbRow.FeeType.Should().Be("Flat");
            dbRow.FeeValue.Should().Be(150);
            dbRow.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task Create_HappyPathPercentageFee_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);
            var dto = new CreateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.RoundTrip,
                FeeType = "Percentage",
                FeeValue = 3.5m,
                IsActive = false
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as FlightConvenienceFeeRuleResponseDto;
            responseDto.Should().NotBeNull();
            responseDto.TripType.Should().Be("RoundTrip");
            responseDto.FeeType.Should().Be("Percentage");
            responseDto.FeeValue.Should().Be(3.5m);
            responseDto.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task Create_CaseInsensitiveFeeTypeAndTrimmed_SucceedsAndTrims()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);
            var dto = new CreateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay,
                FeeType = "  pErCeNtAgE  ",
                FeeValue = 2.0m,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as FlightConvenienceFeeRuleResponseDto;
            responseDto.FeeType.Should().Be("pErCeNtAgE"); // Production code does dto.FeeType.Trim() but does NOT lowercase/uppercase it
        }

        [Fact]
        public async Task Create_NullDto_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);

            // Act
            var result = await controller.Create(null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Invalid payload.");
        }

        [Fact]
        public async Task Create_InvalidFeeType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);
            var dto = new CreateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay,
                FeeType = "Fixed", // Not allowed
                FeeValue = 100,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("FeeType must be one of: Flat, Percentage.");
        }

        [Fact]
        public async Task Create_ZeroFeeValue_Succeeds()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);
            var dto = new CreateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay,
                FeeType = "Flat",
                FeeValue = 0,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            result.Should().BeOfType<CreatedAtActionResult>();
        }

        [Fact]
        public async Task Create_NegativeFeeValue_Succeeds()
        {
            // Arrange (no validation on FeeValue in production controller)
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);
            var dto = new CreateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay,
                FeeType = "Flat",
                FeeValue = -100,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            result.Should().BeOfType<CreatedAtActionResult>();
        }

        #endregion

        #region Update Tests

        [Fact]
        public async Task Update_HappyPath_ReturnsOkAndUpdates()
        {
            // Arrange
            using var db = CreateDbContext();
            var rule = new FlightConvenienceFeeRule
            {
                Id = 1, TripType = TripType.OneWay, FeeType = "Flat", FeeValue = 100, IsActive = true
            };
            db.FlightConvenienceFeeRules.Add(rule);
            await db.SaveChangesAsync();
            var controller = new AdminFlightConvenienceFeeRulesController(db);

            var dto = new UpdateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.RoundTrip,
                FeeType = "  Percentage  ",
                FeeValue = 5.5m,
                IsActive = false
            };

            // Act
            var result = await controller.Update(1, dto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var responseDto = okResult.Value as FlightConvenienceFeeRuleResponseDto;
            responseDto.Should().NotBeNull();
            responseDto.TripType.Should().Be("RoundTrip");
            responseDto.FeeType.Should().Be("Percentage");
            responseDto.FeeValue.Should().Be(5.5m);
            responseDto.IsActive.Should().BeFalse();

            // Verify in db
            var dbRule = await db.FlightConvenienceFeeRules.FindAsync(1);
            dbRule.TripType.Should().Be(TripType.RoundTrip);
            dbRule.FeeType.Should().Be("Percentage");
            dbRule.FeeValue.Should().Be(5.5m);
            dbRule.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task Update_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);
            var dto = new UpdateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay, FeeType = "Flat", FeeValue = 100, IsActive = true
            };

            // Act
            var result = await controller.Update(999, dto);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            var value = notFoundResult.Value;
            var messageProp = value.GetType().GetProperty("message");
            messageProp.GetValue(value).Should().Be("Flight convenience fee rule not found.");
        }

        [Fact]
        public async Task Update_NullDto_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);

            // Act
            var result = await controller.Update(1, null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Invalid payload.");
        }

        [Fact]
        public async Task Update_InvalidFeeType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);
            var dto = new UpdateFlightConvenienceFeeRuleDto
            {
                TripType = TripType.OneWay,
                FeeType = "Fixed",
                FeeValue = 100,
                IsActive = true
            };

            // Act
            var result = await controller.Update(1, dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("FeeType must be one of: Flat, Percentage.");
        }

        #endregion

        #region Delete Tests

        [Fact]
        public async Task Delete_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            var rule = new FlightConvenienceFeeRule
            {
                Id = 1, TripType = TripType.OneWay, FeeType = "Flat", FeeValue = 100, IsActive = true
            };
            db.FlightConvenienceFeeRules.Add(rule);
            await db.SaveChangesAsync();
            var controller = new AdminFlightConvenienceFeeRulesController(db);

            // Act
            var result = await controller.Delete(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var value = okResult.Value;
            var messageProp = value.GetType().GetProperty("message");
            messageProp.GetValue(value).Should().Be("Flight convenience fee rule deleted successfully.");

            // Verify in db
            var dbRule = await db.FlightConvenienceFeeRules.FindAsync(1);
            dbRule.Should().BeNull();
        }

        [Fact]
        public async Task Delete_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightConvenienceFeeRulesController(db);

            // Act
            var result = await controller.Delete(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            var value = notFoundResult.Value;
            var messageProp = value.GetType().GetProperty("message");
            messageProp.GetValue(value).Should().Be("Flight convenience fee rule not found.");
        }

        #endregion
    }
}
