using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using PickNBook.Api.Data;
using PickNBook.Api.Models;

namespace PickNBook.Api.Services
{
    public interface IHotelMarkupService
    {
        Task<decimal> CalculateMarkupAsync(decimal supplierBasePrice, string? cityCode = null, string? hotelCode = null, string userType = "B2C");
    }

    public class HotelMarkupService : IHotelMarkupService
    {
        private readonly AppDbContext _dbContext;
        private readonly IMemoryCache _cache;

        public HotelMarkupService(AppDbContext dbContext, IMemoryCache cache)
        {
            _dbContext = dbContext;
            _cache = cache;
        }

        public async Task<decimal> CalculateMarkupAsync(decimal supplierBasePrice, string? cityCode = null, string? hotelCode = null, string userType = "B2C")
        {
            if (supplierBasePrice <= 0)
            {
                return 0m;
            }

            var cleanCityCode = string.IsNullOrWhiteSpace(cityCode) ? "*" : cityCode.Trim().ToUpperInvariant();
            var cleanHotelCode = string.IsNullOrWhiteSpace(hotelCode) ? "*" : hotelCode.Trim();
            var cleanUserType = string.IsNullOrWhiteSpace(userType) ? "B2C" : userType.Trim().ToUpperInvariant();

            // Fetch all active rules from cache or DB (cached for 30 minutes)
            var allActiveRules = await _cache.GetOrCreateAsync("ActiveHotelMarkupRules", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);
                return await _dbContext.HotelMarkupRules.AsNoTracking().Where(x => x.IsActive).ToListAsync();
            });

            if (allActiveRules == null || allActiveRules.Count == 0)
            {
                return 0m;
            }

            // Filter rules from the in-memory list
            var rules = allActiveRules
                .Where(x => (x.UserType == "All" || string.Equals(x.UserType, cleanUserType, StringComparison.OrdinalIgnoreCase)) &&
                            (x.CityCode == "*" || string.Equals(x.CityCode, cleanCityCode, StringComparison.OrdinalIgnoreCase)) &&
                            (x.HotelCode == "*" || string.Equals(x.HotelCode, cleanHotelCode, StringComparison.OrdinalIgnoreCase)))
                .ToList();

            if (rules.Count == 0)
            {
                return 0m;
            }

            // Order by Priority descending, then specificity (HotelCode match > CityCode match > Global)
            var rule = rules
                .OrderByDescending(x => x.Priority)
                .ThenByDescending(x => x.HotelCode != "*" ? 2 : (x.CityCode != "*" ? 1 : 0))
                .First();

            decimal markupAmount = 0m;
            if (string.Equals(rule.MarkupType, "Flat", StringComparison.OrdinalIgnoreCase))
            {
                markupAmount = rule.MarkupValue;
            }
            else if (string.Equals(rule.MarkupType, "Percentage", StringComparison.OrdinalIgnoreCase))
            {
                markupAmount = supplierBasePrice * (rule.MarkupValue / 100m);
            }

            return decimal.Round(markupAmount, 2, MidpointRounding.AwayFromZero);
        }
    }
}
