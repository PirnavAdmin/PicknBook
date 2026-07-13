#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FluentAssertions;
using Moq;
using Xunit;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Tests.Unit
{
    public class AdminBusConvenienceFeeTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        #region GetConvenienceFee Tests

        [Fact]
        public async Task GetConvenienceFee_NoFeeConfigured_ReturnsOkWithMessage()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Act
            var result = await controller.GetConvenienceFee();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().BeEquivalentTo(new { message = "No convenience fee configured." });
        }

        [Fact]
        public async Task GetConvenienceFee_FeeConfigured_ReturnsOkWithFee()
        {
            // Arrange
            using var db = CreateDbContext();
            var fee = new BusConvenienceFee
            {
                Id = 1,
                FeeInr = 150,
                EntryDateUtc = DateTime.UtcNow,
                UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "admin",
                Status = "Active"
            };
            db.BusConvenienceFees.Add(fee);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Act
            var result = await controller.GetConvenienceFee();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedFee = okResult.Value.Should().BeOfType<BusConvenienceFee>().Subject;
            returnedFee.Id.Should().Be(1);
            returnedFee.FeeInr.Should().Be(150);
        }

        [Fact]
        public async Task GetConvenienceFee_MultipleFeesConfigured_ReturnsOkWithLatestFeeByUpdateDate()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            var fee1 = new BusConvenienceFee
            {
                Id = 1,
                FeeInr = 100,
                UpdateDateUtc = now.AddMinutes(-5)
            };
            var fee2 = new BusConvenienceFee
            {
                Id = 2,
                FeeInr = 200,
                UpdateDateUtc = now // Latest
            };
            db.BusConvenienceFees.AddRange(fee1, fee2);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);

            // Act
            var result = await controller.GetConvenienceFee();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedFee = okResult.Value.Should().BeOfType<BusConvenienceFee>().Subject;
            returnedFee.Id.Should().Be(2);
            returnedFee.FeeInr.Should().Be(200);
        }

        [Fact]
        public async Task GetConvenienceFee_DbThrowsException_PropagatesException()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            db.Dispose();

            // Act & Assert
            await Assert.ThrowsAsync<ObjectDisposedException>(() => controller.GetConvenienceFee());
        }

        #endregion

        #region UpdateConvenienceFee Tests

        [Fact]
        public async Task UpdateConvenienceFee_NoExistingFee_CreatesNewFeeAndReturnsOk()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusConvenienceFeeRequestDto
            {
                FeeInr = 120,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var result = await controller.UpdateConvenienceFee(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedFee = okResult.Value.Should().BeOfType<BusConvenienceFee>().Subject;
            returnedFee.Id.Should().BeGreaterThan(0);
            returnedFee.FeeInr.Should().Be(120);
            returnedFee.Status.Should().Be("Active");
            returnedFee.UpdatedBy.Should().Be("admin");
            returnedFee.EntryDateUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
            returnedFee.UpdateDateUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

            // Verify in DB
            var dbFee = await db.BusConvenienceFees.FirstOrDefaultAsync();
            dbFee.Should().NotBeNull();
            dbFee.FeeInr.Should().Be(120);
        }

        [Fact]
        public async Task UpdateConvenienceFee_ExistingFee_UpdatesExistingFeeAndReturnsOk()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            var existing = new BusConvenienceFee
            {
                Id = 10,
                FeeInr = 100,
                EntryDateUtc = now.AddDays(-1),
                UpdateDateUtc = now.AddDays(-1),
                UpdatedBy = "old_admin",
                Status = "Active"
            };
            db.BusConvenienceFees.Add(existing);
            await db.SaveChangesAsync();

            var controller = new AdminBusController(db);
            var request = new BusConvenienceFeeRequestDto
            {
                FeeInr = 180,
                Status = "Inactive",
                UpdatedBy = "new_admin"
            };

            // Act
            var result = await controller.UpdateConvenienceFee(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedFee = okResult.Value.Should().BeOfType<BusConvenienceFee>().Subject;
            returnedFee.Id.Should().Be(10); // same ID updated
            returnedFee.FeeInr.Should().Be(180);
            returnedFee.Status.Should().Be("Inactive");
            returnedFee.UpdatedBy.Should().Be("new_admin");
            returnedFee.UpdateDateUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

            // Verify in DB
            var dbFee = await db.BusConvenienceFees.FindAsync(10);
            dbFee.FeeInr.Should().Be(180);
        }

        [Fact]
        public async Task UpdateConvenienceFee_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);

            // Act
            var result = await controller.UpdateConvenienceFee(null);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("Request payload is required.");
        }

        [Fact]
        public async Task UpdateConvenienceFee_EmptyUpdatedByAndStatus_NormalizesToSystemAndActive()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusConvenienceFeeRequestDto
            {
                FeeInr = 50,
                Status = "",
                UpdatedBy = ""
            };

            // Act
            var result = await controller.UpdateConvenienceFee(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedFee = okResult.Value.Should().BeOfType<BusConvenienceFee>().Subject;
            returnedFee.Status.Should().Be("Active"); // Default normalized
            returnedFee.UpdatedBy.Should().Be("system"); // Default normalized
        }

        [Fact]
        public async Task UpdateConvenienceFee_NegativeFee_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusConvenienceFeeRequestDto
            {
                FeeInr = -10,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var result = await controller.UpdateConvenienceFee(request);

            // Assert
            var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badRequest.Value.Should().Be("Fee must be greater than or equal to 0.");
        }

        [Fact]
        public async Task UpdateConvenienceFee_ZeroFee_ReturnsOkAndSaves()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request = new BusConvenienceFeeRequestDto
            {
                FeeInr = 0,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act
            var result = await controller.UpdateConvenienceFee(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedFee = okResult.Value.Should().BeOfType<BusConvenienceFee>().Subject;
            returnedFee.FeeInr.Should().Be(0);
        }

        private class ThrowingDbContext : AppDbContext
        {
            private readonly Exception _exceptionToThrow;

            public ThrowingDbContext(DbContextOptions<AppDbContext> options, Exception exceptionToThrow)
                : base(options)
            {
                _exceptionToThrow = exceptionToThrow;
            }

            public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
            {
                throw _exceptionToThrow;
            }
        }

        [Fact]
        public async Task UpdateConvenienceFee_DbThrowsException_PropagatesException()
        {
            // Arrange
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            using var db = new ThrowingDbContext(options, new Exception("Database save error"));
            var controller = new AdminBusController(db);
            var request = new BusConvenienceFeeRequestDto
            {
                FeeInr = 100,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<Exception>(() => controller.UpdateConvenienceFee(request));
            ex.Message.Should().Be("Database save error");
        }

        [Fact]
        public async Task UpdateConvenienceFee_DbUpdateConcurrencyException_ThrowsConcurrencyException()
        {
            // Arrange
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            using var db = new ThrowingDbContext(options, new DbUpdateConcurrencyException("Concurrency issue occurred"));
            var controller = new AdminBusController(db);
            var request = new BusConvenienceFeeRequestDto
            {
                FeeInr = 100,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act & Assert
            await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => controller.UpdateConvenienceFee(request));
        }

        [Fact]
        public async Task UpdateConvenienceFee_DuplicateRequests_UpdatesCorrectly()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminBusController(db);
            var request1 = new BusConvenienceFeeRequestDto
            {
                FeeInr = 100,
                Status = "Active",
                UpdatedBy = "admin"
            };
            var request2 = new BusConvenienceFeeRequestDto
            {
                FeeInr = 150,
                Status = "Active",
                UpdatedBy = "admin"
            };

            // Act - first update
            await controller.UpdateConvenienceFee(request1);
            // Act - second update
            var result = await controller.UpdateConvenienceFee(request2);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedFee = okResult.Value.Should().BeOfType<BusConvenienceFee>().Subject;
            returnedFee.FeeInr.Should().Be(150);

            // Ensure only one record in DB
            var count = await db.BusConvenienceFees.CountAsync();
            count.Should().Be(1);
        }

        #endregion
    }
}
