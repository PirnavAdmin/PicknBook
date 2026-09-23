using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace PickNBook.Api.Controllers;

[Authorize(Roles = AuthRoles.AdminOrSuperAdmin)]
public class CustomersController : AdminApiController
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IEmailService _emailService;

    public CustomersController(AppDbContext context, IPasswordHasher<User> passwordHasher, IEmailService emailService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _emailService = emailService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCustomers(
        [FromQuery] string? status,
        [FromQuery] string? walletStatus,
        [FromQuery] string? search,
        [FromQuery] decimal? minBalance,
        [FromQuery] decimal? maxBalance)
    {
        var query = _context.Users
            .AsNoTracking()
            .Where(x => x.Role == AuthRoles.User);

        // Search filter
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchClean = search.Trim().ToLowerInvariant();
            query = query.Where(x =>
                (x.FirstName + " " + x.LastName).ToLower().Contains(searchClean) ||
                x.Email.ToLower().Contains(searchClean) ||
                x.PhoneNumber.Contains(searchClean));
        }

        // Status filter
        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.Status == status);
        }

        // Wallet status filter
        if (!string.IsNullOrWhiteSpace(walletStatus) && !string.Equals(walletStatus, "All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.WalletStatus == walletStatus);
        }

        // Balance filters
        if (minBalance.HasValue)
        {
            query = query.Where(x => x.WalletBalance >= minBalance.Value);
        }

        if (maxBalance.HasValue)
        {
            query = query.Where(x => x.WalletBalance <= maxBalance.Value);
        }

        var customers = await query
            .OrderByDescending(x => x.Id)
            .Select(x => new CustomerResponseDto
            {
                Id = x.Id,
                Status = x.Status,
                CustomerName = x.FirstName + " " + x.LastName,
                EmailId = x.Email,
                Mobile = x.PhoneNumber,
                WalletStatus = x.WalletStatus,
                WalletBalance = x.WalletBalance,
                AltMobile = x.AltMobile,
                Gender = x.Gender,
                Currency = x.Currency,
                LoginId = x.LoginId,
                RefferedBy = x.RefferedBy,
                Address = x.Address,
                City = x.City,
                State = x.State,
                Country = x.Country,
                Pincode = x.Pincode,
                Remark = x.Remark,
                AadharNumber = x.AadharNumber,
                PanNumber = x.PanNumber,
                PanName = x.PanName,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();

        return Ok(customers);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var emailClean = request.Email.Trim().ToLowerInvariant();
        var phoneClean = request.Mobile.Trim();

        // Check unique constraints
        var emailExists = await _context.Users.AnyAsync(x => x.Email.ToLower() == emailClean);
        if (emailExists)
        {
            return BadRequest("Email ID is already registered.");
        }

        var phoneExists = await _context.Users.AnyAsync(x => x.PhoneNumber == phoneClean);
        if (phoneExists)
        {
            return BadRequest("Mobile number is already registered.");
        }

        var user = new User
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = emailClean,
            PhoneNumber = phoneClean,
            Role = AuthRoles.User,
            Status = request.Status,
            WalletStatus = request.WalletStatus,
            WalletBalance = 0.00m,
            AltMobile = request.AltMobile?.Trim(),
            Gender = request.Gender,
            Address = request.Address?.Trim(),
            City = request.City?.Trim(),
            State = request.State?.Trim(),
            Country = request.Country?.Trim(),
            Pincode = request.Pincode?.Trim(),
            Remark = request.Remark?.Trim(),
            AadharNumber = request.AadharNumber?.Trim(),
            PanNumber = request.PanNumber?.Trim(),
            PanName = request.PanName?.Trim(),
            RefferedBy = request.RefferedBy?.Trim(),
            LoginId = string.IsNullOrWhiteSpace(request.LoginId) ? emailClean : request.LoginId.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Customer saved successfully.",
            customerId = user.Id
        });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCustomer(int id, [FromBody] CreateCustomerRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var customer = await _context.Users.FirstOrDefaultAsync(x => x.Id == id && x.Role == AuthRoles.User);
        if (customer == null)
        {
            return NotFound("Customer not found.");
        }

        var emailClean = request.Email.Trim().ToLowerInvariant();
        var phoneClean = request.Mobile.Trim();

        // Check unique constraints (exclude current user)
        var emailExists = await _context.Users.AnyAsync(x => x.Email.ToLower() == emailClean && x.Id != id);
        if (emailExists)
        {
            return BadRequest("Email ID is already registered to another user.");
        }

        var phoneExists = await _context.Users.AnyAsync(x => x.PhoneNumber == phoneClean && x.Id != id);
        if (phoneExists)
        {
            return BadRequest("Mobile number is already registered to another user.");
        }

        customer.FirstName = request.FirstName.Trim();
        customer.LastName = request.LastName.Trim();
        customer.Email = emailClean;
        customer.PhoneNumber = phoneClean;
        customer.Status = request.Status;
        customer.WalletStatus = request.WalletStatus;
        customer.AltMobile = request.AltMobile?.Trim();
        customer.Gender = request.Gender;
        customer.Address = request.Address?.Trim();
        customer.City = request.City?.Trim();
        customer.State = request.State?.Trim();
        customer.Country = request.Country?.Trim();
        customer.Pincode = request.Pincode?.Trim();
        customer.Remark = request.Remark?.Trim();
        customer.AadharNumber = request.AadharNumber?.Trim();
        customer.PanNumber = request.PanNumber?.Trim();
        customer.PanName = request.PanName?.Trim();
        customer.RefferedBy = request.RefferedBy?.Trim();
        customer.LoginId = string.IsNullOrWhiteSpace(request.LoginId) ? emailClean : request.LoginId.Trim();

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            customer.PasswordHash = _passwordHasher.HashPassword(customer, request.Password);
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Customer updated successfully.",
            customerId = customer.Id
        });
    }

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var customer = await _context.Users.FirstOrDefaultAsync(x => x.Id == id && x.Role == AuthRoles.User);
        if (customer == null)
        {
            return NotFound("Customer not found.");
        }

        customer.Status = string.Equals(customer.Status, "Active", StringComparison.OrdinalIgnoreCase) ? "Inactive" : "Active";
        await _context.SaveChangesAsync();

        string subject = customer.Status == "Active" ? "Account Activated" : "Account Suspended";
        string body = customer.Status == "Active" 
            ? $"Hello {customer.FirstName},<br><br>Welcome back! Your Pick&amp;book account has been activated."
            : $"Hello {customer.FirstName},<br><br>Notice: Your Pick&amp;book account has been temporarily suspended. Please contact support for more information.";
        
        await _emailService.SendEmailAsync(customer.Email, subject, body);

        return Ok(new { message = "Customer status updated successfully.", status = customer.Status });
    }

    [HttpPut("{id:int}/wallet-status")]
    public async Task<IActionResult> ToggleWalletStatus(int id)
    {
        var customer = await _context.Users.FirstOrDefaultAsync(x => x.Id == id && x.Role == AuthRoles.User);
        if (customer == null)
        {
            return NotFound("Customer not found.");
        }

        customer.WalletStatus = string.Equals(customer.WalletStatus, "Active", StringComparison.OrdinalIgnoreCase) ? "Inactive" : "Active";
        await _context.SaveChangesAsync();

        string subject = customer.WalletStatus == "Active" ? "Wallet Activated" : "Wallet Suspended";
        string body = customer.WalletStatus == "Active" 
            ? $"Hello {customer.FirstName},<br><br>Your Pick&amp;book wallet has been activated."
            : $"Hello {customer.FirstName},<br><br>Notice: Your Pick&amp;book wallet has been temporarily suspended.";
        
        await _emailService.SendEmailAsync(customer.Email, subject, body);

        return Ok(new { message = "Wallet status updated successfully.", walletStatus = customer.WalletStatus });
    }

    [HttpPost("{id:int}/wallet/add")]
    public async Task<IActionResult> AddWalletBalance(int id, [FromBody] AddWalletBalanceRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var customer = await _context.Users.FirstOrDefaultAsync(x => x.Id == id && x.Role == AuthRoles.User);
        if (customer == null)
        {
            return NotFound("Customer not found.");
        }

        customer.WalletBalance += request.Amount;
        customer.WalletStatus = "Active"; // Ensure wallet is Active when balance is added
        await _context.SaveChangesAsync();

        var customerFullName = $"{customer.FirstName} {customer.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(customerFullName))
        {
            customerFullName = "Valued Customer";
        }

        string subject = "Wallet Balance Added Successfully – Pick&book";
        string transactionDate = DateTime.UtcNow.ToString("dd MMMM yyyy");

        string body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Wallet Balance Added</title>
</head>
<body style='margin:0; padding:0; background-color:#f4f6f9; font-family:-apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif;'>
    <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='100%' style='background-color:#f4f6f9; padding:30px 15px;'>
        <tr>
            <td align='center'>
                <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width:580px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.06); border:1px solid #e5e7eb;'>
                    
                    <!-- Header -->
                    <tr>
                        <td style='background:linear-gradient(135deg, #BE123C 0%, #E11D48 100%); padding:28px 30px; text-align:center;'>
                            <h1 style='margin:0; font-size:26px; font-weight:800; color:#ffffff; letter-spacing:0.5px;'>Pick&amp;book</h1>
                            <p style='margin:6px 0 0; font-size:14px; color:#ffe4e6; font-weight:500;'>Wallet Balance Added Successfully</p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style='padding:32px 30px;'>
                            <p style='margin:0 0 16px; font-size:16px; color:#111827; font-weight:600;'>
                                Dear {customerFullName},
                            </p>
                            <p style='margin:0 0 24px; font-size:15px; color:#4b5563; line-height:1.6;'>
                                Your Pick&amp;book wallet has been successfully credited. The updated balance is now available for your future bookings.
                            </p>

                            <!-- Transaction Details Card -->
                            <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='100%' style='background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:18px 20px; margin-bottom:24px;'>
                                <tr>
                                    <td colspan='2' style='padding-bottom:12px; border-bottom:1px solid #e5e7eb;'>
                                        <span style='font-size:12px; font-weight:700; text-transform:uppercase; color:#6b7280; letter-spacing:0.5px;'>Transaction Details</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style='padding:10px 0 6px; font-size:14px; color:#6b7280;'>Amount Added:</td>
                                    <td style='padding:10px 0 6px; font-size:16px; font-weight:700; color:#059669; text-align:right;'>+₹{request.Amount:N2}</td>
                                </tr>
                                <tr>
                                    <td style='padding:6px 0; font-size:14px; color:#6b7280;'>Updated Wallet Balance:</td>
                                    <td style='padding:6px 0; font-size:16px; font-weight:700; color:#111827; text-align:right;'>₹{customer.WalletBalance:N2}</td>
                                </tr>
                                <tr>
                                    <td style='padding:6px 0 2px; font-size:14px; color:#6b7280;'>Transaction Date:</td>
                                    <td style='padding:6px 0 2px; font-size:14px; font-weight:500; color:#374151; text-align:right;'>{transactionDate}</td>
                                </tr>
                            </table>

                            <p style='margin:0 0 24px; font-size:14px; color:#6b7280; line-height:1.6;'>
                                You can use your wallet balance to book flights, hotels, and buses seamlessly across Pick&amp;book.
                            </p>

                            <p style='margin:0 0 6px; font-size:15px; color:#111827;'>
                                Thank you for choosing <strong>Pick&amp;book</strong>.
                            </p>

                            <p style='margin:20px 0 0; font-size:14px; color:#4b5563; line-height:1.5;'>
                                Regards,<br>
                                <strong style='color:#BE123C;'>Pick&amp;book Support Team</strong><br>
                                <span style='font-size:12px; color:#9ca3af;'>Travel made easier.</span>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style='background-color:#f9fafb; padding:18px 30px; text-align:center; border-top:1px solid #f3f4f6; font-size:12px; color:#9ca3af; line-height:1.5;'>
                            This is an automated notification from Pick&amp;book. Please do not reply directly to this email.<br>
                            &copy; 2026 Pick&amp;book Travel Services. All rights reserved.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";

        try
        {
            await _emailService.SendEmailAsync(customer.Email, subject, body);
        }
        catch
        {
            // Email sending failure should not prevent wallet balance update
        }

        return Ok(new { message = "Wallet balance updated successfully.", walletBalance = customer.WalletBalance });
    }

    [HttpPost("{id:int}/wallet/reset")]
    public async Task<IActionResult> ResetWalletBalance(int id)
    {
        var customer = await _context.Users.FirstOrDefaultAsync(x => x.Id == id && x.Role == AuthRoles.User);
        if (customer == null)
        {
            return NotFound("Customer not found.");
        }

        customer.WalletBalance = 0.00m;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Wallet balance reset successfully.", walletBalance = customer.WalletBalance });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        var customer = await _context.Users.FirstOrDefaultAsync(x => x.Id == id && x.Role == AuthRoles.User);
        if (customer == null)
        {
            return NotFound("Customer not found.");
        }

        _context.Users.Remove(customer);
        await _context.SaveChangesAsync();

        return Ok("Customer removed successfully.");
    }
}
