#nullable disable

using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace PickNBook.Api.Tests.Unit;

public class CustomersControllerTests
{
    private readonly PasswordHasher<User> _passwordHasher = new();

    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private void SetupControllerUser(CustomersController controller, string userIdClaim = "1")
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
    public async Task GetCustomers_FiltersAndReturnsCorrectly()
    {
        // Arrange
        using var db = CreateDbContext();
        db.Users.AddRange(
            new User { Id = 1, FirstName = "John", LastName = "Doe", Email = "john@example.com", PhoneNumber = "12345", Role = AuthRoles.User, Status = "Active", WalletStatus = "Active", WalletBalance = 50.00m },
            new User { Id = 2, FirstName = "Jane", LastName = "Smith", Email = "jane@example.com", PhoneNumber = "67890", Role = AuthRoles.User, Status = "Inactive", WalletStatus = "Active", WalletBalance = 100.00m },
            new User { Id = 3, FirstName = "Admin", LastName = "User", Email = "admin@example.com", PhoneNumber = "55555", Role = AuthRoles.Admin, Status = "Active", WalletStatus = "Inactive", WalletBalance = 0.00m }
        );
        await db.SaveChangesAsync();

        var controller = new CustomersController(db, _passwordHasher);
        SetupControllerUser(controller);

        // Act & Assert
        var resultAll = await controller.GetCustomers("All", "All", null, null, null);
        var okAll = resultAll.Should().BeOfType<OkObjectResult>().Subject;
        var listAll = okAll.Value as List<CustomerResponseDto>;
        listAll.Should().HaveCount(2); // Only Users, not Admin

        var resultInactive = await controller.GetCustomers("Inactive", "All", null, null, null);
        var okInactive = resultInactive.Should().BeOfType<OkObjectResult>().Subject;
        var listInactive = okInactive.Value as List<CustomerResponseDto>;
        listInactive.Should().HaveCount(1);
        listInactive[0].EmailId.Should().Be("jane@example.com");

        var resultSearch = await controller.GetCustomers("All", "All", "john", null, null);
        var okSearch = resultSearch.Should().BeOfType<OkObjectResult>().Subject;
        var listSearch = okSearch.Value as List<CustomerResponseDto>;
        listSearch.Should().HaveCount(1);
        listSearch[0].CustomerName.Should().Be("John Doe");
    }

    [Fact]
    public async Task CreateCustomer_HappyPath_CreatesAndHashesPassword()
    {
        // Arrange
        using var db = CreateDbContext();
        var controller = new CustomersController(db, _passwordHasher);
        SetupControllerUser(controller);

        var request = new CreateCustomerRequest
        {
            FirstName = "Alice",
            LastName = "Green",
            Email = "alice@example.com",
            Mobile = "999999",
            Password = "SecurePassword123",
            Status = "Active",
            WalletStatus = "Active"
        };

        // Act
        var result = await controller.CreateCustomer(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var data = okResult.Value;
        var customerId = data.GetType().GetProperty("customerId")?.GetValue(data) as int?;
        customerId.Should().NotBeNull();

        var dbUser = await db.Users.FindAsync(customerId.Value);
        dbUser.Should().NotBeNull();
        dbUser.FirstName.Should().Be("Alice");
        dbUser.Email.Should().Be("alice@example.com");
        dbUser.PasswordHash.Should().NotBeNullOrWhiteSpace();
        _passwordHasher.VerifyHashedPassword(dbUser, dbUser.PasswordHash, "SecurePassword123").Should().Be(PasswordVerificationResult.Success);
    }

    [Fact]
    public async Task CreateCustomer_ConflictEmailOrPhone_ReturnsBadRequest()
    {
        // Arrange
        using var db = CreateDbContext();
        db.Users.Add(new User { Id = 1, FirstName = "Existing", LastName = "User", Email = "exist@example.com", PhoneNumber = "12345", Role = AuthRoles.User });
        await db.SaveChangesAsync();

        var controller = new CustomersController(db, _passwordHasher);
        SetupControllerUser(controller);

        var requestConflictEmail = new CreateCustomerRequest
        {
            FirstName = "New",
            LastName = "User",
            Email = "exist@example.com",
            Mobile = "55555",
            Password = "Password"
        };

        var requestConflictPhone = new CreateCustomerRequest
        {
            FirstName = "New",
            LastName = "User",
            Email = "new@example.com",
            Mobile = "12345",
            Password = "Password"
        };

        // Act
        var resEmail = await controller.CreateCustomer(requestConflictEmail);
        var resPhone = await controller.CreateCustomer(requestConflictPhone);

        // Assert
        resEmail.Should().BeOfType<BadRequestObjectResult>();
        resPhone.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ToggleStatus_TogglesCorrectly()
    {
        // Arrange
        using var db = CreateDbContext();
        var user = new User { Id = 1, FirstName = "John", LastName = "Doe", Email = "john@example.com", PhoneNumber = "12345", Role = AuthRoles.User, Status = "Active" };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = new CustomersController(db, _passwordHasher);
        SetupControllerUser(controller);

        // Act
        var result = await controller.ToggleStatus(1);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        user.Status.Should().Be("Inactive");

        await controller.ToggleStatus(1);
        user.Status.Should().Be("Active");
    }

    [Fact]
    public async Task AddWalletBalance_IncreasesBalanceAndActivatesWallet()
    {
        // Arrange
        using var db = CreateDbContext();
        var user = new User { Id = 1, FirstName = "John", LastName = "Doe", Email = "john@example.com", PhoneNumber = "12345", Role = AuthRoles.User, WalletBalance = 10.00m, WalletStatus = "Inactive" };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = new CustomersController(db, _passwordHasher);
        SetupControllerUser(controller);

        var request = new AddWalletBalanceRequest { Amount = 15.50m };

        // Act
        var result = await controller.AddWalletBalance(1, request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        user.WalletBalance.Should().Be(25.50m);
        user.WalletStatus.Should().Be("Active");
    }

    [Fact]
    public async Task ResetWalletBalance_SetsBalanceToZero()
    {
        // Arrange
        using var db = CreateDbContext();
        var user = new User { Id = 1, FirstName = "John", LastName = "Doe", Email = "john@example.com", PhoneNumber = "12345", Role = AuthRoles.User, WalletBalance = 100.00m };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = new CustomersController(db, _passwordHasher);
        SetupControllerUser(controller);

        // Act
        var result = await controller.ResetWalletBalance(1);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        user.WalletBalance.Should().Be(0.00m);
    }
}
