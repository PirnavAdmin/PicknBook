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
    public class AdminFlightMarkupTests
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
        public async Task GetAll_HappyPath_ReturnsOkWithRulesOrderedByPriorityDesc()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.FlightMarkupRules.AddRange(
                new FlightMarkupRule
                {
                    Id = 1, AirlineCode = "AI", TripType = TripType.OneWay,
                    MarkupType = FlightMarkupType.Flat, MarkupValue = 100,
                    Priority = 1, IsActive = true, CreatedAtUtc = now, UpdatedAtUtc = now
                },
                new FlightMarkupRule
                {
                    Id = 2, AirlineCode = "6E", TripType = TripType.RoundTrip,
                    MarkupType = FlightMarkupType.Percentage, MarkupValue = 5,
                    Priority = 10, IsActive = true, CreatedAtUtc = now, UpdatedAtUtc = now
                }
            );
            await db.SaveChangesAsync();
            var controller = new AdminFlightMarkupController(db);

            // Act
            var result = await controller.GetAll();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as List<FlightMarkupRuleResponseDto>);
            items.Should().HaveCount(2);
            items[0].Priority.Should().Be(10); // higher priority first
            items[1].Priority.Should().Be(1);
        }

        [Fact]
        public async Task GetAll_NoRules_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);

            // Act
            var result = await controller.GetAll();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as List<FlightMarkupRuleResponseDto>);
            items.Should().BeEmpty();
        }

        [Fact]
        public async Task GetAll_MapsEnumsToStrings()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightMarkupRules.Add(new FlightMarkupRule
            {
                Id = 1, AirlineCode = "AI", TripType = TripType.RoundTrip,
                MarkupType = FlightMarkupType.Percentage, MarkupValue = 5,
                Priority = 1, IsActive = true
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightMarkupController(db);

            // Act
            var result = await controller.GetAll();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as List<FlightMarkupRuleResponseDto>);
            items[0].TripType.Should().Be("RoundTrip");
            items[0].MarkupType.Should().Be("Percentage");
        }

        #endregion

        #region GetById Tests

        [Fact]
        public async Task GetById_ExistingId_ReturnsOkWithRule()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightMarkupRules.Add(new FlightMarkupRule
            {
                Id = 1, AirlineCode = "AI", TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat, MarkupValue = 200,
                Priority = 5, IsActive = true
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightMarkupController(db);

            // Act
            var result = await controller.GetById(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var dto = okResult.Value as FlightMarkupRuleResponseDto;
            dto.Should().NotBeNull();
            dto.Id.Should().Be(1);
            dto.AirlineCode.Should().Be("AI");
            dto.MarkupValue.Should().Be(200);
            dto.Priority.Should().Be(5);
            dto.IsActive.Should().BeTrue();
            dto.TripType.Should().Be("OneWay");
            dto.MarkupType.Should().Be("Flat");
        }

        [Fact]
        public async Task GetById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);

            // Act
            var result = await controller.GetById(999);

            // Assert
            result.Should().BeOfType<NotFoundObjectResult>();
        }

        #endregion

        #region Create Tests

        [Fact]
        public async Task Create_HappyPath_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);
            var dto = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "AI",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 150,
                Priority = 5,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as FlightMarkupRuleResponseDto;
            responseDto.Should().NotBeNull();
            responseDto.AirlineCode.Should().Be("AI");
            responseDto.MarkupValue.Should().Be(150);
            responseDto.TripType.Should().Be("OneWay");
            responseDto.MarkupType.Should().Be("Flat");
            responseDto.Priority.Should().Be(5);
            responseDto.IsActive.Should().BeTrue();

            // Verify in DB
            var dbRow = await db.FlightMarkupRules.FindAsync(responseDto.Id);
            dbRow.Should().NotBeNull();
            dbRow.AirlineCode.Should().Be("AI");
        }

        [Fact]
        public async Task Create_AirlineCodeNormalized_TrimmedAndUpperCased()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);
            var dto = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "  ai  ",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 100,
                Priority = 1,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as FlightMarkupRuleResponseDto;
            responseDto.AirlineCode.Should().Be("AI");
        }

        [Fact]
        public async Task Create_PercentageType_Succeeds()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);
            var dto = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "6E",
                TripType = TripType.RoundTrip,
                MarkupType = FlightMarkupType.Percentage,
                MarkupValue = 5.5m,
                Priority = 10,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as FlightMarkupRuleResponseDto;
            responseDto.MarkupType.Should().Be("Percentage");
            responseDto.MarkupValue.Should().Be(5.5m);
        }

        [Fact]
        public async Task Create_WildcardAirlineCode_Succeeds()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);
            var dto = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "*",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 50,
                Priority = 0,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as FlightMarkupRuleResponseDto;
            responseDto.AirlineCode.Should().Be("*");
        }

        [Fact]
        public async Task Create_InactiveRule_SetsIsActiveToFalse()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);
            var dto = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "AI",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 100,
                Priority = 1,
                IsActive = false
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as FlightMarkupRuleResponseDto;
            responseDto.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task Create_ZeroMarkupValue_Succeeds()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);
            var dto = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "AI",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 0,
                Priority = 1,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            result.Should().BeOfType<CreatedAtActionResult>();
        }

        [Fact]
        public async Task Create_NegativeMarkupValue_Succeeds()
        {
            // Arrange — no validation on MarkupValue in controller
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);
            var dto = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "AI",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = -50,
                Priority = 1,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert — no validation exists, so it succeeds
            result.Should().BeOfType<CreatedAtActionResult>();
        }

        [Fact]
        public async Task Create_SetsTimestamps()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);
            var beforeCreate = DateTime.UtcNow;
            var dto = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "AI",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 100,
                Priority = 1,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as FlightMarkupRuleResponseDto;
            responseDto.CreatedAtUtc.Should().BeOnOrAfter(beforeCreate);
            responseDto.UpdatedAtUtc.Should().BeOnOrAfter(beforeCreate);
        }

        [Fact]
        public async Task Create_NullDto_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);

            // Act
            var result = await controller.Create(null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Invalid payload.");
        }

        [Fact]
        public async Task Create_ZeroPriority_Succeeds()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);
            var dto = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "AI",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 100,
                Priority = 0,
                IsActive = true
            };

            // Act
            var result = await controller.Create(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var responseDto = createdResult.Value as FlightMarkupRuleResponseDto;
            responseDto.Priority.Should().Be(0);
        }

        [Fact]
        public async Task Create_NegativePriority_Succeeds()
        {
            // Arrange — no validation on Priority
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);
            var dto = new CreateFlightMarkupRuleDto
            {
                AirlineCode = "AI",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 100,
                Priority = -5,
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
        public async Task Update_HappyPath_ReturnsOkAndUpdatesAllFields()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow.AddDays(-1);
            db.FlightMarkupRules.Add(new FlightMarkupRule
            {
                Id = 1, AirlineCode = "AI", TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat, MarkupValue = 100,
                Priority = 1, IsActive = true, CreatedAtUtc = now, UpdatedAtUtc = now
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightMarkupController(db);

            var dto = new UpdateFlightMarkupRuleDto
            {
                AirlineCode = "  6e  ",
                TripType = TripType.RoundTrip,
                MarkupType = FlightMarkupType.Percentage,
                MarkupValue = 7.5m,
                Priority = 20,
                IsActive = false
            };

            // Act
            var result = await controller.Update(1, dto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var responseDto = okResult.Value as FlightMarkupRuleResponseDto;
            responseDto.AirlineCode.Should().Be("6E");
            responseDto.TripType.Should().Be("RoundTrip");
            responseDto.MarkupType.Should().Be("Percentage");
            responseDto.MarkupValue.Should().Be(7.5m);
            responseDto.Priority.Should().Be(20);
            responseDto.IsActive.Should().BeFalse();
            responseDto.UpdatedAtUtc.Should().BeAfter(now);
            responseDto.CreatedAtUtc.Should().Be(now);
        }

        [Fact]
        public async Task Update_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);
            var dto = new UpdateFlightMarkupRuleDto
            {
                AirlineCode = "AI",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 100,
                Priority = 1,
                IsActive = true
            };

            // Act
            var result = await controller.Update(999, dto);

            // Assert
            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task Update_NullDto_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);

            // Act
            var result = await controller.Update(1, null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Invalid payload.");
        }

        [Fact]
        public async Task Update_AirlineCodeNormalized_TrimmedAndUpperCased()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightMarkupRules.Add(new FlightMarkupRule
            {
                Id = 1, AirlineCode = "AI", TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat, MarkupValue = 100,
                Priority = 1, IsActive = true
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightMarkupController(db);

            var dto = new UpdateFlightMarkupRuleDto
            {
                AirlineCode = "  sg  ",
                TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat,
                MarkupValue = 100,
                Priority = 1,
                IsActive = true
            };

            // Act
            var result = await controller.Update(1, dto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var responseDto = okResult.Value as FlightMarkupRuleResponseDto;
            responseDto.AirlineCode.Should().Be("SG");
        }

        [Fact]
        public async Task Update_PreservesCreatedAtUtc()
        {
            // Arrange
            using var db = CreateDbContext();
            var originalCreated = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            db.FlightMarkupRules.Add(new FlightMarkupRule
            {
                Id = 1, AirlineCode = "AI", TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat, MarkupValue = 100,
                Priority = 1, IsActive = true, CreatedAtUtc = originalCreated,
                UpdatedAtUtc = originalCreated
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightMarkupController(db);

            var dto = new UpdateFlightMarkupRuleDto
            {
                AirlineCode = "AI",
                TripType = TripType.RoundTrip,
                MarkupType = FlightMarkupType.Percentage,
                MarkupValue = 5,
                Priority = 2,
                IsActive = true
            };

            // Act
            var result = await controller.Update(1, dto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var responseDto = okResult.Value as FlightMarkupRuleResponseDto;
            responseDto.CreatedAtUtc.Should().Be(originalCreated);
        }

        #endregion

        #region Delete Tests

        [Fact]
        public async Task Delete_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightMarkupRules.Add(new FlightMarkupRule
            {
                Id = 1, AirlineCode = "AI", TripType = TripType.OneWay,
                MarkupType = FlightMarkupType.Flat, MarkupValue = 100,
                Priority = 1, IsActive = true
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightMarkupController(db);

            // Act
            var result = await controller.Delete(1);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var remaining = await db.FlightMarkupRules.FindAsync(1);
            remaining.Should().BeNull();
        }

        [Fact]
        public async Task Delete_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightMarkupController(db);

            // Act
            var result = await controller.Delete(999);

            // Assert
            result.Should().BeOfType<NotFoundObjectResult>();
        }

        #endregion

        #region Response DTO Shape Tests

        [Fact]
        public async Task ResponseDto_ContainsAllExpectedFields()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.FlightMarkupRules.Add(new FlightMarkupRule
            {
                Id = 1, AirlineCode = "UK", TripType = TripType.RoundTrip,
                MarkupType = FlightMarkupType.Percentage, MarkupValue = 3.25m,
                Priority = 7, IsActive = false, CreatedAtUtc = now, UpdatedAtUtc = now
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightMarkupController(db);

            // Act
            var result = await controller.GetById(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var dto = okResult.Value as FlightMarkupRuleResponseDto;
            dto.Id.Should().Be(1);
            dto.AirlineCode.Should().Be("UK");
            dto.TripType.Should().Be("RoundTrip");
            dto.MarkupType.Should().Be("Percentage");
            dto.MarkupValue.Should().Be(3.25m);
            dto.Priority.Should().Be(7);
            dto.IsActive.Should().BeFalse();
            dto.CreatedAtUtc.Should().BeCloseTo(now, TimeSpan.FromSeconds(1));
            dto.UpdatedAtUtc.Should().BeCloseTo(now, TimeSpan.FromSeconds(1));
        }

        #endregion
    }
}
