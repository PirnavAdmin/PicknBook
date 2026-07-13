#nullable disable

using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace PickNBook.Api.Tests.Unit;

public class DepositRequestsControllerTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private void SetupControllerUser(DepositRequestsController controller, string userIdClaim = "1")
    {
        var claims = new List<Claim> { new Claim(ClaimTypes.NameIdentifier, userIdClaim) };
        var identity = new ClaimsIdentity(claims, "TestAuthType");
        var claimsPrincipal = new ClaimsPrincipal(identity);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };
    }

    [Fact]
    public async Task GetDepositRequests_RetrievesAndFiltersCorrectly()
    {
        // Arrange
        using var db = CreateDbContext();
        var user1 = new User { Id = 101, FirstName = "Charan", LastName = "Reddy", Email = "charan@example.com", Role = AuthRoles.User };
        var user2 = new User { Id = 102, FirstName = "Amrutha", LastName = "Reddy", Email = "amrutha@example.com", Role = AuthRoles.User };
        db.Users.AddRange(user1, user2);

        db.DepositRequests.AddRange(
            new DepositRequest { Id = 1, UserId = 101, Amount = 4000, Type = "NEFT", Status = "Rejected", UserRemark = "traction done", EntryDateUtc = new DateTime(2026, 3, 16) },
            new DepositRequest { Id = 2, UserId = 102, Amount = 2500, Type = "Cash", Status = "Pending", UserRemark = "-", EntryDateUtc = new DateTime(2026, 3, 13) }
        );
        await db.SaveChangesAsync();

        var controller = new DepositRequestsController(db);
        SetupControllerUser(controller);

        // Act
        var resultAll = await controller.GetDepositRequests("All", "All", null);
        var resultPending = await controller.GetDepositRequests("Pending", "All", null);
        var resultSearch = await controller.GetDepositRequests("All", "All", "Charan");

        // Assert
        var okAll = resultAll.Should().BeOfType<OkObjectResult>().Subject;
        var listAll = okAll.Value as List<DepositRequestDto>;
        listAll.Should().HaveCount(2);

        var okPending = resultPending.Should().BeOfType<OkObjectResult>().Subject;
        var listPending = okPending.Value as List<DepositRequestDto>;
        listPending.Should().HaveCount(1);
        listPending[0].Id.Should().Be(2);

        var okSearch = resultSearch.Should().BeOfType<OkObjectResult>().Subject;
        var listSearch = okSearch.Value as List<DepositRequestDto>;
        listSearch.Should().HaveCount(1);
        listSearch[0].User.Should().Contain("Charan");
    }

    [Fact]
    public async Task CycleDepositStatus_TransitionsAndCreditsWalletCorrectly()
    {
        // Arrange
        using var db = CreateDbContext();
        var user = new User { Id = 101, FirstName = "Charan", LastName = "Reddy", Role = AuthRoles.User, WalletBalance = 10.00m, WalletStatus = "Inactive" };
        db.Users.Add(user);

        var request = new DepositRequest { Id = 1, UserId = 101, Amount = 4000, Type = "NEFT", Status = "Pending" };
        db.DepositRequests.Add(request);
        await db.SaveChangesAsync();

        var controller = new DepositRequestsController(db);
        SetupControllerUser(controller);

        // Act 1: Pending -> Approved
        var result1 = await controller.CycleDepositStatus(1);

        // Assert 1: Wallet credited and wallet status set to Active
        result1.Should().BeOfType<OkObjectResult>();
        request.Status.Should().Be("Approved");
        user.WalletBalance.Should().Be(4010.00m);
        user.WalletStatus.Should().Be("Active");

        // Act 2: Approved -> Rejected
        var result2 = await controller.CycleDepositStatus(1);

        // Assert 2: Wallet balance deducted (4010 - 4000 = 10)
        result2.Should().BeOfType<OkObjectResult>();
        request.Status.Should().Be("Rejected");
        user.WalletBalance.Should().Be(10.00m);

        // Act 3: Rejected -> Pending
        var result3 = await controller.CycleDepositStatus(1);

        // Assert 3: No wallet balance changes
        result3.Should().BeOfType<OkObjectResult>();
        request.Status.Should().Be("Pending");
        user.WalletBalance.Should().Be(10.00m);
    }

    [Fact]
    public async Task UpdateAdminRemark_UpdatesSuccessfully()
    {
        // Arrange
        using var db = CreateDbContext();
        var request = new DepositRequest { Id = 1, UserId = 101, Amount = 4000, Type = "NEFT", Status = "Pending", AdminRemark = "" };
        db.DepositRequests.Add(request);
        await db.SaveChangesAsync();

        var controller = new DepositRequestsController(db);
        SetupControllerUser(controller);

        var remarkDto = new UpdateAdminRemarkRequest { AdminRemark = "Approved after verification" };

        // Act
        var result = await controller.UpdateAdminRemark(1, remarkDto);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        request.AdminRemark.Should().Be("Approved after verification");
    }
}
