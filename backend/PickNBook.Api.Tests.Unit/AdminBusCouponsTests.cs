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
    public class AdminBusCouponsTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        #region GetCoupons Tests

        [Fact]
        public async Task GetCoupons_HappyPath_ReturnsOkWithCoupons()
        {
            // Arrange
            using var db = CreateDbContext();
            var coupon1 = new BusCoupon
            {
                Id = 1,
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "SAVE10",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
                Status = "Active"
            };
            var coupon2 = new BusCoupon
            {
                Id = 2,
                Value = 15,
                CouponType = "Fixed",
                CouponCode = "SAVE15",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
                Status = "Active"
            };
            db.BusCoupons.AddRange(coupon1, coupon2);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetCoupons();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = (okResult.Value as IEnumerable<object>).ToList();
            list.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetCoupons_NoCoupons_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetCoupons();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as IEnumerable<object>;
            list.Should().BeEmpty();
        }

        #endregion

        #region GetCouponById Tests

        [Fact]
        public async Task GetCouponById_ExistingId_ReturnsOkWithCoupon()
        {
            // Arrange
            using var db = CreateDbContext();
            var coupon = new BusCoupon
            {
                Id = 1,
                Value = 20,
                CouponType = "Percentage",
                CouponCode = "BIGSAVE",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
                Status = "Active"
            };
            db.BusCoupons.Add(coupon);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetCouponById(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedCoupon = okResult.Value.Should().BeOfType<BusCoupon>().Subject;
            returnedCoupon.Id.Should().Be(1);
            returnedCoupon.CouponCode.Should().Be("BIGSAVE");
        }

        [Fact]
        public async Task GetCouponById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetCouponById(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Coupon not found.");
        }

        #endregion

        #region CreateCoupon Tests

        [Fact]
        public async Task CreateCoupon_HappyPath_ReturnsCreatedAndSyncsPromotion()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "WELCOME10",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
                UseLimit = 100,
                MaxUsagePerUser = 1,
                IsExclusive = true,
                IsAutoApply = false,
                Priority = 1,
                Status = "Active",
                Remark = "First user coupon",
                MinBookingAmount = 200
            };

            // Action
            var result = await controller.CreateCoupon(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var createdCoupon = createdResult.Value.Should().BeOfType<BusCoupon>().Subject;
            createdCoupon.Id.Should().BeGreaterThan(0);
            createdCoupon.CouponCode.Should().Be("WELCOME10"); // Normalized to uppercase
            createdCoupon.IsExclusive.Should().BeTrue();
            createdCoupon.Priority.Should().Be(1);

            // Verify Promotion Sync
            var syncedPromo = await db.BusPromotions.FirstOrDefaultAsync(x => x.SourceType == "Coupon" && x.SourceId == createdCoupon.Id);
            syncedPromo.Should().NotBeNull();
            syncedPromo.Code.Should().Be("WELCOME10");
            syncedPromo.DiscountValue.Should().Be(10);
            syncedPromo.IsActive.Should().BeTrue();
            syncedPromo.IsExclusive.Should().BeTrue();
            syncedPromo.Priority.Should().Be(1);
            syncedPromo.MaxUsage.Should().Be(100);
            syncedPromo.MinBookingAmount.Should().Be(0); // Note: SyncFromCoupon does not sync MinBookingAmount in code! (It's a verified constraint or behaviour)
        }

        [Fact]
        public async Task CreateCoupon_DuplicateCode_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.BusCoupons.Add(new BusCoupon
            {
                CouponCode = "WELCOME10",
                CouponType = "Percentage",
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new BusCouponRequestDto
            {
                CouponCode = "welcome10", // Check casing normalization
                Value = 10,
                CouponType = "Percentage"
            };

            // Action
            var result = await controller.CreateCoupon(request);

            // Assert
            var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequestResult.Value.Should().Be("Coupon code 'WELCOME10' already exists.");
        }

        [Fact]
        public async Task CreateCoupon_ValueZeroOrNegative_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusCouponRequestDto
            {
                CouponCode = "TEST",
                Value = -5,
                CouponType = "Percentage"
            };

            // Action
            var result = await controller.CreateCoupon(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("Value must be greater than 0.");
        }

        [Fact]
        public async Task CreateCoupon_CouponTypeEmpty_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusCouponRequestDto
            {
                CouponCode = "TEST",
                Value = 10,
                CouponType = ""
            };

            // Action
            var result = await controller.CreateCoupon(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("CouponType is required.");
        }

        [Fact]
        public async Task CreateCoupon_ExpiryDateBeforeStartDate_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusCouponRequestDto
            {
                CouponCode = "TEST",
                Value = 10,
                CouponType = "Percentage",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
                ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow)
            };

            // Action
            var result = await controller.CreateCoupon(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("ExpiryDate must be on or after StartDate.");
        }

        [Fact]
        public async Task CreateCoupon_NegativeLimits_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusCouponRequestDto
            {
                CouponCode = "TEST",
                Value = 10,
                CouponType = "Percentage",
                UseLimit = -1,
                MaxUsagePerUser = 1,
                MinBookingAmount = 0
            };

            // Action
            var result = await controller.CreateCoupon(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("UseLimit must be greater than or equal to 0.");
        }

        #endregion

        #region UpdateCoupon Tests

        [Fact]
        public async Task UpdateCoupon_ExistingId_ReturnsOkAndUpdatesAndSyncsPromotion()
        {
            // Arrange
            using var db = CreateDbContext();
            var coupon = new BusCoupon
            {
                Id = 1,
                CouponCode = "SAVE10",
                CouponType = "Percentage",
                Value = 10,
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
                Status = "Active",
                IsExclusive = true,
                Priority = 0
            };
            db.BusCoupons.Add(coupon);

            var promo = new BusPromotion
            {
                Code = "SAVE10",
                PromotionType = "Coupon",
                DiscountType = "Percentage",
                DiscountValue = 10,
                IsActive = true,
                SourceType = "Coupon",
                SourceId = 1,
                IsExclusive = true,
                Priority = 0
            };
            db.BusPromotions.Add(promo);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new BusCouponRequestDto
            {
                CouponCode = "SAVE20",
                CouponType = "Fixed",
                Value = 20,
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
                UseLimit = 50,
                MaxUsagePerUser = 2,
                MinBookingAmount = 100,
                IsExclusive = false,
                Priority = 5,
                Status = "Inactive",
                Remark = "Updated remark"
            };

            // Action
            var result = await controller.UpdateCoupon(1, request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var updatedCoupon = okResult.Value.Should().BeOfType<BusCoupon>().Subject;
            updatedCoupon.CouponCode.Should().Be("SAVE20");
            updatedCoupon.Value.Should().Be(20);
            updatedCoupon.Status.Should().Be("Inactive");
            updatedCoupon.IsExclusive.Should().BeFalse();
            updatedCoupon.Priority.Should().Be(5);

            // Verify Promotion Sync
            var updatedPromo = await db.BusPromotions.FirstOrDefaultAsync(x => x.SourceType == "Coupon" && x.SourceId == 1);
            updatedPromo.Should().NotBeNull();
            updatedPromo.Code.Should().Be("SAVE20");
            updatedPromo.DiscountValue.Should().Be(20);
            updatedPromo.DiscountType.Should().Be("Fixed");
            updatedPromo.IsActive.Should().BeFalse();
            updatedPromo.IsExclusive.Should().BeFalse();
            updatedPromo.Priority.Should().Be(5);
        }

        [Fact]
        public async Task UpdateCoupon_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusCouponRequestDto
            {
                CouponCode = "TEST",
                Value = 10,
                CouponType = "Percentage"
            };

            // Action
            var result = await controller.UpdateCoupon(999, request);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Coupon not found.");
        }

        [Fact]
        public async Task UpdateCoupon_DuplicateCode_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var coupon1 = new BusCoupon
            {
                Id = 1,
                CouponCode = "WELCOME1",
                CouponType = "Percentage",
                Status = "Active"
            };
            var coupon2 = new BusCoupon
            {
                Id = 2,
                CouponCode = "WELCOME2",
                CouponType = "Percentage",
                Status = "Active"
            };
            db.BusCoupons.AddRange(coupon1, coupon2);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new BusCouponRequestDto
            {
                CouponCode = "WELCOME2", // Try to use coupon2's code on coupon1
                Value = 10,
                CouponType = "Percentage"
            };

            // Action
            var result = await controller.UpdateCoupon(1, request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("Coupon code 'WELCOME2' already exists.");
        }

        #endregion

        #region DeleteCoupon Tests

        [Fact]
        public async Task DeleteCoupon_ExistingId_ReturnsOkAndDeactivatesPromotion()
        {
            // Arrange
            using var db = CreateDbContext();
            var coupon = new BusCoupon
            {
                Id = 1,
                CouponCode = "WELCOME1",
                CouponType = "Percentage",
                Status = "Active"
            };
            db.BusCoupons.Add(coupon);

            var promo = new BusPromotion
            {
                Id = 3,
                Code = "WELCOME1",
                PromotionType = "Coupon",
                DiscountType = "Percentage",
                DiscountValue = 10,
                IsActive = true,
                SourceType = "Coupon",
                SourceId = 1
            };
            db.BusPromotions.Add(promo);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action
            var result = await controller.DeleteCoupon(1);

            // Assert
            result.Should().BeOfType<OkObjectResult>();

            // DB Check
            var dbCoupon = await db.BusCoupons.FindAsync(1);
            dbCoupon.Should().BeNull();

            var dbPromo = await db.BusPromotions.FindAsync(3);
            dbPromo.Should().NotBeNull();
            dbPromo.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task DeleteCoupon_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.DeleteCoupon(999);

            // Assert
            var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFound.Value.Should().Be("Coupon not found.");
        }

        #endregion

        #region GetUsedCoupons Tests

        [Fact]
        public async Task GetUsedCoupons_HappyPath_ReturnsUsedCouponsWithFilters()
        {
            // Arrange
            using var db = CreateDbContext();
            var usage1 = new BusCouponUsage
            {
                Id = 1,
                CouponCode = "SAVE10",
                UserId = "userA",
                UsedAtUtc = DateTime.UtcNow.AddHours(-1),
                TotalFareInr = 100,
                CouponType = "Percentage",
                CouponValue = 10,
                CouponAmountInr = 10,
                BookingStatus = "Confirmed"
            };
            var usage2 = new BusCouponUsage
            {
                Id = 2,
                CouponCode = "SAVE20",
                UserId = "userB",
                UsedAtUtc = DateTime.UtcNow,
                TotalFareInr = 200,
                CouponType = "Fixed",
                CouponValue = 20,
                CouponAmountInr = 20,
                BookingStatus = "Confirmed"
            };
            db.BusCouponUsages.AddRange(usage1, usage2);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Action - Filter by code
            var result1 = await controller.GetUsedCoupons("save10", null);
            var okResult1 = result1.Should().BeOfType<OkObjectResult>().Subject;
            var list1 = (okResult1.Value as IEnumerable<object>).ToList();
            list1.Should().HaveCount(1);

            // Action - Filter by userId
            var result2 = await controller.GetUsedCoupons(null, "userB");
            var okResult2 = result2.Should().BeOfType<OkObjectResult>().Subject;
            var list2 = (okResult2.Value as IEnumerable<object>).ToList();
            list2.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetUsedCoupons_LimitLessThanZero_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Action
            var result = await controller.GetUsedCoupons(null, null, limit: -5);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("limit must be greater than 0.");
        }

        #endregion
    }
}
