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
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace PickNBook.Api.Tests.Unit;

public class MenuItemsControllerTests
{
    private AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private void SetupControllerUser(MenuItemsController controller, string userIdClaim = "1")
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
    public async Task GetActiveMenuItems_ReturnsFilteredAndSortedItems()
    {
        // Arrange
        using var db = CreateDbContext();
        db.MenuItems.AddRange(
            new MenuItem { Id = 1, Name = "Item 1", Slug = "slug1", DisplayTitle = "Title 1", Order = 2, Module = "B2C", Location = "header", Status = "active" },
            new MenuItem { Id = 2, Name = "Item 2", Slug = "slug2", DisplayTitle = "Title 2", Order = 1, Module = "B2C", Location = "header", Status = "active" },
            new MenuItem { Id = 3, Name = "Item 3", Slug = "slug3", DisplayTitle = "Title 3", Order = 3, Module = "B2B", Location = "header", Status = "active" },
            new MenuItem { Id = 4, Name = "Item 4", Slug = "slug4", DisplayTitle = "Title 4", Order = 4, Module = "B2C", Location = "footer", Status = "active" },
            new MenuItem { Id = 5, Name = "Item 5", Slug = "slug5", DisplayTitle = "Title 5", Order = 5, Module = "B2C", Location = "header", Status = "inactive" }
        );
        await db.SaveChangesAsync();

        var controller = new MenuItemsController(db);

        // Act
        var result = await controller.GetActiveMenuItems("B2C", "header");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value as List<MenuItem>;
        list.Should().NotBeNull();
        list.Should().HaveCount(2);
        list[0].Id.Should().Be(2); // Order 1
        list[1].Id.Should().Be(1); // Order 2
    }

    [Fact]
    public async Task GetAdminMenuItems_ReturnsAllItemsSortedByModuleLocationOrder()
    {
        // Arrange
        using var db = CreateDbContext();
        db.MenuItems.AddRange(
            new MenuItem { Id = 1, Name = "Item 1", Slug = "slug1", DisplayTitle = "Title 1", Order = 2, Module = "B2C", Location = "header", Status = "inactive" },
            new MenuItem { Id = 2, Name = "Item 2", Slug = "slug2", DisplayTitle = "Title 2", Order = 1, Module = "B2C", Location = "header", Status = "active" },
            new MenuItem { Id = 3, Name = "Item 3", Slug = "slug3", DisplayTitle = "Title 3", Order = 1, Module = "B2B", Location = "header", Status = "active" }
        );
        await db.SaveChangesAsync();

        var controller = new MenuItemsController(db);
        SetupControllerUser(controller);

        // Act
        var result = await controller.GetAdminMenuItems();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var list = okResult.Value as List<MenuItem>;
        list.Should().NotBeNull();
        list.Should().HaveCount(3);
        list[0].Module.Should().Be("B2B"); // B2B comes before B2C
        list[1].Module.Should().Be("B2C");
        list[1].Order.Should().Be(1);      // Order 1 comes before 2
        list[2].Order.Should().Be(2);
    }

