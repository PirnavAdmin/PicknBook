using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace PickNBook.Api.Controllers;

[Authorize(Roles = AuthRoles.AdminOrSuperAdmin)]
public class CustomersController : AdminApiController
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;

    public CustomersController(AppDbContext context, IPasswordHasher<User> passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
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
