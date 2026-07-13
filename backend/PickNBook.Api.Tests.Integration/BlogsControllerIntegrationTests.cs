#nullable disable

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;
using Xunit;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;

namespace PickNBook.Api.Tests.Integration
{
    public class BlogsControllerIntegrationTests : IClassFixture<WebApplicationFactory<BlogsController>>
    {
        private readonly WebApplicationFactory<BlogsController> _factory;

        public BlogsControllerIntegrationTests(WebApplicationFactory<BlogsController> factory)
        {
            var dbName = "InMemoryDbForIntegration_Blogs_" + Guid.NewGuid().ToString();
            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Remove existing AppDbContext options and implementation descriptors
                    var optionsDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                    if (optionsDescriptor != null)
                    {
                        services.Remove(optionsDescriptor);
                    }

                    var dbContextDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(AppDbContext));
                    if (dbContextDescriptor != null)
                    {
                        services.Remove(dbContextDescriptor);
                    }

                    // Add AppDbContext with a fresh InMemory database
                    services.AddDbContext<AppDbContext>(options =>
                    {
                        options.UseInMemoryDatabase(dbName);
                    });
                });
            });
        }

        private HttpClient GetAuthenticatedClient(string role = AuthRoles.Admin)
        {
            var client = _factory.CreateClient();

            using var scope = _factory.Services.CreateScope();
            var jwtService = scope.ServiceProvider.GetRequiredService<IJwtService>();
            var token = jwtService.GenerateToken(new User
            {
                Id = 1,
                Email = "admin@picknbook.com",
                Role = role
            }, role);

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        private AppDbContext GetDbContext()
        {
            var scope = _factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<AppDbContext>();
        }

        #region Public Blog Endpoints (Anonymous Access Allowed)

        [Fact]
        public async Task GetPublishedBlogs_HappyPath_Returns200WithBlogs()
        {
            // Arrange
            var client = _factory.CreateClient();
            using var db = GetDbContext();
            db.BlogPosts.AddRange(
                new BlogPost { Title = "Travel Tip 1", Slug = "travel-tip-1", Category = "Travel", SubCategory = "Tips", IsPublished = true },
                new BlogPost { Title = "Travel Tip 2", Slug = "travel-tip-2", Category = "Food", SubCategory = "Tips", IsPublished = true },
                new BlogPost { Title = "Draft Tip", Slug = "draft-tip", Category = "Travel", SubCategory = "Tips", IsPublished = false }
            );
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/blogs?category=Travel");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();

            result.GetProperty("total").GetInt32().Should().Be(1);
            result.GetProperty("page").GetInt32().Should().Be(1);
            result.GetProperty("pageSize").GetInt32().Should().Be(10);
            
            var blogs = result.GetProperty("blogs");
            blogs.GetArrayLength().Should().Be(1);

            var firstBlog = blogs[0];
            firstBlog.GetProperty("id").GetInt64().Should().BeGreaterThan(0);
            firstBlog.GetProperty("title").GetString().Should().Be("Travel Tip 1");
            firstBlog.GetProperty("slug").GetString().Should().Be("travel-tip-1");
            firstBlog.GetProperty("category").GetString().Should().Be("Travel");
            firstBlog.GetProperty("subCategory").GetString().Should().Be("Tips");
            firstBlog.GetProperty("imageUrl").ValueKind.Should().Be(JsonValueKind.Null);
            firstBlog.GetProperty("isFeatured").GetBoolean().Should().BeFalse();
            firstBlog.GetProperty("publishedAtUtc").ValueKind.Should().NotBe(JsonValueKind.Null);
        }

        [Fact]
        public async Task GetPublishedBlogBySlug_ExistingSlug_Returns200WithDetails()
        {
            // Arrange
            var client = _factory.CreateClient();
            using var db = GetDbContext();
            db.BlogPosts.Add(new BlogPost
            {
                Title = "Grand Canyon Guide",
                Slug = "grand-canyon-guide",
                Category = "Nature",
                SubCategory = "USA",
                ShortDescription = "Short intro",
                LongDescription = "Very long canyon detailed text...",
                IsPublished = true,
                IsFeatured = true
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/blogs/grand-canyon-guide");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var blog = await response.Content.ReadFromJsonAsync<JsonElement>();

            blog.GetProperty("id").GetInt64().Should().BeGreaterThan(0);
            blog.GetProperty("title").GetString().Should().Be("Grand Canyon Guide");
            blog.GetProperty("slug").GetString().Should().Be("grand-canyon-guide");
            blog.GetProperty("category").GetString().Should().Be("Nature");
            blog.GetProperty("subCategory").GetString().Should().Be("USA");
            blog.GetProperty("shortDescription").GetString().Should().Be("Short intro");
            blog.GetProperty("longDescription").GetString().Should().Be("Very long canyon detailed text...");
            blog.GetProperty("isFeatured").GetBoolean().Should().BeTrue();
        }

        [Fact]
        public async Task GetPublishedBlogBySlug_DraftOrNonExisting_Returns404()
        {
            // Arrange
            var client = _factory.CreateClient();
            using var db = GetDbContext();
            db.BlogPosts.Add(new BlogPost { Title = "Draft Blog", Slug = "draft-blog", IsPublished = false });
            await db.SaveChangesAsync();

            // Act
            var responseDraft = await client.GetAsync("api/blogs/draft-blog");
            var responseMissing = await client.GetAsync("api/blogs/non-existent-slug");

            // Assert
            responseDraft.StatusCode.Should().Be(HttpStatusCode.NotFound);
            responseMissing.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion

        #region Admin Authentication/Authorization Endpoints

        [Theory]
        [InlineData("api/blogs/admin/list", "GET")]
        [InlineData("api/blogs/admin", "POST")]
        [InlineData("api/blogs/admin/1", "PUT")]
        [InlineData("api/blogs/admin/1", "DELETE")]
        public async Task AdminEndpoints_UnauthorizedWhenNoTokenProvided_Returns401(string url, string method)
        {
            // Arrange
            var client = _factory.CreateClient();
            HttpRequestMessage request = new HttpRequestMessage(new HttpMethod(method), url);
            if (method == "POST" || method == "PUT")
            {
                request.Content = new MultipartFormDataContent();
            }

            // Act
            var response = await client.SendAsync(request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Theory]
        [InlineData("api/blogs/admin/list", "GET")]
        [InlineData("api/blogs/admin", "POST")]
        [InlineData("api/blogs/admin/1", "PUT")]
        [InlineData("api/blogs/admin/1", "DELETE")]
        public async Task AdminEndpoints_ForbiddenWhenUserRoleProvided_Returns403(string url, string method)
        {
            // Arrange
            var client = GetAuthenticatedClient(role: AuthRoles.User);
            HttpRequestMessage request = new HttpRequestMessage(new HttpMethod(method), url);
            if (method == "POST" || method == "PUT")
            {
                request.Content = new MultipartFormDataContent();
            }

            // Act
            var response = await client.SendAsync(request);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }

        #endregion

        #region Admin Blog CRUD Operations (Authorized)

        [Fact]
        public async Task GetAdminBlogs_HappyPathAsAdmin_Returns200WithBlogs()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BlogPosts.AddRange(
                new BlogPost { Title = "Admin Blog 1", Slug = "admin-blog-1", IsPublished = true },
                new BlogPost { Title = "Admin Blog 2", Slug = "admin-blog-2", IsPublished = false }
            );
            await db.SaveChangesAsync();

            // Act
            var response = await client.GetAsync("api/blogs/admin/list?isPublished=false");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();

            result.GetProperty("total").GetInt32().Should().Be(1);
            var blogs = result.GetProperty("blogs");
            blogs.GetArrayLength().Should().Be(1);
            blogs[0].GetProperty("title").GetString().Should().Be("Admin Blog 2");
        }

        [Fact]
        public async Task CreateBlog_HappyPathAsAdmin_Returns200AndPersists()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            
            var content = new MultipartFormDataContent();
            content.Add(new StringContent("Integration Blog Title"), "Title");
            content.Add(new StringContent("Travel"), "Category");
            content.Add(new StringContent("Hiking"), "SubCategory");
            content.Add(new StringContent("Short Description..."), "ShortDescription");
            content.Add(new StringContent("Long Description..."), "LongDescription");
            content.Add(new StringContent("my-integration-slug"), "Slug");
            content.Add(new StringContent("true"), "IsPublished");

            // Mock Image
            var imageContent = new ByteArrayContent(Encoding.UTF8.GetBytes("fake jpeg image data"));
            imageContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
            content.Add(imageContent, "Image", "photo.jpg");

            // Act
            var response = await client.PostAsync("api/blogs/admin", content);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            
            var blogId = result.GetProperty("id").GetInt64();
            blogId.Should().BeGreaterThan(0);
            result.GetProperty("slug").GetString().Should().Be("my-integration-slug");

            // Verify persistence in DB
            using var dbVerify = GetDbContext();
            var dbBlog = await dbVerify.BlogPosts.FindAsync(blogId);
            dbBlog.Should().NotBeNull();
            dbBlog.Title.Should().Be("Integration Blog Title");
            dbBlog.Slug.Should().Be("my-integration-slug");
            dbBlog.ImageUrl.Should().StartWith("/blogs/images/");
            dbBlog.ImageUrl.Should().EndWith(".jpg");
            dbBlog.IsPublished.Should().BeTrue();
            dbBlog.PublishedAtUtc.Should().NotBeNull();
        }

        [Fact]
        public async Task CreateBlog_ValidationFailed_Returns400()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            
            // Missing Category and ShortDescription
            var content = new MultipartFormDataContent();
            content.Add(new StringContent("Invalid Blog"), "Title");
            content.Add(new StringContent("Sub"), "SubCategory");
            content.Add(new StringContent("Long Description..."), "LongDescription");

            // Act
            var response = await client.PostAsync("api/blogs/admin", content);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            var error = await response.Content.ReadAsStringAsync();
            error.Should().Contain("Category is required.");
        }

        [Fact]
        public async Task CreateBlog_DuplicateRequests_GeneratesUniqueSlugs()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            var form1 = new MultipartFormDataContent();
            form1.Add(new StringContent("Dup Title"), "Title");
            form1.Add(new StringContent("slug-dup"), "Slug");
            form1.Add(new StringContent("Cat"), "Category");
            form1.Add(new StringContent("Sub"), "SubCategory");
            form1.Add(new StringContent("Short"), "ShortDescription");
            form1.Add(new StringContent("Long"), "LongDescription");

            var form2 = new MultipartFormDataContent();
            form2.Add(new StringContent("Dup Title 2"), "Title");
            form2.Add(new StringContent("slug-dup"), "Slug"); // Same Slug
            form2.Add(new StringContent("Cat"), "Category");
            form2.Add(new StringContent("Sub"), "SubCategory");
            form2.Add(new StringContent("Short"), "ShortDescription");
            form2.Add(new StringContent("Long"), "LongDescription");

            // Act
            var res1 = await client.PostAsync("api/blogs/admin", form1);
            var res2 = await client.PostAsync("api/blogs/admin", form2);

            // Assert
            res1.StatusCode.Should().Be(HttpStatusCode.OK);
            res2.StatusCode.Should().Be(HttpStatusCode.OK);

            var result1 = await res1.Content.ReadFromJsonAsync<JsonElement>();
            var result2 = await res2.Content.ReadFromJsonAsync<JsonElement>();

            result1.GetProperty("slug").GetString().Should().Be("slug-dup");
            result2.GetProperty("slug").GetString().Should().Be("slug-dup-2");
        }

        [Fact]
        public async Task UpdateBlog_HappyPathAsAdmin_Returns200AndUpdates()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BlogPosts.Add(new BlogPost
            {
                Id = 20,
                Title = "Old Blog",
                Slug = "old-blog",
                Category = "Old Cat",
                SubCategory = "Old Sub",
                ShortDescription = "Short",
                LongDescription = "Long",
                IsPublished = false
            });
            await db.SaveChangesAsync();

            var form = new MultipartFormDataContent();
            form.Add(new StringContent("Updated Blog Title"), "Title");
            form.Add(new StringContent("New Cat"), "Category");
            form.Add(new StringContent("New Sub"), "SubCategory");
            form.Add(new StringContent("Short"), "ShortDescription");
            form.Add(new StringContent("Long"), "LongDescription");
            form.Add(new StringContent("true"), "IsPublished");

            // Act
            var response = await client.PutAsync("api/blogs/admin/20", form);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            result.GetProperty("title").GetString().Should().Be("Updated Blog Title");
            
            // Verify in DB
            using var dbVerify = GetDbContext();
            var dbBlog = await dbVerify.BlogPosts.FindAsync((long)20);
            dbBlog.Title.Should().Be("Updated Blog Title");
            dbBlog.Category.Should().Be("New Cat");
            dbBlog.SubCategory.Should().Be("New Sub");
            dbBlog.IsPublished.Should().BeTrue();
            dbBlog.PublishedAtUtc.Should().NotBeNull();
        }

        [Fact]
        public async Task UpdateBlog_NotFound_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            var form = new MultipartFormDataContent();
            form.Add(new StringContent("Title"), "Title");
            form.Add(new StringContent("Cat"), "Category");
            form.Add(new StringContent("Sub"), "SubCategory");
            form.Add(new StringContent("Short"), "ShortDescription");
            form.Add(new StringContent("Long"), "LongDescription");

            // Act
            var response = await client.PutAsync("api/blogs/admin/999", form);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task DeleteBlog_HappyPathAsAdmin_Returns200AndRemoves()
        {
            // Arrange
            var client = GetAuthenticatedClient();
            using var db = GetDbContext();
            db.BlogPosts.Add(new BlogPost
            {
                Id = 30,
                Title = "Blog to Delete",
                Slug = "to-delete",
                Category = "Cat",
                SubCategory = "Sub",
                ShortDescription = "Short",
                LongDescription = "Long"
            });
            await db.SaveChangesAsync();

            // Act
            var response = await client.DeleteAsync("api/blogs/admin/30");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            result.GetProperty("success").GetBoolean().Should().BeTrue();
            result.GetProperty("message").GetString().Should().Be("Blog deleted successfully");

            // Verify removed from DB
            using var dbVerify = GetDbContext();
            var dbBlog = await dbVerify.BlogPosts.FindAsync((long)30);
            dbBlog.Should().BeNull();
        }

        [Fact]
        public async Task DeleteBlog_NotFound_Returns404()
        {
            // Arrange
            var client = GetAuthenticatedClient();

            // Act
            var response = await client.DeleteAsync("api/blogs/admin/999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        private class FaultyAppDbContext : AppDbContext
        {
            public FaultyAppDbContext(DbContextOptions<AppDbContext> options) : base(options)
            {
            }

            public override Task<int> SaveChangesAsync(System.Threading.CancellationToken cancellationToken = default)
            {
                throw new InvalidOperationException("Simulated database failure.");
            }

            public override int SaveChanges()
            {
                throw new InvalidOperationException("Simulated database failure.");
            }
        }

        [Fact]
        public async Task Endpoint_ForcedDatabaseException_Returns500InternalServerError()
        {
            // Arrange
            var faultyFactory = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Remove existing AppDbContext options and AppDbContext registration
                    var optionsDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                    if (optionsDescriptor != null)
                    {
                        services.Remove(optionsDescriptor);
                    }

                    var dbContextDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(AppDbContext));
                    if (dbContextDescriptor != null)
                    {
                        services.Remove(dbContextDescriptor);
                    }

                    // Manually register DbContextOptions<AppDbContext>
                    var options = new DbContextOptionsBuilder<AppDbContext>()
                        .UseInMemoryDatabase("FaultyDb_" + Guid.NewGuid().ToString())
                        .Options;

                    services.AddSingleton(options);

                    // Register FaultyAppDbContext under AppDbContext
                    services.AddScoped<AppDbContext, FaultyAppDbContext>();
                });
            });

            var client = faultyFactory.CreateClient();
            
            // Generate valid admin token using faulty factory's JWT service
            using var scope = faultyFactory.Services.CreateScope();
            var jwtService = scope.ServiceProvider.GetRequiredService<IJwtService>();
            var token = jwtService.GenerateToken(new User { Id = 1, Role = AuthRoles.Admin }, AuthRoles.Admin);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var form = new MultipartFormDataContent();
            form.Add(new StringContent("Title"), "Title");
            form.Add(new StringContent("Cat"), "Category");
            form.Add(new StringContent("Sub"), "SubCategory");
            form.Add(new StringContent("Short"), "ShortDescription");
            form.Add(new StringContent("Long"), "LongDescription");

            // Act
            var response = await client.PostAsync("api/blogs/admin", form);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        }

        #endregion
    }
}
