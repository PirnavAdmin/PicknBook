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

namespace PickNBook.Api.Tests.Unit;

public class AboutUsControllerTests : IDisposable
{
    private readonly string _testWebRoot;
    private readonly Mock<IWebHostEnvironment> _mockEnvironment;

    public AboutUsControllerTests()
    {
        _testWebRoot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, $"test_wwwroot_about_{Guid.NewGuid():N}");
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
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    private void SetupControllerUser(ControllerBase controller, string userIdClaim = "1")
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

    #region GET & PUT Admin Endpoints Tests

    [Fact]
    public async Task GetEditableAboutUs_ReturnsDtoWithSavedData()
    {
        // Arrange
        using var db = CreateDbContext();
        var about = new AboutUs
        {
            Id = 1,
            Module = "B2C",
            Status = "active",
            AboutDescription = "Description",
            WhoWeAreHeading = "Who Heading",
            WhoWeAreDescription = "Who Desc",
            WhoWeAreImageUrl = "image.png"
        };
        db.AboutUs.Add(about);
        db.AboutUsCounts.Add(new AboutUsCount { AboutUsId = 1, CountValue = "10+", CountTitle = "Users", DisplayOrder = 1 });
        await db.SaveChangesAsync();

        var service = new AboutUsService(db);
        var controller = new CmsPagesController(db, _mockEnvironment.Object, service);
        SetupControllerUser(controller);

        // Act
        var result = await controller.GetEditableAboutUs("B2C");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = okResult.Value as AboutUsDto;
        dto.Should().NotBeNull();
        dto.Module.Should().Be("B2C");
        dto.WhoWeAre.Heading.Should().Be("Who Heading");
        dto.CountSection.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetEditableAboutUs_NotFound_ReturnsEmptyDto()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = new AboutUsService(db);
        var controller = new CmsPagesController(db, _mockEnvironment.Object, service);
        SetupControllerUser(controller);

        // Act
        var result = await controller.GetEditableAboutUs("B2B");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = okResult.Value as AboutUsDto;
        dto.Should().NotBeNull();
        dto.Module.Should().Be("B2B");
        dto.AboutDescription.Should().BeEmpty();
    }

    [Fact]
    public async Task UpdateAboutUs_HappyPath_CreatesNewIfNotExists()
    {
        // Arrange
        using var db = CreateDbContext();
        var service = new AboutUsService(db);
        var controller = new CmsPagesController(db, _mockEnvironment.Object, service);
        SetupControllerUser(controller);

        var request = new UpdateAboutUsDto
        {
            Module = "B2C",
            Status = "active",
            AboutDescription = "pick n book info",
            WhoWeAre = new WhoWeAreDto { Heading = "Heading", Details = "Desc", ImageUrl = "who.png" },
            CountSection = new List<AboutUsCountDto>
            {
                new AboutUsCountDto { CountValue = "5+", CountTitle = "Partners", DisplayOrder = 1 }
            },
            TeamMembers = new List<TeamMemberDto>
            {
                new TeamMemberDto { Name = "John", Designation = "CTO", ImageUrl = "john.png", DisplayOrder = 1 }
            }
        };

        // Act
        var result = await controller.UpdateAboutUs(request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var dbAbout = await db.AboutUs
            .Include(x => x.Counts)
            .Include(x => x.TeamMembers)
            .FirstOrDefaultAsync(x => x.Module == "B2C");

        dbAbout.Should().NotBeNull();
        dbAbout.AboutDescription.Should().Be("pick n book info");
        dbAbout.Counts.Should().HaveCount(1);
        dbAbout.TeamMembers.Should().HaveCount(1);
    }

    [Fact]
    public async Task UpdateAboutUs_UpdatesAndAtomicallyReplacesChildren()
    {
        // Arrange
        using var db = CreateDbContext();
        var entry = new AboutUs
        {
            Id = 1,
            Module = "B2B",
            Status = "active",
            WhoWeAreHeading = "Old Heading"
        };
        db.AboutUs.Add(entry);
        db.AboutUsCounts.Add(new AboutUsCount { AboutUsId = 1, CountValue = "10+", CountTitle = "Old", DisplayOrder = 1 });
        db.AboutUsTeamMembers.Add(new AboutUsTeamMember { AboutUsId = 1, Name = "Old member", Designation = "Dev", DisplayOrder = 1 });
        await db.SaveChangesAsync();

        var service = new AboutUsService(db);
        var controller = new CmsPagesController(db, _mockEnvironment.Object, service);
        SetupControllerUser(controller);

        var request = new UpdateAboutUsDto
        {
            Module = "B2B",
            Status = "active",
            AboutDescription = "New Description",
            WhoWeAre = new WhoWeAreDto { Heading = "New Heading", Details = "Desc", ImageUrl = "new.png" },
            CountSection = new List<AboutUsCountDto>
            {
                new AboutUsCountDto { CountValue = "20+", CountTitle = "New Title", DisplayOrder = 1 }
            },
            TeamMembers = new List<TeamMemberDto>
            {
                new TeamMemberDto { Name = "New member", Designation = "Designer", ImageUrl = "new.png", DisplayOrder = 1 }
            }
        };

        // Act
        var result = await controller.UpdateAboutUs(request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();

        var dbAbout = await db.AboutUs
            .Include(x => x.Counts)
            .Include(x => x.TeamMembers)
            .FirstOrDefaultAsync(x => x.Module == "B2B");

        dbAbout.WhoWeAreHeading.Should().Be("New Heading");
        dbAbout.Counts.Should().HaveCount(1);
        dbAbout.Counts.First().CountTitle.Should().Be("New Title");
        dbAbout.TeamMembers.Should().HaveCount(1);
        dbAbout.TeamMembers.First().Name.Should().Be("New member");
    }

    #endregion

    #region GET Public Endpoint Tests

    [Fact]
    public async Task GetPublicAboutUs_ReturnsCorrectPayloadStructure()
    {
        // Arrange
        using var db = CreateDbContext();
        var about = new AboutUs
        {
            Id = 1,
            Module = "B2C",
            Status = "active",
            AboutDescription = "Public Desc",
            WhoWeAreHeading = "Public Who",
            WhoWeAreImageUrl = "who.png"
        };
        db.AboutUs.Add(about);
        await db.SaveChangesAsync();

        var service = new AboutUsService(db);
        var controller = new CmsPagesController(db, _mockEnvironment.Object, service);

        // Act
        var result = await controller.GetAboutUs("B2C");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var data = okResult.Value;
        data.Should().NotBeNull();
        
        var desc = data.GetType().GetProperty("aboutDescription")?.GetValue(data) as string;
        desc.Should().Be("Public Desc");
    }

    #endregion

    #region FilesController Tests

    [Fact]
    public async Task UploadFile_AboutType_SavesFileToDisk()
    {
        // Arrange
        var mockFile = CreateMockFile("myphoto.jpg", 12000);
        var controller = new FilesController(_mockEnvironment.Object);
        SetupControllerUser(controller);

        // Act
        var result = await controller.UploadFile(mockFile.Object, "about");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var value = okResult.Value;
        var url = value.GetType().GetProperty("url")?.GetValue(value) as string;
        url.Should().StartWith("/uploads/about/");
        url.Should().EndWith(".jpg");

        var localPath = Path.Combine(_testWebRoot, url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        File.Exists(localPath).Should().BeTrue();
    }

    #endregion
}
