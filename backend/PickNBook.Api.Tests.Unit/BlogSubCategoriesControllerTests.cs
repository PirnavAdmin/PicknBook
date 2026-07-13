#nullable disable

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
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
    public class BlogSubCategoriesControllerTests : IDisposable
    {
        private readonly string _testWebRoot;
        private readonly Mock<IWebHostEnvironment> _mockEnvironment;

        public BlogSubCategoriesControllerTests()
        {
            _testWebRoot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, $"test_subcategories_wwwroot_{Guid.NewGuid():N}");
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

        private void SetupControllerUser(BlogSubCategoriesController controller, string userIdClaim = "1")
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
        public async Task GetSubCategories_HappyPath_ReturnsOkWithSubCategories()
        {
            // Arrange
            using var db = CreateDbContext();
            db.BlogSubCategories.AddRange(
                new BlogSubCategory { Id = 1, Name = "Sub 1", Category = "Travel", Slug = "sub-1", Status = "Active" },
                new BlogSubCategory { Id = 2, Name = "Sub 2", Category = "Offers", Slug = "sub-2", Status = "Inactive" }
            );
            await db.SaveChangesAsync();

            var controller = new BlogSubCategoriesController(db, _mockEnvironment.Object);

            // Act
            var result = await controller.GetSubCategories();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as List<BlogSubCategory>;
            list.Should().NotBeNull();
            list.Should().HaveCount(2);
        }

        [Fact]
        public async Task CreateSubCategory_HappyPath_CreatesSubCategoryAndReturnsOk()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new BlogSubCategoriesController(db, _mockEnvironment.Object);
            SetupControllerUser(controller);

            var request = new UpsertBlogSubCategoryRequest
            {
                Name = "New Subcategory",
                Category = "Travel",
                Slug = "new-subcategory",
                Status = "Active",
                MetaTitle = "Meta Title",
                MetaKeyword = "Meta Key",
                MetaDescription = "Meta Desc"
            };

            // Act
            var result = await controller.CreateSubCategory(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var subcategory = okResult.Value as BlogSubCategory;
            subcategory.Should().NotBeNull();
            subcategory.Name.Should().Be("New Subcategory");
            subcategory.Category.Should().Be("Travel");
            subcategory.Slug.Should().Be("new-subcategory");
            subcategory.Status.Should().Be("Active");
            subcategory.MetaTitle.Should().Be("Meta Title");

            var dbSub = await db.BlogSubCategories.FindAsync(subcategory.Id);
            dbSub.Should().NotBeNull();
            dbSub.Name.Should().Be("New Subcategory");
        }

        [Fact]
        public async Task CreateSubCategory_InvalidRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new BlogSubCategoriesController(db, _mockEnvironment.Object);
            SetupControllerUser(controller);

            var request1 = new UpsertBlogSubCategoryRequest
            {
                Name = "", // Invalid
                Category = "Travel"
            };

            var request2 = new UpsertBlogSubCategoryRequest
            {
                Name = "Sub",
                Category = "" // Invalid
            };

            // Act & Assert
            var result1 = await controller.CreateSubCategory(request1);
            result1.Should().BeOfType<BadRequestObjectResult>().Which.Value.Should().Be("Subcategory name is required.");

            var result2 = await controller.CreateSubCategory(request2);
            result2.Should().BeOfType<BadRequestObjectResult>().Which.Value.Should().Be("Category is required.");
        }

        [Fact]
        public async Task UpdateSubCategory_HappyPath_UpdatesAndReturnsOk()
        {
            // Arrange
            using var db = CreateDbContext();
            var sub = new BlogSubCategory { Id = 12, Name = "Original Sub", Category = "Travel", Slug = "original-sub", Status = "Active" };
            db.BlogSubCategories.Add(sub);
            await db.SaveChangesAsync();

            var controller = new BlogSubCategoriesController(db, _mockEnvironment.Object);
            SetupControllerUser(controller);

            var request = new UpsertBlogSubCategoryRequest
            {
                Name = "Updated Sub Name",
                Category = "Offers",
                Slug = "updated-sub-slug",
                Status = "Inactive"
            };

            // Act
            var result = await controller.UpdateSubCategory(12, request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var subcategory = okResult.Value as BlogSubCategory;
            subcategory.Name.Should().Be("Updated Sub Name");
            subcategory.Category.Should().Be("Offers");
            subcategory.Slug.Should().Be("updated-sub-slug");
            subcategory.Status.Should().Be("Inactive");

            var dbSub = await db.BlogSubCategories.FindAsync(12L);
            dbSub.Name.Should().Be("Updated Sub Name");
            dbSub.Category.Should().Be("Offers");
        }

        [Fact]
        public async Task ToggleStatus_HappyPath_TogglesAndReturnsOk()
        {
            // Arrange
            using var db = CreateDbContext();
            var sub = new BlogSubCategory { Id = 6, Name = "Subcategory", Category = "Travel", Slug = "subcategory", Status = "Active" };
            db.BlogSubCategories.Add(sub);
            await db.SaveChangesAsync();

            var controller = new BlogSubCategoriesController(db, _mockEnvironment.Object);
            SetupControllerUser(controller);

            // Act
            var result = await controller.ToggleStatus(6);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var subcategory = okResult.Value as BlogSubCategory;
            subcategory.Status.Should().Be("Inactive");

            var dbSub = await db.BlogSubCategories.FindAsync(6L);
            dbSub.Status.Should().Be("Inactive");
        }

        [Fact]
        public async Task DeleteSubCategory_HappyPath_DeletesAndReturnsOk()
        {
            // Arrange
            using var db = CreateDbContext();
            var sub = new BlogSubCategory { Id = 9, Name = "Subcategory", Category = "Travel", Slug = "subcategory", Status = "Active" };
            db.BlogSubCategories.Add(sub);
            await db.SaveChangesAsync();

            var controller = new BlogSubCategoriesController(db, _mockEnvironment.Object);
            SetupControllerUser(controller);

            // Act
            var result = await controller.DeleteSubCategory(9);

            // Assert
            result.Should().BeOfType<OkObjectResult>().Which.Value.Should().BeEquivalentTo(new { success = true });

            var dbSub = await db.BlogSubCategories.FindAsync(9L);
            dbSub.Should().BeNull();
        }
    }
}
