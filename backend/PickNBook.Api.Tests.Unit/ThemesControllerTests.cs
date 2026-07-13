#nullable disable

using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using PickNBook.Api.Controllers.Admin;
using PickNBook.Api.Controllers.Public;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace PickNBook.Api.Tests.Unit
{
    public class ThemesControllerTests : IDisposable
    {
        private readonly string _testWebRoot;
        private readonly Mock<IWebHostEnvironment> _mockEnvironment;

        public ThemesControllerTests()
        {
            _testWebRoot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, $"test_wwwroot_themes_{Guid.NewGuid():N}");
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

        private Mock<IFormFile> CreateMockFormFile(string fileName, string content)
        {
            var fileMock = new Mock<IFormFile>();
            var ms = new MemoryStream();
            var writer = new StreamWriter(ms);
            writer.Write(content);
            writer.Flush();
            ms.Position = 0;

            fileMock.Setup(_ => _.OpenReadStream()).Returns(ms);
            fileMock.Setup(_ => _.FileName).Returns(fileName);
            fileMock.Setup(_ => _.Length).Returns(ms.Length);
            fileMock.Setup(_ => _.CopyToAsync(It.IsAny<Stream>(), It.IsAny<System.Threading.CancellationToken>()))
                .Returns((Stream stream, System.Threading.CancellationToken token) =>
                {
                    ms.Position = 0;
                    return ms.CopyToAsync(stream, token);
                });

            return fileMock;
        }

        [Fact]
        public async Task Seeding_SeedsDefaultThemeAndConfigsIfEmpty()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new ThemesController(db, _mockEnvironment.Object);

            // Act - Calling GetThemes triggers EnsuredefaultThemesAndConfigsAsync
            var result = await controller.GetThemes();

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var okResult = (OkObjectResult)result;
            var list = okResult.Value as List<ThemeDto>;
            list.Should().HaveCount(1);
            list[0].Name.Should().Be("Atlas Default");
            list[0].IsActive.Should().BeTrue();

            var header = await db.ThemeConfigs.FirstOrDefaultAsync(c => c.Key == "header");
            header.Should().NotBeNull();
            var home = await db.ThemeConfigs.FirstOrDefaultAsync(c => c.Key == "home");
            home.Should().NotBeNull();
            var footer = await db.ThemeConfigs.FirstOrDefaultAsync(c => c.Key == "footer");
            footer.Should().NotBeNull();
        }

        [Fact]
        public async Task CreateTheme_HappyPath_CreatesNewTheme()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new ThemesController(db, _mockEnvironment.Object);

            var request = new CreateThemeRequest
            {
                Name = "Ocean Blue",
                Variables = new Dictionary<string, string>
                {
                    { "primaryColor", "#0077cc" },
                    { "pageBgColor", "#f0f8ff" }
                }
            };

            // Act
            var result = await controller.CreateTheme(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var theme = okResult.Value as ThemeDto;
            theme.Should().NotBeNull();
            theme.Name.Should().Be("Ocean Blue");
            theme.IsActive.Should().BeFalse();
            theme.Variables["primaryColor"].Should().Be("#0077cc");

            var dbTheme = await db.Themes.FirstOrDefaultAsync(t => t.Id == theme.Id);
            dbTheme.Should().NotBeNull();
            dbTheme.Name.Should().Be("Ocean Blue");
            dbTheme.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task ActivateTheme_HappyPath_DeactivatesOthersAndActivatesTarget()
        {
            // Arrange
            using var db = CreateDbContext();
            var defaultTheme = new Theme
            {
                Id = "theme-1",
                Name = "Atlas Default",
                IsActive = true,
                VariablesJson = "{}"
            };
            var customTheme = new Theme
            {
                Id = "theme-2",
                Name = "Ocean Blue",
                IsActive = false,
                VariablesJson = "{}"
            };
            db.Themes.AddRange(defaultTheme, customTheme);
            await db.SaveChangesAsync();

            var controller = new ThemesController(db, _mockEnvironment.Object);

            // Act
            var result = await controller.ActivateTheme("theme-2");

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            
            var updatedDefault = await db.Themes.FindAsync("theme-1");
            updatedDefault.IsActive.Should().BeFalse();

            var updatedCustom = await db.Themes.FindAsync("theme-2");
            updatedCustom.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteTheme_ActiveTheme_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var defaultTheme = new Theme
            {
                Id = "theme-1",
                Name = "Atlas Default",
                IsActive = true,
                VariablesJson = "{}"
            };
            db.Themes.Add(defaultTheme);
            await db.SaveChangesAsync();

            var controller = new ThemesController(db, _mockEnvironment.Object);

            // Act
            var result = await controller.DeleteTheme("theme-1");

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
            var dbTheme = await db.Themes.FindAsync("theme-1");
            dbTheme.Should().NotBeNull(); // Still exists
        }

        [Fact]
        public async Task DeleteTheme_InactiveTheme_DeletesSuccessfully()
        {
            // Arrange
            using var db = CreateDbContext();
            var defaultTheme = new Theme
            {
                Id = "theme-1",
                Name = "Atlas Default",
                IsActive = true,
                VariablesJson = "{}"
            };
            var customTheme = new Theme
            {
                Id = "theme-2",
                Name = "Ocean Blue",
                IsActive = false,
                VariablesJson = "{}"
            };
            db.Themes.AddRange(defaultTheme, customTheme);
            await db.SaveChangesAsync();

            var controller = new ThemesController(db, _mockEnvironment.Object);

            // Act
            var result = await controller.DeleteTheme("theme-2");

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var dbTheme = await db.Themes.FindAsync("theme-2");
            dbTheme.Should().BeNull(); // Deleted
        }

        [Fact]
        public async Task UpdateHeaderConfig_HappyPath_UpdatesFieldsAndSavesFile()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new ThemesController(db, _mockEnvironment.Object);

            var fileMock = CreateMockFormFile("logo.png", "fake logo image");
            var request = new UpdateHeaderConfigRequest
            {
                Logo = fileMock.Object,
                BgColor = "#ff0000",
                TextColor = "#000000",
                NavHoverColor = "#00ff00",
                LayoutType = "custom-header"
            };

            // Act
            var result = await controller.UpdateHeaderConfig(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var updatedDto = okResult.Value as HeaderConfigDto;
            updatedDto.Should().NotBeNull();
            updatedDto.BgColor.Should().Be("#ff0000");
            updatedDto.TextColor.Should().Be("#000000");
            updatedDto.NavHoverColor.Should().Be("#00ff00");
            updatedDto.LayoutType.Should().Be("custom-header");
            updatedDto.LogoUrl.Should().StartWith("/uploads/themes/header/");

            var localPath = Path.Combine(_testWebRoot, updatedDto.LogoUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            File.Exists(localPath).Should().BeTrue();
            File.ReadAllText(localPath).Should().Be("fake logo image");
        }

        [Fact]
        public async Task UpdateHomeConfig_HappyPath_UpdatesFieldsAndSavesFile()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new ThemesController(db, _mockEnvironment.Object);

            var fileMock = CreateMockFormFile("banner.jpg", "fake banner image");
            var request = new UpdateHomeConfigRequest
            {
                HeroBackgroundImage = fileMock.Object,
                HeroTitle = "New Title",
                HeroSubtitle = "New Subtitle",
                HeroOverlayColor = "rgba(1, 2, 3, 0.5)",
                SearchCardStyle = "flat"
            };

            // Act
            var result = await controller.UpdateHomeConfig(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var updatedDto = okResult.Value as HomeConfigDto;
            updatedDto.Should().NotBeNull();
            updatedDto.HeroTitle.Should().Be("New Title");
            updatedDto.HeroSubtitle.Should().Be("New Subtitle");
            updatedDto.HeroOverlayColor.Should().Be("rgba(1, 2, 3, 0.5)");
            updatedDto.SearchCardStyle.Should().Be("flat");
            updatedDto.HeroBackgroundImageUrl.Should().StartWith("/uploads/themes/home/");

            var localPath = Path.Combine(_testWebRoot, updatedDto.HeroBackgroundImageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            File.Exists(localPath).Should().BeTrue();
            File.ReadAllText(localPath).Should().Be("fake banner image");
        }

        [Fact]
        public async Task UpdateFooterConfig_HappyPath_UpdatesFields()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new ThemesController(db, _mockEnvironment.Object);

            var request = new FooterConfigDto
            {
                BgColor = "#222222",
                GradientColor = "linear-gradient(90deg, #222, #333)",
                TextColor = "#dddddd",
                BottomLineText = "All rights reserved 2026",
                SocialIconColor = "#ffffff"
            };

            // Act
            var result = await controller.UpdateFooterConfig(request);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var updatedDto = okResult.Value as FooterConfigDto;
            updatedDto.Should().NotBeNull();
            updatedDto.BgColor.Should().Be("#222222");
            updatedDto.GradientColor.Should().Be("linear-gradient(90deg, #222, #333)");
            updatedDto.TextColor.Should().Be("#dddddd");
            updatedDto.BottomLineText.Should().Be("All rights reserved 2026");
            updatedDto.SocialIconColor.Should().Be("#ffffff");
        }

        [Fact]
        public async Task PublicController_GetActiveTheme_MapsCSSVariables()
        {
            // Arrange
            using var db = CreateDbContext();
            var theme = new Theme
            {
                Id = "theme-1",
                Name = "Atlas Custom",
                IsActive = true,
                VariablesJson = JsonSerializer.Serialize(new Dictionary<string, string>
                {
                    { "primaryColor", "#aa0000" },
                    { "primaryStrongColor", "#770000" },
                    { "pageBgColor", "#eeeeee" },
                    { "surfaceColor", "#f5f5f5" },
                    { "textColor", "#222222" },
                    { "borderColor", "#cccccc" }
                })
            };
            db.Themes.Add(theme);
            await db.SaveChangesAsync();

            var controller = new PublicThemeController(db);

            // Act
            var result = await controller.GetActiveTheme();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            
            // We use reflection or dynamic checking to inspect the anonymous object
            var data = okResult.Value;
            var varsProperty = data.GetType().GetProperty("variables");
            varsProperty.Should().NotBeNull();
            var vars = varsProperty.GetValue(data) as Dictionary<string, string>;
            
            vars.Should().NotBeNull();
            vars["--theme-primary"].Should().Be("#aa0000");
            vars["--theme-primary-strong"].Should().Be("#770000");
            vars["--theme-page"].Should().Be("#eeeeee");
            vars["--theme-surface"].Should().Be("#f5f5f5");
            vars["--theme-text"].Should().Be("#222222");
            vars["--theme-border"].Should().Be("#cccccc");
            vars["--theme-gradient-action"].Should().Be("linear-gradient(135deg, #aa0000 0%, #770000 100%)");
        }

        [Fact]
        public async Task PublicController_GetActiveLayout_ReturnsMergedLayouts()
        {
            // Arrange
            using var db = CreateDbContext();
            var header = new ThemeConfig
            {
                Key = "header",
                ValueJson = JsonSerializer.Serialize(new Dictionary<string, string> { { "logoUrl", "/logo.png" } })
            };
            var home = new ThemeConfig
            {
                Key = "home",
                ValueJson = JsonSerializer.Serialize(new Dictionary<string, string> { { "heroTitle", "Hello" } })
            };
            var footer = new ThemeConfig
            {
                Key = "footer",
                ValueJson = JsonSerializer.Serialize(new Dictionary<string, string> { { "bgColor", "#111" } })
            };
            db.ThemeConfigs.AddRange(header, home, footer);
            await db.SaveChangesAsync();

            var controller = new PublicThemeController(db);

            // Act
            var result = await controller.GetActiveLayout();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var data = okResult.Value;

            var headerProp = data.GetType().GetProperty("header")?.GetValue(data) as Dictionary<string, object>;
            var homeProp = data.GetType().GetProperty("home")?.GetValue(data) as Dictionary<string, object>;
            var footerProp = data.GetType().GetProperty("footer")?.GetValue(data) as Dictionary<string, object>;

            headerProp.Should().NotBeNull();
            headerProp["logoUrl"].ToString().Should().Be("/logo.png");

            homeProp.Should().NotBeNull();
            homeProp["heroTitle"].ToString().Should().Be("Hello");

            footerProp.Should().NotBeNull();
            footerProp["bgColor"].ToString().Should().Be("#111");
        }
    }
}
