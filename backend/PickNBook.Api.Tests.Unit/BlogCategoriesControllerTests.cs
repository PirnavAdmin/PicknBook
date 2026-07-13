#nullable disable

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using FluentAssertions;
using Xunit;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Tests.Unit
{
    public class BlogCategoriesControllerTests : IDisposable
    {
        private readonly string _testWebRoot;
        private readonly Mock<IWebHostEnvironment> _mockEnvironment;

        public BlogCategoriesControllerTests()
        {
            _testWebRoot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, $"test_categories_wwwroot_{Guid.NewGuid():N}");
            if (!Directory.Exists(_testWebRoot))
            {
                Directory.CreateDirectory(_testWebRoot);
            }

            _mockEnvironment = new Mock<IWebHostEnvironment>();
            _mockEnvironment.Setup(e => e.WebRootPath).Returns(_testWebRoot);
        }

        public void Dispose()
        {
            if (Directory.Exists(_testWebRoot))
            {
                try
                {
                    Directory.Delete(_testWebRoot, true);
                }
                catch { }
            }
        }

        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        private void SetupControllerUser(BlogCategoriesController controller, string userIdClaim = "1")
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
        public async Task GetCategories_HappyPath_ReturnsOkWithCategories()
        {
            // Arrange
            using var db = CreateDbContext();
            db.BlogCategories.AddRange(
                new BlogCategory { Id = 1, Name = "Cat 1", Slug = "cat-1", Status = "Active" },
                new BlogCategory { Id = 2, Name = "Cat 2", Slug = "cat-2", Status = "Inactive" }
            );
            await db.SaveChangesAsync();

            var controller = new BlogCategoriesController(db, _mockEnvironment.Object);

            // Act
            var result = await controller.GetCategories();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as List<BlogCategory>;
            list.Should().NotBeNull();
            list.Should().HaveCount(2);
        }

        [Fact]
        public async Task CreateCategory_HappyPath_CreatesCategoryAndReturnsOk()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new BlogCategoriesController(db, _mockEnvironment.Object);
            SetupControllerUser(controller);

            var request = new UpsertBlogCategoryRequest
            {
                Name = "New Category",
                Slug = "new-category",
                Status = "Active",
                MetaTitle = "Meta Title",
                MetaKeyword = "Meta Key",
                MetaDescription = "Meta Desc"
            };

            // Act
            var result = await controller.CreateCategory(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var category = okResult.Value as BlogCategory;
            category.Should().NotBeNull();
            category.Name.Should().Be("New Category");
            category.Slug.Should().Be("new-category");
            category.Status.Should().Be("Active");
            category.MetaTitle.Should().Be("Meta Title");

            var dbCat = await db.BlogCategories.FindAsync(category.Id);
            dbCat.Should().NotBeNull();
            dbCat.Name.Should().Be("New Category");
        }

        [Fact]
        public async Task CreateCategory_InvalidRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new BlogCategoriesController(db, _mockEnvironment.Object);
            SetupControllerUser(controller);

            var request = new UpsertBlogCategoryRequest
            {
                Name = "" // Invalid
            };

            // Act
            var result = await controller.CreateCategory(request);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>().Which.Value.Should().Be("Category name is required.");
        }

        [Fact]
        public async Task UpdateCategory_HappyPath_UpdatesAndReturnsOk()
        {
            // Arrange
            using var db = CreateDbContext();
            var cat = new BlogCategory { Id = 10, Name = "Original", Slug = "original", Status = "Active" };
            db.BlogCategories.Add(cat);
            await db.SaveChangesAsync();

            var controller = new BlogCategoriesController(db, _mockEnvironment.Object);
            SetupControllerUser(controller);

            var request = new UpsertBlogCategoryRequest
            {
                Name = "Updated Name",
                Slug = "updated-slug",
                Status = "Inactive"
            };

            // Act
            var result = await controller.UpdateCategory(10, request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var category = okResult.Value as BlogCategory;
            category.Name.Should().Be("Updated Name");
            category.Slug.Should().Be("updated-slug");
            category.Status.Should().Be("Inactive");

            var dbCat = await db.BlogCategories.FindAsync(10L);
            dbCat.Name.Should().Be("Updated Name");
        }

        [Fact]
        public async Task ToggleStatus_HappyPath_TogglesAndReturnsOk()
        {
            // Arrange
            using var db = CreateDbContext();
            var cat = new BlogCategory { Id = 5, Name = "Category", Slug = "category", Status = "Active" };
            db.BlogCategories.Add(cat);
            await db.SaveChangesAsync();

            var controller = new BlogCategoriesController(db, _mockEnvironment.Object);
            SetupControllerUser(controller);

            // Act
            var result = await controller.ToggleStatus(5);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var category = okResult.Value as BlogCategory;
            category.Status.Should().Be("Inactive");

            var dbCat = await db.BlogCategories.FindAsync(5L);
            dbCat.Status.Should().Be("Inactive");
        }

        [Fact]
        public async Task DeleteCategory_HappyPath_DeletesAndReturnsOk()
        {
            // Arrange
            using var db = CreateDbContext();
            var cat = new BlogCategory { Id = 8, Name = "Category", Slug = "category", Status = "Active" };
            db.BlogCategories.Add(cat);
            await db.SaveChangesAsync();

            var controller = new BlogCategoriesController(db, _mockEnvironment.Object);
            SetupControllerUser(controller);

            // Act
            var result = await controller.DeleteCategory(8);

            // Assert
            result.Should().BeOfType<OkObjectResult>().Which.Value.Should().BeEquivalentTo(new { success = true });

            var dbCat = await db.BlogCategories.FindAsync(8L);
            dbCat.Should().BeNull();
        }
    }
}