    [Fact]
    public async Task CreateMenuItem_HappyPath_CreatesAndPersists()
    {
        // Arrange
        using var db = CreateDbContext();
        var controller = new MenuItemsController(db);
        SetupControllerUser(controller);

        var request = new UpsertMenuItemRequest
        {
            Name = "FAQ",
            Slug = "faq",
            DisplayTitle = "FAQ Page",
            Order = 10,
            Module = "B2C",
            Location = "header",
            Status = "active"
        };

        // Act
        var result = await controller.CreateMenuItem(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var data = okResult.Value;
        var menuItemId = data.GetType().GetProperty("menuItemId")?.GetValue(data) as long?;
        menuItemId.Should().NotBeNull();

        var dbItem = await db.MenuItems.FindAsync(menuItemId.Value);
        dbItem.Should().NotBeNull();
        dbItem.Name.Should().Be("FAQ");
        dbItem.Slug.Should().Be("faq");
        dbItem.DisplayTitle.Should().Be("FAQ Page");
    }

    [Fact]
    public async Task CreateMenuItem_ConflictSlug_ReturnsBadRequest()
    {
        // Arrange
        using var db = CreateDbContext();
        db.MenuItems.Add(new MenuItem { Id = 1, Name = "Home", Slug = "home", DisplayTitle = "Home", Module = "B2C", Location = "header" });
        await db.SaveChangesAsync();

        var controller = new MenuItemsController(db);
        SetupControllerUser(controller);

        var request = new UpsertMenuItemRequest
        {
            Name = "New Home",
            Slug = "home", // conflict slug
            DisplayTitle = "Home",
            Module = "B2C",
            Location = "header"
        };

        // Act
        var result = await controller.CreateMenuItem(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdateMenuItem_HappyPath_UpdatesCorrectly()
    {
        // Arrange
        using var db = CreateDbContext();
        var item = new MenuItem { Id = 1, Name = "Old Name", Slug = "old-slug", DisplayTitle = "Old Title", Module = "B2C", Location = "header", Status = "active" };
        db.MenuItems.Add(item);
        await db.SaveChangesAsync();

        var controller = new MenuItemsController(db);
        SetupControllerUser(controller);

        var request = new UpsertMenuItemRequest
        {
            Name = "New Name",
            Slug = "new-slug",
            DisplayTitle = "New Title",
            Order = 5,
            Module = "B2B",
            Location = "footer",
            Status = "inactive"
        };

        // Act
        var result = await controller.UpdateMenuItem(1, request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var dbItem = await db.MenuItems.FindAsync(1L);
        dbItem.Name.Should().Be("New Name");
        dbItem.Slug.Should().Be("new-slug");
        dbItem.DisplayTitle.Should().Be("New Title");
        dbItem.Order.Should().Be(5);
        dbItem.Module.Should().Be("B2B");
        dbItem.Location.Should().Be("footer");
        dbItem.Status.Should().Be("inactive");
    }

    [Fact]
    public async Task UpdateMenuItem_NotFound_ReturnsNotFound()
    {
        // Arrange
        using var db = CreateDbContext();
        var controller = new MenuItemsController(db);
        SetupControllerUser(controller);

        var request = new UpsertMenuItemRequest { Name = "Name", Slug = "slug", DisplayTitle = "Title", Module = "B2C", Location = "header" };

        // Act
        var result = await controller.UpdateMenuItem(999, request);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task UpdateMenuItem_ConflictSlug_ReturnsBadRequest()
    {
        // Arrange
        using var db = CreateDbContext();
        db.MenuItems.AddRange(
            new MenuItem { Id = 1, Name = "Home", Slug = "home", DisplayTitle = "Home", Module = "B2C", Location = "header" },
            new MenuItem { Id = 2, Name = "Support", Slug = "support", DisplayTitle = "Support", Module = "B2C", Location = "header" }
        );
        await db.SaveChangesAsync();

        var controller = new MenuItemsController(db);
        SetupControllerUser(controller);

        var request = new UpsertMenuItemRequest
        {
            Name = "Support Link",
            Slug = "home", // conflict slug
            DisplayTitle = "Support",
            Module = "B2C",
            Location = "header"
        };

        // Act
        var result = await controller.UpdateMenuItem(2, request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task DeleteMenuItem_HappyPath_DeletesCorrectly()
    {
        // Arrange
        using var db = CreateDbContext();
        var item = new MenuItem { Id = 1, Name = "Home", Slug = "home", DisplayTitle = "Home", Module = "B2C", Location = "header" };
        db.MenuItems.Add(item);
        await db.SaveChangesAsync();

        var controller = new MenuItemsController(db);
        SetupControllerUser(controller);

        // Act
        var result = await controller.DeleteMenuItem(1);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var dbItem = await db.MenuItems.FindAsync(1L);
        dbItem.Should().BeNull();
    }

    [Fact]
    public async Task DeleteMenuItem_NotFound_ReturnsNotFound()
    {
        // Arrange
        using var db = CreateDbContext();
        var controller = new MenuItemsController(db);
        SetupControllerUser(controller);

        // Act
        var result = await controller.DeleteMenuItem(999);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }
}
