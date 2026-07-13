#nullable disable

using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;
using Microsoft.AspNetCore.Identity;

namespace PickNBook.Api.Tests.Unit;

public class AuthControllerTests
{
    private readonly Mock<IJwtService> _jwtServiceMock = new();
    private readonly Mock<IEmailService> _emailServiceMock = new();
    private readonly Mock<ISmsService> _smsServiceMock = new();
    private readonly PasswordHasher<User> _passwordHasher = new();
    private readonly IConfiguration _configuration;

    public AuthControllerTests()
    {
        var inMemorySettings = new Dictionary<string, string> {
            {"AdminAuth:OtpExpiryMinutes", "5"},
            {"AdminAuth:MaxOtpAttempts", "5"}
        };

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private void SetupControllerContext(ControllerBase controller)
    {
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    [Fact]
    public async Task Login_ShouldBlock_WhenUserIsInactive()
    {
        // Arrange
        using var db = CreateDbContext();
        var user = new User
        {
            Id = 1,
            FirstName = "Inactive",
            LastName = "User",
            Email = "inactive@example.com",
            PhoneNumber = "12345",
            Role = AuthRoles.User,
            Status = "Inactive"
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, "Password123");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = new AuthController(
            db,
            _jwtServiceMock.Object,
            _emailServiceMock.Object,
            _smsServiceMock.Object,
            _configuration);
        SetupControllerContext(controller);

        var request = new LoginRequest
        {
            Email = "inactive@example.com",
            Password = "Password123"
        };

        // Act
        var result = await controller.Login(request);

        // Assert
        var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().Be("Your account is inactive. Please contact support.");
    }

    [Fact]
    public async Task Login_ShouldSucceed_WhenUserIsActive()
    {
        // Arrange
        using var db = CreateDbContext();
        var user = new User
        {
            Id = 2,
            FirstName = "Active",
            LastName = "User",
            Email = "active@example.com",
            PhoneNumber = "12345",
            Role = AuthRoles.User,
            Status = "Active"
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, "Password123");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        _jwtServiceMock.Setup(x => x.GenerateToken(It.IsAny<User>(), It.IsAny<string>()))
            .Returns("fake-jwt-token");

        var controller = new AuthController(
            db,
            _jwtServiceMock.Object,
            _emailServiceMock.Object,
            _smsServiceMock.Object,
            _configuration);
        SetupControllerContext(controller);

        var request = new LoginRequest
        {
            Email = "active@example.com",
            Password = "Password123"
        };

        // Act
        var result = await controller.Login(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var data = okResult.Value;
        data.GetType().GetProperty("token")?.GetValue(data).Should().Be("fake-jwt-token");
    }
}
