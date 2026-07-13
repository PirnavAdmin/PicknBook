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
using PickNBook.Api.Services;

namespace PickNBook.Api.Tests.Unit
{
    public class CmsPagesControllerTests : IDisposable
    {
        private readonly string _testWebRoot;
        private readonly Mock<IWebHostEnvironment> _mockEnvironment;
        private readonly Mock<IAboutUsService> _mockAboutUsService;

        public CmsPagesControllerTests()
        {
            _testWebRoot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, $"test_wwwroot_cms_{Guid.NewGuid():N}");
            if (!Directory.Exists(_testWebRoot))
            {
                Directory.CreateDirectory(_testWebRoot);
            }

            _mockEnvironment = new Mock<IWebHostEnvironment>();
            _mockEnvironment.Setup(e => e.WebRootPath).Returns(_testWebRoot);
            _mockAboutUsService = new Mock<IAboutUsService>();
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

        private void SetupControllerUser(CmsPagesController controller, string userIdClaim = "1")
        {
            var claims = new List<Claim> { new Claim(ClaimTypes.NameIdentifier, userIdClaim) };
            var identity = new ClaimsIdentity(claims, "TestAuthType");
            var claimsPrincipal = new ClaimsPrincipal(identity);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = claimsPrincipal }
            };
        }

        private Mock<IFormFile> CreateMockFile(string fileName, long lengthBytes)
        {
            var mockFile = new Mock<IFormFile>();
            mockFile.Setup(f => f.Length).Returns(lengthBytes);
            mockFile.Setup(f => f.FileName).Returns(fileName);
            mockFile.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);
            return mockFile;
        }

        [Fact]
        public async Task GetActivePages_ReturnsActivePagesOnly()
        {
            // Arrange
            using var db = CreateDbContext();
            db.CmsPages.AddRange(
                new CmsPage { Id = 1, Title = "Terms", Slug = "terms-conditions", Status = "Active" },
                new CmsPage { Id = 2, Title = "Draft", Slug = "draft-page", Status = "Inactive" }
            );
            await db.SaveChangesAsync();

            var controller = new CmsPagesController(db, _mockEnvironment.Object, _mockAboutUsService.Object);

            // Act
            var result = await controller.GetActivePages();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as System.Collections.IEnumerable;
            list.Should().NotBeNull();
            var pageList = list.Cast<object>().ToList();
            pageList.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetPageBySlug_ReturnsActivePage()
        {
            // Arrange
            using var db = CreateDbContext();
            db.CmsPages.AddRange(
                new CmsPage { Id = 1, Title = "Terms", Slug = "terms-conditions", Status = "Active" }
            );
            await db.SaveChangesAsync();

            var controller = new CmsPagesController(db, _mockEnvironment.Object, _mockAboutUsService.Object);

            // Act
            var result = await controller.GetPageBySlug("terms-conditions");

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var page = okResult.Value;
            page.Should().NotBeNull();
            var title = page.GetType().GetProperty("Title")?.GetValue(page) as string;
            title.Should().Be("Terms");
        }

        [Fact]
        public async Task GetPageBySlug_SlugEmpty_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new CmsPagesController(db, _mockEnvironment.Object, _mockAboutUsService.Object);

            // Act
            var result = await controller.GetPageBySlug("");

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetPageBySlug_InactiveOrNotFound_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            db.CmsPages.AddRange(
                new CmsPage { Id = 1, Title = "Terms", Slug = "terms-conditions", Status = "Inactive" }
            );
            await db.SaveChangesAsync();

            var controller = new CmsPagesController(db, _mockEnvironment.Object, _mockAboutUsService.Object);

            // Act
            var resInactive = await controller.GetPageBySlug("terms-conditions");
            var resNotFound = await controller.GetPageBySlug("does-not-exist");

            // Assert
            resInactive.Should().BeOfType<NotFoundObjectResult>();
            resNotFound.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task GetAdminPages_ReturnsAllPagesOrderedByUpdatedAtDesc()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;
            db.CmsPages.AddRange(
                new CmsPage { Id = 1, Title = "Page 1", Slug = "p1", Status = "Inactive", UpdatedAtUtc = now.AddMinutes(-5) },
                new CmsPage { Id = 2, Title = "Page 2", Slug = "p2", Status = "Active", UpdatedAtUtc = now }
            );
            await db.SaveChangesAsync();

            var controller = new CmsPagesController(db, _mockEnvironment.Object, _mockAboutUsService.Object);
            SetupControllerUser(controller);

            // Act
            var result = await controller.GetAdminPages();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as System.Collections.IEnumerable;
            list.Should().NotBeNull();
            var items = list.Cast<object>().ToList();
            items.Should().HaveCount(2);
            var firstId = items[0].GetType().GetProperty("Id")?.GetValue(items[0]) as long?;
            firstId.Should().Be(2); // ordered descending by update date
        }

        [Fact]
        public async Task CreatePage_HappyPath_CreatesAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new CmsPagesController(db, _mockEnvironment.Object, _mockAboutUsService.Object);
            SetupControllerUser(controller);

            var request = new UpsertCmsPageRequest
            {
                Title = "About Us",
                Slug = "about-us",
                Description = "This is our company profile...",
                Status = "Active"
            };

            // Act
            var result = await controller.CreatePage(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var data = okResult.Value;
            var pageId = data.GetType().GetProperty("Id")?.GetValue(data) as long?;
            pageId.Should().NotBeNull();

            var dbPage = await db.CmsPages.FindAsync(pageId.Value);
            dbPage.Should().NotBeNull();
            dbPage.Title.Should().Be("About Us");
            dbPage.Slug.Should().Be("about-us");
        }

        [Fact]
        public async Task CreatePage_InvalidRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new CmsPagesController(db, _mockEnvironment.Object, _mockAboutUsService.Object);
            SetupControllerUser(controller);

            var requestEmptyTitle = new UpsertCmsPageRequest { Title = "", Description = "some text" };
            var requestEmptyDesc = new UpsertCmsPageRequest { Title = "Title", Description = "" };

            // Act
            var resTitle = await controller.CreatePage(requestEmptyTitle);
            var resDesc = await controller.CreatePage(requestEmptyDesc);

            // Assert
            resTitle.Should().BeOfType<BadRequestObjectResult>();
            resDesc.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task UpdatePage_HappyPath_UpdatesCorrectly()
        {
            // Arrange
            using var db = CreateDbContext();
            var page = new CmsPage { Id = 1, Title = "Old Title", Slug = "old-slug", Description = "Old text" };
            db.CmsPages.Add(page);
            await db.SaveChangesAsync();

            var controller = new CmsPagesController(db, _mockEnvironment.Object, _mockAboutUsService.Object);
            SetupControllerUser(controller);

            var request = new UpsertCmsPageRequest
            {
                Title = "New Title",
                Slug = "new-slug",
                Description = "New text"
            };

            // Act
            var result = await controller.UpdatePage(1, request);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var dbPage = await db.CmsPages.FindAsync(1L);
            dbPage.Title.Should().Be("New Title");
            dbPage.Slug.Should().Be("new-slug");
            dbPage.Description.Should().Be("New text");
        }

        [Fact]
        public async Task UpdatePage_NotFound_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new CmsPagesController(db, _mockEnvironment.Object, _mockAboutUsService.Object);
            SetupControllerUser(controller);

            var request = new UpsertCmsPageRequest { Title = "Title", Description = "Desc" };

            // Act
            var result = await controller.UpdatePage(999, request);

            // Assert
            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task DeletePage_HappyPath_DeletesCorrectly()
        {
            // Arrange
            using var db = CreateDbContext();
            var page = new CmsPage { Id = 1, Title = "About Us", Slug = "about-us", Description = "Desc" };
            db.CmsPages.Add(page);
            await db.SaveChangesAsync();

            var controller = new CmsPagesController(db, _mockEnvironment.Object, _mockAboutUsService.Object);
            SetupControllerUser(controller);

            // Act
            var result = await controller.DeletePage(1);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var dbPage = await db.CmsPages.FindAsync(1L);
            dbPage.Should().BeNull();
        }

        [Fact]
        public async Task DeletePage_NotFound_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new CmsPagesController(db, _mockEnvironment.Object, _mockAboutUsService.Object);
            SetupControllerUser(controller);

            // Act
            var result = await controller.DeletePage(999);

            // Assert
            result.Should().BeOfType<NotFoundObjectResult>();
        }
    }
}
