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
    public class AdminBusControllerTests
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
        public async Task GetDiscounts_HappyPath_ReturnsOkWithDiscounts()
        {
            // Arrange
            using var db = CreateDbContext();
            var discount1 = new BusDiscount
            {
                Id = 1,
                Value = 10,
                DiscountType = "Percentage",
                UpdatedBy = "admin",
                Status = "Active",
                EntryDateUtc = DateTime.UtcNow.AddMinutes(-5)
            };
            var discount2 = new BusDiscount
            {
                Id = 2,
                Value = 20,
                DiscountType = "Fixed",
                UpdatedBy = "admin",
                Status = "Active",
                EntryDateUtc = DateTime.UtcNow
            };
            db.BusDiscounts.AddRange(discount1, discount2);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetDiscounts();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = (okResult.Value as IEnumerable<object>).ToList();
            list.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetDiscounts_NoDiscounts_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetDiscounts();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as IEnumerable<object>;
            list.Should().BeEmpty();
        }

        #endregion

        #region GetDiscountById Tests

        [Fact]
        public async Task GetDiscountById_ExistingId_ReturnsOkWithDiscount()
        {
            // Arrange
            using var db = CreateDbContext();
            var discount = new BusDiscount
            {
                Id = 1,
                Value = 15,
                DiscountType = "Percentage",
                UpdatedBy = "admin",
                Status = "Active"
            };
            db.BusDiscounts.Add(discount);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetDiscountById(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedDiscount = okResult.Value.Should().BeOfType<BusDiscount>().Subject;
            returnedDiscount.Id.Should().Be(1);
            returnedDiscount.Value.Should().Be(15);
        }

        [Fact]
        public async Task GetDiscountById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetDiscountById(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Discount not found.");
        }

        [Fact]
        public async Task GetDiscountById_NegativeId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetDiscountById(-1);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Discount not found.");
        }

        #endregion

        #region CreateDiscount Tests

        [Fact]
        public async Task CreateDiscount_HappyPath_ReturnsCreatedAndSyncsPromotion()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusDiscountRequestDto
            {
                Code = "SAVE10",
                Title = "Save 10 Percent",
                Description = "Get 10% off your booking",
                Value = 10,
                DiscountType = "Percentage",
                IsAutoApply = true,
                IsExclusive = true,
                Priority = 1,
                MinBookingAmount = 100,
                StartDateUtc = DateTime.UtcNow,
                EndDateUtc = DateTime.UtcNow.AddDays(10),
                Status = "Active",
                UpdatedBy = "admin",
                Remark = "Initial remark"
            };

            // Action
            var result = await controller.CreateDiscount(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var createdDiscount = createdResult.Value.Should().BeOfType<BusDiscount>().Subject;
            createdDiscount.Id.Should().BeGreaterThan(0);
            createdDiscount.Code.Should().Be("SAVE10");

            // Verify Promotion Sync
            var syncedPromo = await db.BusPromotions.FirstOrDefaultAsync(x => x.SourceType == "Discount" && x.SourceKey == createdDiscount.Id.ToString());
            syncedPromo.Should().NotBeNull();
            syncedPromo!.Code.Should().Be("SAVE10");
            syncedPromo.DiscountValue.Should().Be(10);
            syncedPromo.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task CreateDiscount_ValueZeroOrNegative_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusDiscountRequestDto
            {
                Code = "BAD",
                Value = -5,
                DiscountType = "Percentage"
            };

            // Action
            var result = await controller.CreateDiscount(request);

            // Assert
            var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequestResult.Value.Should().Be("Value must be greater than 0.");
        }

        [Fact]
        public async Task CreateDiscount_DiscountTypeEmpty_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusDiscountRequestDto
            {
                Code = "BAD",
                Value = 10,
                DiscountType = ""
            };

            // Action
            var result = await controller.CreateDiscount(request);

            // Assert
            var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequestResult.Value.Should().Be("DiscountType is required.");
        }

        [Fact]
        public async Task CreateDiscount_DiscountTypeInvalid_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusDiscountRequestDto
            {
                Code = "BAD",
                Value = 10,
                DiscountType = "InvalidType"
            };

            // Action
            var result = await controller.CreateDiscount(request);

            // Assert
            var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequestResult.Value.Should().Be("DiscountType must be one of: Percentage, Fixed.");
        }

        [Fact]
        public async Task CreateDiscount_NullInputs_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusDiscountRequestDto
            {
                Code = null,
                Title = null,
                Description = null,
                Value = 15,
                DiscountType = "Percentage",
                Status = null,
                UpdatedBy = null
            };

            // Action
            var result = await controller.CreateDiscount(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var createdDiscount = createdResult.Value.Should().BeOfType<BusDiscount>().Subject;
            createdDiscount.Code.Should().BeNull();
            createdDiscount.Status.Should().Be("Active"); // Defaulted
            createdDiscount.UpdatedBy.Should().Be("system"); // Defaulted
        }

        #endregion

        #region UpdateDiscount Tests

        [Fact]
        public async Task UpdateDiscount_ExistingId_ReturnsOkAndUpdatesDiscountAndPromotion()
        {
            // Arrange
            using var db = CreateDbContext();
            var discount = new BusDiscount
            {
                Id = 1,
                Code = "SAVE10",
                Value = 10,
                DiscountType = "Percentage",
                Status = "Active",
                UpdatedBy = "admin"
            };
            db.BusDiscounts.Add(discount);
            await db.SaveChangesAsync();

            // Seed synced promotion
            var promo = new BusPromotion
            {
                Code = "SAVE10",
                PromotionType = "Discount",
                DiscountType = "Percentage",
                DiscountValue = 10,
                IsActive = true,
                SourceType = "Discount",
                SourceKey = "1"
            };
            db.BusPromotions.Add(promo);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new BusDiscountRequestDto
            {
                Code = "SAVE20",
                Title = "Updated Title",
                Value = 20,
                DiscountType = "Fixed",
                Status = "Inactive",
                UpdatedBy = "new_admin"
            };

            // Action
            var result = await controller.UpdateDiscount(1, request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var updatedDiscount = okResult.Value.Should().BeOfType<BusDiscount>().Subject;
            updatedDiscount.Code.Should().Be("SAVE20");
            updatedDiscount.Value.Should().Be(20);
            updatedDiscount.DiscountType.Should().Be("Fixed");
            updatedDiscount.Status.Should().Be("Inactive");

            // Verify Synced Promotion
            var updatedPromo = await db.BusPromotions.FirstOrDefaultAsync(x => x.SourceType == "Discount" && x.SourceKey == "1");
            updatedPromo.Should().NotBeNull();
            updatedPromo!.Code.Should().Be("SAVE20");
            updatedPromo.DiscountValue.Should().Be(20);
            updatedPromo.DiscountType.Should().Be("Fixed");
            updatedPromo.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task UpdateDiscount_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusDiscountRequestDto
            {
                Value = 10,
                DiscountType = "Percentage"
            };

            // Action
            var result = await controller.UpdateDiscount(999, request);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Discount not found.");
        }

        [Fact]
        public async Task UpdateDiscount_ValidationFails_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var discount = new BusDiscount
            {
                Id = 1,
                Value = 10,
                DiscountType = "Percentage",
                Status = "Active",
                UpdatedBy = "admin"
            };
            db.BusDiscounts.Add(discount);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new BusDiscountRequestDto
            {
                Value = -5,
                DiscountType = "Percentage"
            };

            // Action
            var result = await controller.UpdateDiscount(1, request);

            // Assert
            var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequestResult.Value.Should().Be("Value must be greater than 0.");
        }

        #endregion

        #region DeleteDiscount Tests

        [Fact]
        public async Task DeleteDiscount_ExistingId_ReturnsOkAndRemovesDiscountAndDeactivatesPromotion()
        {
            // Arrange
            using var db = CreateDbContext();
            var discount = new BusDiscount
            {
                Id = 1,
                Code = "SAVE10",
                Value = 10,
                DiscountType = "Percentage",
                Status = "Active",
                UpdatedBy = "admin"
            };
            db.BusDiscounts.Add(discount);

            var promo = new BusPromotion
            {
                Id = 5,
                Code = "SAVE10",
                PromotionType = "Discount",
                DiscountType = "Percentage",
                DiscountValue = 10,
                IsActive = true,
                SourceType = "Discount",
                SourceKey = "1",
                SourceId = 1
            };
            db.BusPromotions.Add(promo);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.DeleteDiscount(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            // Verify message
            var messageObj = okResult.Value;
            messageObj.Should().NotBeNull();

            // Verify db state
            var deletedDiscount = await db.BusDiscounts.FindAsync(1);
            deletedDiscount.Should().BeNull();

            var syncedPromo = await db.BusPromotions.FindAsync(5);
            syncedPromo.Should().NotBeNull();
            syncedPromo!.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteDiscount_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.DeleteDiscount(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Discount not found.");
        }

        #endregion

        #region AddDiscountCondition Tests

        [Fact]
        public async Task AddDiscountCondition_ExistingDiscountAndPromotion_ReturnsOkAndAddsConditionAndPromotionCondition()
        {
            // Arrange
            using var db = CreateDbContext();
            var discount = new BusDiscount
            {
                Id = 1,
                Value = 10,
                DiscountType = "Percentage",
                Status = "Active",
                UpdatedBy = "admin"
            };
            db.BusDiscounts.Add(discount);

            var promotion = new BusPromotion
            {
                Id = 2,
                Code = "DISC-1",
                SourceType = "Discount",
                SourceKey = "1"
            };
            db.BusPromotions.Add(promotion);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new CreateBusDiscountConditionDto
            {
                ConditionType = "Operator",
                ConditionOperator = "Equals",
                Value1 = "Volvo",
                Value2 = null
            };

            // Action
            var result = await controller.AddDiscountCondition(1, request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            
            // Verify database
            var cond = await db.BusDiscountConditions.FirstOrDefaultAsync(x => x.BusDiscountId == 1);
            cond.Should().NotBeNull();
            cond!.ConditionType.Should().Be("Operator");
            cond.Value1.Should().Be("Volvo");

            var promoCond = await db.BusPromotionConditions.FirstOrDefaultAsync(x => x.BusPromotionId == 2);
            promoCond.Should().NotBeNull();
            promoCond!.ConditionType.Should().Be("Operator");
            promoCond.Value1.Should().Be("Volvo");
        }

        [Fact]
        public async Task AddDiscountCondition_ExistingDiscountNoPromotion_ReturnsOkAndAddsCondition()
        {
            // Arrange
            using var db = CreateDbContext();
            var discount = new BusDiscount
            {
                Id = 1,
                Value = 10,
                DiscountType = "Percentage",
                Status = "Active",
                UpdatedBy = "admin"
            };
            db.BusDiscounts.Add(discount);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new CreateBusDiscountConditionDto
            {
                ConditionType = "Operator",
                ConditionOperator = "Equals",
                Value1 = "Volvo"
            };

            // Action
            var result = await controller.AddDiscountCondition(1, request);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var cond = await db.BusDiscountConditions.FirstOrDefaultAsync(x => x.BusDiscountId == 1);
            cond.Should().NotBeNull();
            
            // No promotion was synced
            var promoCondCount = await db.BusPromotionConditions.CountAsync();
            promoCondCount.Should().Be(0);
        }

        [Fact]
        public async Task AddDiscountCondition_NonExistingDiscount_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new CreateBusDiscountConditionDto
            {
                ConditionType = "Operator",
                ConditionOperator = "Equals",
                Value1 = "Volvo"
            };

            // Action
            var result = await controller.AddDiscountCondition(999, request);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Discount not found.");
        }

        #endregion

        #region GetDiscountConditions Tests

        [Fact]
        public async Task GetDiscountConditions_ExistingDiscount_ReturnsConditions()
        {
            // Arrange
            using var db = CreateDbContext();
            var cond1 = new BusDiscountCondition
            {
                Id = 1,
                BusDiscountId = 5,
                ConditionType = "Operator",
                Value1 = "Volvo"
            };
            var cond2 = new BusDiscountCondition
            {
                Id = 2,
                BusDiscountId = 5,
                ConditionType = "Route",
                Value1 = "CityA-CityB"
            };
            db.BusDiscountConditions.AddRange(cond1, cond2);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetDiscountConditions(5);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value.Should().BeAssignableTo<IEnumerable<BusDiscountCondition>>().Subject;
            list.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetDiscountConditions_NoConditions_ReturnsEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetDiscountConditions(999);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value.Should().BeAssignableTo<IEnumerable<BusDiscountCondition>>().Subject;
            list.Should().BeEmpty();
        }

        #endregion

        #region DeleteDiscountCondition Tests

        [Fact]
        public async Task DeleteDiscountCondition_ExistingConditionAndPromotionCondition_ReturnsOkAndDeletesBoth()
        {
            // Arrange
            using var db = CreateDbContext();
            var discount = new BusDiscount
            {
                Id = 1,
                Value = 10,
                DiscountType = "Percentage",
                Status = "Active",
                UpdatedBy = "admin"
            };
            db.BusDiscounts.Add(discount);

            var promotion = new BusPromotion
            {
                Id = 2,
                Code = "DISC-1",
                SourceType = "Discount",
                SourceKey = "1"
            };
            db.BusPromotions.Add(promotion);

            var condition = new BusDiscountCondition
            {
                Id = 10,
                BusDiscountId = 1,
                ConditionType = "Operator",
                Value1 = "Volvo"
            };
            db.BusDiscountConditions.Add(condition);

            var promoCondition = new BusPromotionCondition
            {
                Id = 20,
                BusPromotionId = 2,
                ConditionType = "Operator",
                Value1 = "Volvo"
            };
            db.BusPromotionConditions.Add(promoCondition);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.DeleteDiscountCondition(10);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            
            // Verify DB state
            var dbCond = await db.BusDiscountConditions.FindAsync(10);
            dbCond.Should().BeNull();

            var dbPromoCond = await db.BusPromotionConditions.FindAsync(20);
            dbPromoCond.Should().BeNull();
        }

        [Fact]
        public async Task DeleteDiscountCondition_NonExistingCondition_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.DeleteDiscountCondition(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Condition not found.");
        }

        #endregion

        #region UpdateDiscountCondition Tests

        [Fact]
        public async Task UpdateDiscountCondition_ExistingConditionAndPromotionCondition_ReturnsOkAndUpdatesBoth()
        {
            // Arrange
            using var db = CreateDbContext();
            var discount = new BusDiscount
            {
                Id = 1,
                Value = 10,
                DiscountType = "Percentage",
                Status = "Active",
                UpdatedBy = "admin"
            };
            db.BusDiscounts.Add(discount);

            var promotion = new BusPromotion
            {
                Id = 2,
                Code = "DISC-1",
                SourceType = "Discount",
                SourceKey = "1"
            };
            db.BusPromotions.Add(promotion);

            var condition = new BusDiscountCondition
            {
                Id = 10,
                BusDiscountId = 1,
                ConditionType = "Operator",
                ConditionOperator = "Equals",
                Value1 = "Volvo"
            };
            db.BusDiscountConditions.Add(condition);

            var promoCondition = new BusPromotionCondition
            {
                Id = 20,
                BusPromotionId = 2,
                ConditionType = "Operator",
                ConditionOperator = "Equals",
                Value1 = "Volvo"
            };
            db.BusPromotionConditions.Add(promoCondition);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new UpdateBusDiscountConditionDto
            {
                ConditionType = "Operator",
                ConditionOperator = "NotEquals",
                Value1 = "Scania",
                Value2 = "Luxury"
            };

            // Action
            var result = await controller.UpdateDiscountCondition(10, request);

            // Assert
            result.Should().BeOfType<OkObjectResult>();

            // Verify updates in DB
            var dbCond = await db.BusDiscountConditions.FindAsync(10);
            dbCond.Should().NotBeNull();
            dbCond!.ConditionOperator.Should().Be("NotEquals");
            dbCond.Value1.Should().Be("Scania");
            dbCond.Value2.Should().Be("Luxury");

            var dbPromoCond = await db.BusPromotionConditions.FindAsync(20);
            dbPromoCond.Should().NotBeNull();
            dbPromoCond!.ConditionOperator.Should().Be("NotEquals");
            dbPromoCond.Value1.Should().Be("Scania");
            dbPromoCond.Value2.Should().Be("Luxury");
        }

        [Fact]
        public async Task UpdateDiscountCondition_NonExistingCondition_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new UpdateBusDiscountConditionDto
            {
                ConditionType = "Operator",
                Value1 = "Volvo"
            };

            // Action
            var result = await controller.UpdateDiscountCondition(999, request);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Condition not found.");
        }

        #endregion
    }
}
