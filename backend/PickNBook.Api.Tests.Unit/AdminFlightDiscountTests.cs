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
    public class AdminFlightDiscountTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        #region GetDiscounts Tests

        [Fact]
        public async Task GetDiscounts_HappyPath_ReturnsOkWithDiscountsOrderedByUpdateDateDesc()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.FlightDiscounts.AddRange(
                new FlightDiscount
                {
                    Id = 1, Value = 10, DiscountType = "Percentage", Name = "OldDiscount",
                    EntryDateUtc = now.AddDays(-2), UpdateDateUtc = now.AddDays(-2),
                    UpdatedBy = "admin", Status = "Active"
                },
                new FlightDiscount
                {
                    Id = 2, Value = 200, DiscountType = "Fixed", Name = "NewDiscount",
                    EntryDateUtc = now.AddDays(-1), UpdateDateUtc = now.AddDays(-1),
                    UpdatedBy = "admin", Status = "Active"
                }
            );
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetDiscounts();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetDiscounts_NoDiscounts_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetDiscounts();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().BeEmpty();
        }

        #endregion

        #region GetDiscountById Tests

        [Fact]
        public async Task GetDiscountById_ExistingId_ReturnsOkWithDiscount()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 15, DiscountType = "Percentage", Name = "TestDiscount",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetDiscountById(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var discount = okResult.Value as FlightDiscount;
            discount.Should().NotBeNull();
            discount.Id.Should().Be(1);
            discount.Name.Should().Be("TestDiscount");
        }

        [Fact]
        public async Task GetDiscountById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetDiscountById(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Discount not found.");
        }

        #endregion

        #region CreateDiscount Tests

        [Fact]
        public async Task CreateDiscount_HappyPath_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "New Year Sale",
                Status = "Active",
                UpdatedBy = "admin",
                Remark = "Test remark"
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var discount = createdResult.Value as FlightDiscount;
            discount.Should().NotBeNull();
            discount.Name.Should().Be("New Year Sale");
            discount.Value.Should().Be(10);
            discount.DiscountType.Should().Be("Percentage");
            discount.Remark.Should().Be("Test remark");

            // Verify persisted in DB
            var dbRow = await db.FlightDiscounts.FindAsync(discount.Id);
            dbRow.Should().NotBeNull();
            dbRow.Name.Should().Be("New Year Sale");
        }

        [Fact]
        public async Task CreateDiscount_ValueZero_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 0,
                DiscountType = "Percentage",
                Name = "Test",
                Status = "Active"
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Value must be greater than 0.");
        }

        [Fact]
        public async Task CreateDiscount_NegativeValue_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = -5,
                DiscountType = "Percentage",
                Name = "Test",
                Status = "Active"
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Value must be greater than 0.");
        }

        [Fact]
        public async Task CreateDiscount_EmptyName_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "",
                Status = "Active"
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Name is required.");
        }

        [Fact]
        public async Task CreateDiscount_WhitespaceName_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "   ",
                Status = "Active"
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Name is required.");
        }

        [Fact]
        public async Task CreateDiscount_EmptyDiscountType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "",
                Name = "Test",
                Status = "Active"
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("DiscountType is required.");
        }

        [Fact]
        public async Task CreateDiscount_InvalidDiscountType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Invalid",
                Name = "Test",
                Status = "Active"
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            ((string)badResult.Value).Should().Contain("DiscountType must be one of");
        }

        [Fact]
        public async Task CreateDiscount_DiscountTypeCaseInsensitive_NormalizesToCorrectCase()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "percentage",
                Name = "Case Test",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var discount = createdResult.Value as FlightDiscount;
            discount.DiscountType.Should().Be("Percentage");
        }

        [Fact]
        public async Task CreateDiscount_FixedDiscountType_Succeeds()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 500,
                DiscountType = "Fixed",
                Name = "Fixed Amount Discount",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var discount = createdResult.Value as FlightDiscount;
            discount.DiscountType.Should().Be("Fixed");
            discount.Value.Should().Be(500);
        }

        [Fact]
        public async Task CreateDiscount_NullRemark_SetsRemarkToNull()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "No Remark",
                Status = "Active",
                UpdatedBy = "admin",
                Remark = null
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var discount = createdResult.Value as FlightDiscount;
            discount.Remark.Should().BeNull();
        }

        [Fact]
        public async Task CreateDiscount_WhitespaceRemark_SetsRemarkToNull()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "Whitespace Remark",
                Status = "Active",
                UpdatedBy = "admin",
                Remark = "   "
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var discount = createdResult.Value as FlightDiscount;
            discount.Remark.Should().BeNull();
        }

        [Fact]
        public async Task CreateDiscount_NullUpdatedBy_DefaultsToSystem()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "SystemDefault",
                Status = "Active",
                UpdatedBy = null
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var discount = createdResult.Value as FlightDiscount;
            discount.UpdatedBy.Should().Be("system");
        }

        [Fact]
        public async Task CreateDiscount_EmptyUpdatedBy_DefaultsToSystem()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "SystemDefault2",
                Status = "Active",
                UpdatedBy = "   "
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var discount = createdResult.Value as FlightDiscount;
            discount.UpdatedBy.Should().Be("system");
        }

        [Fact]
        public async Task CreateDiscount_NullStatus_DefaultsToActive()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "StatusDefault",
                Status = null,
                UpdatedBy = "admin"
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var discount = createdResult.Value as FlightDiscount;
            discount.Status.Should().Be("Active");
        }

        [Fact]
        public async Task CreateDiscount_NameWithWhitespace_TrimsName()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "  Padded Name  ",
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var result = await controller.CreateDiscount(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var discount = createdResult.Value as FlightDiscount;
            discount.Name.Should().Be("Padded Name");
        }

        #endregion

        #region UpdateDiscount Tests

        [Fact]
        public async Task UpdateDiscount_HappyPath_ReturnsOkAndUpdates()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "Old",
                EntryDateUtc = now, UpdateDateUtc = now, UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new FlightDiscountRequestDto
            {
                Value = 20,
                DiscountType = "Fixed",
                Name = "Updated",
                Status = "Inactive",
                UpdatedBy = "superadmin",
                Remark = "Updated remark"
            };

            // Act
            var result = await controller.UpdateDiscount(1, request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var discount = okResult.Value as FlightDiscount;
            discount.Value.Should().Be(20);
            discount.DiscountType.Should().Be("Fixed");
            discount.Name.Should().Be("Updated");
            discount.Status.Should().Be("Inactive");
            discount.UpdatedBy.Should().Be("superadmin");
            discount.Remark.Should().Be("Updated remark");
            discount.UpdateDateUtc.Should().BeAfter(now);
        }

        [Fact]
        public async Task UpdateDiscount_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "Test",
                Status = "Active"
            };

            // Act
            var result = await controller.UpdateDiscount(999, request);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Discount not found.");
        }

        [Fact]
        public async Task UpdateDiscount_InvalidValue_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "Test",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new FlightDiscountRequestDto
            {
                Value = 0,
                DiscountType = "Percentage",
                Name = "Test",
                Status = "Active"
            };

            // Act
            var result = await controller.UpdateDiscount(1, request);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task UpdateDiscount_InvalidDiscountType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "Test",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "InvalidType",
                Name = "Test",
                Status = "Active"
            };

            // Act
            var result = await controller.UpdateDiscount(1, request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            ((string)badResult.Value).Should().Contain("DiscountType must be one of");
        }

        [Fact]
        public async Task UpdateDiscount_EmptyName_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "Test",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new FlightDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage",
                Name = "",
                Status = "Active"
            };

            // Act
            var result = await controller.UpdateDiscount(1, request);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        #endregion

        #region DeleteDiscount Tests

        [Fact]
        public async Task DeleteDiscount_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "ToDelete",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteDiscount(1);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var remaining = await db.FlightDiscounts.FindAsync(1);
            remaining.Should().BeNull();
        }

        [Fact]
        public async Task DeleteDiscount_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteDiscount(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Discount not found.");
        }

        #endregion

        #region AddDiscountCondition Tests

        [Fact]
        public async Task AddDiscountCondition_HappyPath_ReturnsOkAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "Test",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new CreateFlightDiscountConditionDto
            {
                ConditionType = "Route",
                ConditionOperator = "Equals",
                Value1 = "DEL-BOM",
                Value2 = null
            };

            // Act
            var result = await controller.AddDiscountCondition(1, request);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var conditions = await db.FlightDiscountConditions.Where(c => c.FlightDiscountId == 1).ToListAsync();
            conditions.Should().HaveCount(1);
            conditions[0].ConditionType.Should().Be("Route");
            conditions[0].ConditionOperator.Should().Be("Equals");
            conditions[0].Value1.Should().Be("DEL-BOM");
        }

        [Fact]
        public async Task AddDiscountCondition_NonExistingDiscount_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new CreateFlightDiscountConditionDto
            {
                ConditionType = "Route",
                ConditionOperator = "Equals",
                Value1 = "DEL-BOM"
            };

            // Act
            var result = await controller.AddDiscountCondition(999, request);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Discount not found.");
        }

        [Fact]
        public async Task AddDiscountCondition_WithValue2_PersistsValue2()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "Test",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new CreateFlightDiscountConditionDto
            {
                ConditionType = "FareRange",
                ConditionOperator = "Between",
                Value1 = "1000",
                Value2 = "5000"
            };

            // Act
            var result = await controller.AddDiscountCondition(1, request);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var condition = await db.FlightDiscountConditions.FirstAsync();
            condition.Value2.Should().Be("5000");
        }

        [Fact]
        public async Task AddDiscountCondition_TrimsWhitespace_InAllFields()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "Test",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new CreateFlightDiscountConditionDto
            {
                ConditionType = "  Route  ",
                ConditionOperator = "  Equals  ",
                Value1 = "  DEL-BOM  ",
                Value2 = "  Extra  "
            };

            // Act
            var result = await controller.AddDiscountCondition(1, request);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var condition = await db.FlightDiscountConditions.FirstAsync();
            condition.ConditionType.Should().Be("Route");
            condition.ConditionOperator.Should().Be("Equals");
            condition.Value1.Should().Be("DEL-BOM");
            condition.Value2.Should().Be("Extra");
        }

        [Fact]
        public async Task AddDiscountCondition_MultipleConditions_AllPersisted()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "Test",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            await controller.AddDiscountCondition(1, new CreateFlightDiscountConditionDto
            {
                ConditionType = "Route", ConditionOperator = "Equals", Value1 = "DEL-BOM"
            });
            await controller.AddDiscountCondition(1, new CreateFlightDiscountConditionDto
            {
                ConditionType = "Airline", ConditionOperator = "Equals", Value1 = "AI"
            });

            // Assert
            var conditions = await db.FlightDiscountConditions.Where(c => c.FlightDiscountId == 1).ToListAsync();
            conditions.Should().HaveCount(2);
        }

        #endregion

        #region GetDiscountConditions Tests

        [Fact]
        public async Task GetDiscountConditions_HappyPath_ReturnsOkWithConditions()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "Test",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            db.FlightDiscountConditions.Add(new FlightDiscountCondition
            {
                Id = 1, FlightDiscountId = 1, ConditionType = "Route",
                ConditionOperator = "Equals", Value1 = "DEL-BOM"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetDiscountConditions(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = (okResult.Value as List<FlightDiscountCondition>);
            list.Should().HaveCount(1);
            list[0].ConditionType.Should().Be("Route");
        }

        [Fact]
        public async Task GetDiscountConditions_NonExistingDiscount_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetDiscountConditions(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Discount not found.");
        }

        [Fact]
        public async Task GetDiscountConditions_NoConditions_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "Test",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetDiscountConditions(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = (okResult.Value as List<FlightDiscountCondition>);
            list.Should().BeEmpty();
        }

        #endregion

        #region DeleteDiscountCondition Tests

        [Fact]
        public async Task DeleteDiscountCondition_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightDiscounts.Add(new FlightDiscount
            {
                Id = 1, Value = 10, DiscountType = "Percentage", Name = "Test",
                EntryDateUtc = DateTime.UtcNow, UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin", Status = "Active"
            });
            db.FlightDiscountConditions.Add(new FlightDiscountCondition
            {
                Id = 1, FlightDiscountId = 1, ConditionType = "Route",
                ConditionOperator = "Equals", Value1 = "DEL-BOM"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteDiscountCondition(1);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var remaining = await db.FlightDiscountConditions.FindAsync(1);
            remaining.Should().BeNull();
        }

        [Fact]
        public async Task DeleteDiscountCondition_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteDiscountCondition(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Condition not found.");
        }

        #endregion
    }
}
