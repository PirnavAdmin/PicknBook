using System.ComponentModel.DataAnnotations;

public static class AuthRoles
{
    public const string User = "User";
    public const string Admin = "Admin";
    public const string SuperAdmin = "SuperAdmin";
    public const string AdminOrSuperAdmin = Admin + "," + SuperAdmin;

    public static bool IsAdminScope(string? role)
    {
        return string.Equals(role, Admin, StringComparison.OrdinalIgnoreCase) ||
               string.Equals(role, SuperAdmin, StringComparison.OrdinalIgnoreCase);
    }
}

public class User
{
    public int Id { get; set; }

    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string LastName { get; set; } = string.Empty;

    [Required]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = AuthRoles.User;

    public string? ProfileImageUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
