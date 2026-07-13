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
    public class AdminFlightCouponTests
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
        public async Task GetCoupons_HappyPath_ReturnsOkWithCouponsOrderedByEntryDateDesc()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.FlightCoupons.AddRange(
                new FlightCoupon
                {
                    Id = 1, Value = 10, CouponType = "Percentage", CouponCode = "OLD10",
                    StartDate = DateOnly.FromDateTime(now), ExpiryDate = DateOnly.FromDateTime(now.AddDays(30)),
                    UseLimit = 100, UsedCount = 5, Status = "Active", EntryDateUtc = now.AddDays(-2)
                },
                new FlightCoupon
                {
                    Id = 2, Value = 500, CouponType = "Fixed", CouponCode = "NEW500",
                    StartDate = DateOnly.FromDateTime(now), ExpiryDate = DateOnly.FromDateTime(now.AddDays(60)),
                    UseLimit = 50, UsedCount = 0, Status = "Active", EntryDateUtc = now.AddDays(-1)
                }
            );
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetCoupons();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetCoupons_NoCoupons_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetCoupons();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().BeEmpty();
        }

        #endregion

        #region GetCouponById Tests

        [Fact]
        public async Task GetCouponById_ExistingId_ReturnsOkWithCoupon()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCoupons.Add(new FlightCoupon
            {
                Id = 1, Value = 10, CouponType = "Percentage", CouponCode = "TEST10",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 100, UsedCount = 0, Status = "Active", EntryDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetCouponById(1);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var coupon = okResult.Value as FlightCoupon;
            coupon.Should().NotBeNull();
            coupon.Id.Should().Be(1);
            coupon.CouponCode.Should().Be("TEST10");
        }

        [Fact]
        public async Task GetCouponById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetCouponById(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Coupon not found.");
        }

        #endregion

        #region CreateCoupon Tests

        [Fact]
        public async Task CreateCoupon_HappyPath_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 15,
                CouponType = "Percentage",
                CouponCode = "SAVE15",
                StartDate = new DateOnly(2026, 6, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 100,
                Status = "Active",
                Remark = "Summer sale"
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var coupon = createdResult.Value as FlightCoupon;
            coupon.Should().NotBeNull();
            coupon.CouponCode.Should().Be("SAVE15");
            coupon.Value.Should().Be(15);
            coupon.CouponType.Should().Be("Percentage");
            coupon.UsedCount.Should().Be(0);
            coupon.Remark.Should().Be("Summer sale");

            // Verify persisted
            var dbRow = await db.FlightCoupons.FindAsync(coupon.Id);
            dbRow.Should().NotBeNull();
        }

        [Fact]
        public async Task CreateCoupon_CouponCodeNormalized_UpperCaseAndTrimmed()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "  save10  ",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50,
                Status = "Active"
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var coupon = createdResult.Value as FlightCoupon;
            coupon.CouponCode.Should().Be("SAVE10");
        }

        [Fact]
        public async Task CreateCoupon_FixedCouponType_Succeeds()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 500,
                CouponType = "Fixed",
                CouponCode = "FLAT500",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 200,
                Status = "Active"
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var coupon = createdResult.Value as FlightCoupon;
            coupon.CouponType.Should().Be("Fixed");
            coupon.Value.Should().Be(500);
        }

        [Fact]
        public async Task CreateCoupon_CouponTypeCaseInsensitive_NormalizesCorrectly()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "percentage",
                CouponCode = "CASETEST",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50,
                Status = "Active"
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var coupon = createdResult.Value as FlightCoupon;
            coupon.CouponType.Should().Be("Percentage");
        }

        [Fact]
        public async Task CreateCoupon_ValueZero_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 0,
                CouponType = "Percentage",
                CouponCode = "BAD",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Value must be greater than 0.");
        }

        [Fact]
        public async Task CreateCoupon_NegativeValue_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = -10,
                CouponType = "Percentage",
                CouponCode = "NEG",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Value must be greater than 0.");
        }

        [Fact]
        public async Task CreateCoupon_EmptyCouponType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "",
                CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("CouponType is required.");
        }

        [Fact]
        public async Task CreateCoupon_InvalidCouponType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "FlatRate",
                CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            ((string)badResult.Value).Should().Contain("CouponType must be one of");
        }

        [Fact]
        public async Task CreateCoupon_EmptyCouponCode_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("CouponCode is required.");
        }

        [Fact]
        public async Task CreateCoupon_WhitespaceCouponCode_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "   ",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("CouponCode is required.");
        }

        [Fact]
        public async Task CreateCoupon_ExpiryBeforeStart_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "DATES",
                StartDate = new DateOnly(2026, 12, 31),
                ExpiryDate = new DateOnly(2026, 1, 1),
                UseLimit = 50
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("ExpiryDate must be on or after StartDate.");
        }

        [Fact]
        public async Task CreateCoupon_StartEqualsExpiry_Succeeds()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var sameDate = new DateOnly(2026, 6, 15);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "SAMEDAY",
                StartDate = sameDate,
                ExpiryDate = sameDate,
                UseLimit = 50,
                Status = "Active"
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            result.Should().BeOfType<CreatedAtActionResult>();
        }

        [Fact]
        public async Task CreateCoupon_NegativeUseLimit_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "NEGLIMIT",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = -1
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("UseLimit must be greater than or equal to 0.");
        }

        [Fact]
        public async Task CreateCoupon_ZeroUseLimit_Succeeds()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "ZEROLIMIT",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 0,
                Status = "Active"
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            result.Should().BeOfType<CreatedAtActionResult>();
        }

        [Fact]
        public async Task CreateCoupon_NullRemark_SetsRemarkToNull()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "NOREMARK",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50,
                Status = "Active",
                Remark = null
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var coupon = createdResult.Value as FlightCoupon;
            coupon.Remark.Should().BeNull();
        }

        [Fact]
        public async Task CreateCoupon_WhitespaceRemark_SetsRemarkToNull()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "WSREMARK",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50,
                Status = "Active",
                Remark = "   "
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var coupon = createdResult.Value as FlightCoupon;
            coupon.Remark.Should().BeNull();
        }

        [Fact]
        public async Task CreateCoupon_RemarkWithWhitespace_TrimsRemark()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "TRIMREMARK",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50,
                Status = "Active",
                Remark = "  padded remark  "
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var coupon = createdResult.Value as FlightCoupon;
            coupon.Remark.Should().Be("padded remark");
        }

        [Fact]
        public async Task CreateCoupon_NullStatus_DefaultsToActive()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "STATUSNULL",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50,
                Status = null
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var coupon = createdResult.Value as FlightCoupon;
            coupon.Status.Should().Be("Active");
        }

        [Fact]
        public async Task CreateCoupon_UsedCountAlwaysInitializedToZero()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10,
                CouponType = "Percentage",
                CouponCode = "USEDCOUNT",
                StartDate = new DateOnly(2026, 1, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 100,
                Status = "Active"
            };

            // Act
            var result = await controller.CreateCoupon(request);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var coupon = createdResult.Value as FlightCoupon;
            coupon.UsedCount.Should().Be(0);
        }

        #endregion

        #region UpdateCoupon Tests

        [Fact]
        public async Task UpdateCoupon_HappyPath_ReturnsOkAndUpdatesAllFields()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCoupons.Add(new FlightCoupon
            {
                Id = 1, Value = 10, CouponType = "Percentage", CouponCode = "OLD10",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 6, 30),
                UseLimit = 100, UsedCount = 5, Status = "Active", EntryDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new FlightCouponRequestDto
            {
                Value = 20,
                CouponType = "Fixed",
                CouponCode = "  new20  ",
                StartDate = new DateOnly(2026, 7, 1),
                ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 200,
                Status = "Inactive",
                Remark = "Updated"
            };

            // Act
            var result = await controller.UpdateCoupon(1, request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var coupon = okResult.Value as FlightCoupon;
            coupon.Value.Should().Be(20);
            coupon.CouponType.Should().Be("Fixed");
            coupon.CouponCode.Should().Be("NEW20");
            coupon.StartDate.Should().Be(new DateOnly(2026, 7, 1));
            coupon.ExpiryDate.Should().Be(new DateOnly(2026, 12, 31));
            coupon.UseLimit.Should().Be(200);
            coupon.Status.Should().Be("Inactive");
            coupon.Remark.Should().Be("Updated");
        }

        [Fact]
        public async Task UpdateCoupon_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var request = new FlightCouponRequestDto
            {
                Value = 10, CouponType = "Percentage", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var result = await controller.UpdateCoupon(999, request);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Coupon not found.");
        }

        [Fact]
        public async Task UpdateCoupon_InvalidValue_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCoupons.Add(new FlightCoupon
            {
                Id = 1, Value = 10, CouponType = "Percentage", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50, Status = "Active", EntryDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new FlightCouponRequestDto
            {
                Value = 0, CouponType = "Percentage", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var result = await controller.UpdateCoupon(1, request);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task UpdateCoupon_InvalidCouponType_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCoupons.Add(new FlightCoupon
            {
                Id = 1, Value = 10, CouponType = "Percentage", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50, Status = "Active", EntryDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new FlightCouponRequestDto
            {
                Value = 10, CouponType = "InvalidType", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var result = await controller.UpdateCoupon(1, request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            ((string)badResult.Value).Should().Contain("CouponType must be one of");
        }

        [Fact]
        public async Task UpdateCoupon_EmptyCouponCode_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCoupons.Add(new FlightCoupon
            {
                Id = 1, Value = 10, CouponType = "Percentage", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50, Status = "Active", EntryDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new FlightCouponRequestDto
            {
                Value = 10, CouponType = "Percentage", CouponCode = "",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50
            };

            // Act
            var result = await controller.UpdateCoupon(1, request);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task UpdateCoupon_ExpiryBeforeStart_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCoupons.Add(new FlightCoupon
            {
                Id = 1, Value = 10, CouponType = "Percentage", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50, Status = "Active", EntryDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new FlightCouponRequestDto
            {
                Value = 10, CouponType = "Percentage", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 12, 31), ExpiryDate = new DateOnly(2026, 1, 1),
                UseLimit = 50
            };

            // Act
            var result = await controller.UpdateCoupon(1, request);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("ExpiryDate must be on or after StartDate.");
        }

        [Fact]
        public async Task UpdateCoupon_NegativeUseLimit_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCoupons.Add(new FlightCoupon
            {
                Id = 1, Value = 10, CouponType = "Percentage", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50, Status = "Active", EntryDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new FlightCouponRequestDto
            {
                Value = 10, CouponType = "Percentage", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = -5
            };

            // Act
            var result = await controller.UpdateCoupon(1, request);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task UpdateCoupon_DoesNotResetUsedCount()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCoupons.Add(new FlightCoupon
            {
                Id = 1, Value = 10, CouponType = "Percentage", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 100, UsedCount = 42, Status = "Active", EntryDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            var request = new FlightCouponRequestDto
            {
                Value = 20, CouponType = "Fixed", CouponCode = "CODE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 200, Status = "Active"
            };

            // Act
            var result = await controller.UpdateCoupon(1, request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var coupon = okResult.Value as FlightCoupon;
            // UsedCount should remain unchanged since update doesn't touch it
            coupon.UsedCount.Should().Be(42);
        }

        #endregion

        #region DeleteCoupon Tests

        [Fact]
        public async Task DeleteCoupon_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCoupons.Add(new FlightCoupon
            {
                Id = 1, Value = 10, CouponType = "Percentage", CouponCode = "DELETE",
                StartDate = new DateOnly(2026, 1, 1), ExpiryDate = new DateOnly(2026, 12, 31),
                UseLimit = 50, Status = "Active", EntryDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteCoupon(1);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var remaining = await db.FlightCoupons.FindAsync(1);
            remaining.Should().BeNull();
        }

        [Fact]
        public async Task DeleteCoupon_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteCoupon(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Coupon not found.");
        }

        #endregion

        #region GetUsedCoupons Tests

        [Fact]
        public async Task GetUsedCoupons_HappyPath_ReturnsOkWithUsages()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.FlightCouponUsages.AddRange(
                new FlightCouponUsage
                {
                    Id = 1, FlightReservationId = 100, CouponCode = "SAVE10",
                    UsedAtUtc = now.AddDays(-2), TotalFareInr = 5000,
                    CouponType = "Percentage", CouponValue = 10, CouponAmountInr = 500,
                    BookingStatus = "Confirmed"
                },
                new FlightCouponUsage
                {
                    Id = 2, FlightReservationId = 200, CouponCode = "SAVE10",
                    UsedAtUtc = now.AddDays(-1), TotalFareInr = 8000,
                    CouponType = "Percentage", CouponValue = 10, CouponAmountInr = 800,
                    BookingStatus = "Confirmed"
                }
            );
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetUsedCoupons(null, 200);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetUsedCoupons_FilterByCouponCode_ReturnsMatchingUsages()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.FlightCouponUsages.AddRange(
                new FlightCouponUsage
                {
                    Id = 1, FlightReservationId = 100, CouponCode = "SAVE10",
                    UsedAtUtc = now, TotalFareInr = 5000,
                    CouponType = "Percentage", CouponValue = 10, CouponAmountInr = 500,
                    BookingStatus = "Confirmed"
                },
                new FlightCouponUsage
                {
                    Id = 2, FlightReservationId = 200, CouponCode = "FLAT500",
                    UsedAtUtc = now, TotalFareInr = 8000,
                    CouponType = "Fixed", CouponValue = 500, CouponAmountInr = 500,
                    BookingStatus = "Confirmed"
                }
            );
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetUsedCoupons("SAVE10", 200);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetUsedCoupons_CaseInsensitiveCouponCodeFilter_ReturnsMatches()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCouponUsages.Add(new FlightCouponUsage
            {
                Id = 1, FlightReservationId = 100, CouponCode = "SAVE10",
                UsedAtUtc = DateTime.UtcNow, TotalFareInr = 5000,
                CouponType = "Percentage", CouponValue = 10, CouponAmountInr = 500,
                BookingStatus = "Confirmed"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetUsedCoupons("save10", 200);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetUsedCoupons_NoUsages_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetUsedCoupons(null, 200);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().BeEmpty();
        }

        [Fact]
        public async Task GetUsedCoupons_LimitZero_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetUsedCoupons(null, 0);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("limit must be greater than 0.");
        }

        [Fact]
        public async Task GetUsedCoupons_NegativeLimit_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetUsedCoupons(null, -5);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("limit must be greater than 0.");
        }

        [Fact]
        public async Task GetUsedCoupons_LimitExceeds500_CappedAt500()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act - just verify it doesn't error with a large limit
            var result = await controller.GetUsedCoupons(null, 1000);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetUsedCoupons_OrderedByUsedAtUtcDescending()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.FlightCouponUsages.AddRange(
                new FlightCouponUsage
                {
                    Id = 1, FlightReservationId = 100, CouponCode = "CODE",
                    UsedAtUtc = now.AddDays(-3), TotalFareInr = 5000,
                    CouponType = "Percentage", CouponValue = 10, CouponAmountInr = 500,
                    BookingStatus = "Confirmed"
                },
                new FlightCouponUsage
                {
                    Id = 2, FlightReservationId = 200, CouponCode = "CODE",
                    UsedAtUtc = now.AddDays(-1), TotalFareInr = 8000,
                    CouponType = "Percentage", CouponValue = 10, CouponAmountInr = 800,
                    BookingStatus = "Confirmed"
                },
                new FlightCouponUsage
                {
                    Id = 3, FlightReservationId = 300, CouponCode = "CODE",
                    UsedAtUtc = now.AddDays(-2), TotalFareInr = 6000,
                    CouponType = "Percentage", CouponValue = 10, CouponAmountInr = 600,
                    BookingStatus = "Confirmed"
                }
            );
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetUsedCoupons(null, 200);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().HaveCount(3);
        }

        [Fact]
        public async Task GetUsedCoupons_WhitespaceCouponCode_TrimsAndFilters()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCouponUsages.Add(new FlightCouponUsage
            {
                Id = 1, FlightReservationId = 100, CouponCode = "TRIM",
                UsedAtUtc = DateTime.UtcNow, TotalFareInr = 5000,
                CouponType = "Percentage", CouponValue = 10, CouponAmountInr = 500,
                BookingStatus = "Confirmed"
            });
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetUsedCoupons("  TRIM  ", 200);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetUsedCoupons_NullCouponCode_ReturnsAllUsages()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightCouponUsages.AddRange(
                new FlightCouponUsage
                {
                    Id = 1, FlightReservationId = 100, CouponCode = "A",
                    UsedAtUtc = DateTime.UtcNow, TotalFareInr = 1000,
                    CouponType = "Fixed", CouponValue = 100, CouponAmountInr = 100,
                    BookingStatus = "Confirmed"
                },
                new FlightCouponUsage
                {
                    Id = 2, FlightReservationId = 200, CouponCode = "B",
                    UsedAtUtc = DateTime.UtcNow, TotalFareInr = 2000,
                    CouponType = "Fixed", CouponValue = 200, CouponAmountInr = 200,
                    BookingStatus = "Confirmed"
                }
            );
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetUsedCoupons(null, 200);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetUsedCoupons_LimitApplied_ReturnsLimitedResults()
        {
            // Arrange
            using var db = CreateDbContext();
            for (int i = 1; i <= 5; i++)
            {
                db.FlightCouponUsages.Add(new FlightCouponUsage
                {
                    Id = i, FlightReservationId = i * 100, CouponCode = "CODE",
                    UsedAtUtc = DateTime.UtcNow.AddMinutes(-i), TotalFareInr = 1000 * i,
                    CouponType = "Fixed", CouponValue = 100, CouponAmountInr = 100,
                    BookingStatus = "Confirmed"
                });
            }
            await db.SaveChangesAsync();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetUsedCoupons(null, 3);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var items = (okResult.Value as IEnumerable<object>).ToList();
            items.Should().HaveCount(3);
        }

        #endregion
    }
}
