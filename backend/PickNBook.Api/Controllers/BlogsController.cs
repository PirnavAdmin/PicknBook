using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace PickNBook.Api.Controllers;

public class BlogsController : BaseApiController
{
    private const long MaxImageBytes = 1 * 1024 * 1024; // 1MB

    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public BlogsController(AppDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    // ---------------- PUBLIC BLOG LIST ----------------
    [HttpGet]
    public async Task<IActionResult> GetPublishedBlogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? category = null,
        [FromQuery] bool featuredOnly = false)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.BlogPosts
            .AsNoTracking()
            .Where(x => x.IsPublished);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalizedCategory = category.Trim();
            query = query.Where(x => x.Category == normalizedCategory);
        }

        if (featuredOnly)
        {
            query = query.Where(x => x.IsFeatured);
        }

        var total = await query.CountAsync();

        var blogs = await query
            .OrderByDescending(x => x.PublishedAtUtc ?? x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Slug,
                x.Category,
                x.SubCategory,
                x.SubTitle,
                x.ShortDescription,
                x.ImageUrl,
                x.OgImageUrl,
                x.IsFeatured,
                x.MetaTitle,
                x.MetaKeyword,
                x.MetaDescription,
                publishedAtUtc = x.PublishedAtUtc ?? x.CreatedAtUtc,
                x.AddedByName
            })
            .ToListAsync();

        return Ok(new
        {
            total,
            page,
            pageSize,
            blogs
        });
    }

    // ---------------- PUBLIC BLOG DETAILS ----------------
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetPublishedBlogBySlug(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return BadRequest("Slug is required.");
        }

        var normalizedSlug = slug.Trim().ToLowerInvariant();

        var blog = await _context.BlogPosts
            .AsNoTracking()
            .Where(x => x.IsPublished && x.Slug == normalizedSlug)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Slug,
                x.Category,
                x.SubCategory,
                x.SubTitle,
                x.ShortDescription,
                x.LongDescription,
                x.ImageUrl,
                x.OgImageUrl,
                x.IsFeatured,
                x.MetaTitle,
                x.MetaKeyword,
                x.MetaDescription,
                publishedAtUtc = x.PublishedAtUtc ?? x.CreatedAtUtc,
                x.AddedByName
            })
            .FirstOrDefaultAsync();

        if (blog == null)
        {
            return NotFound("Blog not found.");
        }

        return Ok(blog);
    }

    // ---------------- ADMIN BLOG LIST ----------------
    [Authorize(Roles = AuthRoles.AdminOrSuperAdmin)]
    [HttpGet("admin/list")]
    public async Task<IActionResult> GetAdminBlogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? isPublished = null)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.BlogPosts.AsNoTracking().AsQueryable();

        if (isPublished.HasValue)
        {
            query = query.Where(x => x.IsPublished == isPublished.Value);
        }

        var total = await query.CountAsync();

        var blogs = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Slug,
                x.Category,
                x.SubCategory,
                x.IsPublished,
                x.IsFeatured,
                x.AddedByName,
                x.CreatedAtUtc,
                x.UpdatedAtUtc,
                x.PublishedAtUtc
            })
            .ToListAsync();

        return Ok(new
        {
            total,
            page,
            pageSize,
            blogs
        });
    }

    // ---------------- ADMIN CREATE BLOG ----------------
    [Authorize(Roles = AuthRoles.AdminOrSuperAdmin)]
    [HttpPost("admin")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> CreateBlog([FromForm] UpsertBlogRequest request)
    {
        var validationError = ValidateBlogRequest(request);
        if (validationError != null)
        {
            return BadRequest(validationError);
        }

        var slugBase = BuildSlug(request.Title, request.Slug);
        var slug = await EnsureUniqueSlugAsync(slugBase, null);

        var imageUrl = await SaveImageAsync(request.Image, "blogs/images");
        var ogImageUrl = await SaveImageAsync(request.OgImage, "blogs/og-images");

        var userId = TryGetCurrentUserId();
        var addedByName = await ResolveAddedByNameAsync(userId);
        var now = DateTime.UtcNow;

        var blog = new BlogPost
        {
            Title = request.Title.Trim(),
            Slug = slug,
            Category = request.Category.Trim(),
            SubCategory = request.SubCategory.Trim(),
            ShortDescription = request.ShortDescription.Trim(),
            LongDescription = request.LongDescription.Trim(),
            SubTitle = request.SubTitle?.Trim(),
            IsFeatured = request.IsFeatured,
            MetaTitle = request.MetaTitle?.Trim(),
            MetaKeyword = request.MetaKeyword?.Trim(),
            MetaDescription = request.MetaDescription?.Trim(),
            ImageUrl = imageUrl,
            OgImageUrl = ogImageUrl,
            IsPublished = request.IsPublished,
            PublishedAtUtc = request.IsPublished ? now : null,
            AddedByUserId = userId,
            AddedByName = addedByName,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        _context.BlogPosts.Add(blog);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Blog created successfully.",
            blogId = blog.Id,
            blog.Slug
        });
    }

    // ---------------- ADMIN UPDATE BLOG ----------------
    [Authorize(Roles = AuthRoles.AdminOrSuperAdmin)]
    [HttpPut("admin/{id:long}")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UpdateBlog(long id, [FromForm] UpsertBlogRequest request)
    {
        var validationError = ValidateBlogRequest(request);
        if (validationError != null)
        {
            return BadRequest(validationError);
        }

        var blog = await _context.BlogPosts.FirstOrDefaultAsync(x => x.Id == id);
        if (blog == null)
        {
            return NotFound("Blog not found.");
        }

        var slugBase = BuildSlug(request.Title, request.Slug);
        var slug = await EnsureUniqueSlugAsync(slugBase, id);

        if (request.Image != null)
        {
            var previous = blog.ImageUrl;
            blog.ImageUrl = await SaveImageAsync(request.Image, "blogs/images");
            DeleteStaticFile(previous);
        }

        if (request.OgImage != null)
        {
            var previous = blog.OgImageUrl;
            blog.OgImageUrl = await SaveImageAsync(request.OgImage, "blogs/og-images");
            DeleteStaticFile(previous);
        }

        blog.Title = request.Title.Trim();
        blog.Slug = slug;
        blog.Category = request.Category.Trim();
        blog.SubCategory = request.SubCategory.Trim();
        blog.ShortDescription = request.ShortDescription.Trim();
        blog.LongDescription = request.LongDescription.Trim();
        blog.SubTitle = request.SubTitle?.Trim();
        blog.IsFeatured = request.IsFeatured;
        blog.MetaTitle = request.MetaTitle?.Trim();
        blog.MetaKeyword = request.MetaKeyword?.Trim();
        blog.MetaDescription = request.MetaDescription?.Trim();
        blog.IsPublished = request.IsPublished;
        blog.PublishedAtUtc = request.IsPublished
            ? (blog.PublishedAtUtc ?? DateTime.UtcNow)
            : null;
        blog.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Blog updated successfully.",
            blogId = blog.Id,
            blog.Slug
        });
    }

    // ---------------- ADMIN DELETE BLOG ----------------
    [Authorize(Roles = AuthRoles.AdminOrSuperAdmin)]
    [HttpDelete("admin/{id:long}")]
    public async Task<IActionResult> DeleteBlog(long id)
    {
        var blog = await _context.BlogPosts.FirstOrDefaultAsync(x => x.Id == id);
        if (blog == null)
        {
            return NotFound("Blog not found.");
        }

        DeleteStaticFile(blog.ImageUrl);
        DeleteStaticFile(blog.OgImageUrl);

        _context.BlogPosts.Remove(blog);
        await _context.SaveChangesAsync();

        return Ok("Blog deleted successfully.");
    }

    private static string? ValidateBlogRequest(UpsertBlogRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return "Title is required.";
        if (string.IsNullOrWhiteSpace(request.Category))
            return "Category is required.";
        if (string.IsNullOrWhiteSpace(request.SubCategory))
            return "SubCategory is required.";
        if (string.IsNullOrWhiteSpace(request.ShortDescription))
            return "ShortDescription is required.";
        if (string.IsNullOrWhiteSpace(request.LongDescription))
            return "LongDescription is required.";

        if (request.Image != null && request.Image.Length > MaxImageBytes)
            return "Image size must be less than or equal to 1MB.";
        if (request.OgImage != null && request.OgImage.Length > MaxImageBytes)
            return "OG image size must be less than or equal to 1MB.";

        if (request.Image != null && !IsSupportedImage(request.Image.FileName))
            return "Unsupported image format. Use .jpg, .jpeg, .png, or .webp.";
        if (request.OgImage != null && !IsSupportedImage(request.OgImage.FileName))
            return "Unsupported OG image format. Use .jpg, .jpeg, .png, or .webp.";

        return null;
    }

    private static bool IsSupportedImage(string fileName)
    {
        var extension = Path.GetExtension(fileName);
        return AllowedImageExtensions.Contains(extension);
    }

    private static string BuildSlug(string title, string? providedSlug)
    {
        var source = string.IsNullOrWhiteSpace(providedSlug) ? title : providedSlug;
        var lower = source.Trim().ToLowerInvariant();

        lower = Regex.Replace(lower, @"[^a-z0-9\s-]", string.Empty);
        lower = Regex.Replace(lower, @"\s+", "-");
        lower = Regex.Replace(lower, @"-+", "-");
        lower = lower.Trim('-');

        if (string.IsNullOrWhiteSpace(lower))
        {
            lower = $"blog-{Guid.NewGuid():N}".Substring(0, 13);
        }

        return lower;
    }

    private async Task<string> EnsureUniqueSlugAsync(string slugBase, long? ignoreId)
    {
        var slug = slugBase;
        var suffix = 2;

        while (await _context.BlogPosts.AnyAsync(x =>
                   x.Slug == slug &&
                   (!ignoreId.HasValue || x.Id != ignoreId.Value)))
        {
            slug = $"{slugBase}-{suffix}";
            suffix += 1;
        }

        return slug;
    }

    private async Task<string?> SaveImageAsync(IFormFile? file, string folderRelativePath)
    {
        if (file == null || file.Length <= 0)
        {
            return null;
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{extension}";

        var webRootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var targetFolder = Path.Combine(webRootPath, folderRelativePath.Replace('/', Path.DirectorySeparatorChar));

        if (!Directory.Exists(targetFolder))
        {
            Directory.CreateDirectory(targetFolder);
        }

        var filePath = Path.Combine(targetFolder, fileName);
        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/{folderRelativePath}/{fileName}".Replace("\\", "/");
    }

    private void DeleteStaticFile(string? staticPath)
    {
        if (string.IsNullOrWhiteSpace(staticPath))
        {
            return;
        }

        var normalized = staticPath.Trim().Replace("\\", "/");
        if (!normalized.StartsWith('/'))
        {
            return;
        }

        if (normalized.Contains("..", StringComparison.Ordinal))
        {
            return;
        }

        var webRootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var physicalPath = Path.Combine(webRootPath, normalized.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString()));

        if (System.IO.File.Exists(physicalPath))
        {
            System.IO.File.Delete(physicalPath);
        }
    }

    private int? TryGetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    private async Task<string> ResolveAddedByNameAsync(int? userId)
    {
        if (!userId.HasValue)
        {
            return "Admin";
        }

        var user = await _context.Users
            .AsNoTracking()
            .Where(x => x.Id == userId.Value)
            .Select(x => new { x.FirstName, x.LastName })
            .FirstOrDefaultAsync();

        if (user == null)
        {
            return "Admin";
        }

        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        return string.IsNullOrWhiteSpace(fullName) ? "Admin" : fullName;
    }
}
