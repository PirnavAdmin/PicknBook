using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;

namespace PickNBook.Api.Services
{
    public interface IFlightMarkupService
    {
        Task<decimal> CalculateMarkupAsync(string airlineCode, TripType tripType, decimal supplierFare);
    }

    public class FlightMarkupService : IFlightMarkupService
    {
        private readonly AppDbContext _dbContext;

        public FlightMarkupService(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<decimal> CalculateMarkupAsync(string airlineCode, TripType tripType, decimal supplierFare)
        {
            if (string.IsNullOrWhiteSpace(airlineCode))
            {
                return 0m;
            }

            var cleanAirlineCode = airlineCode.Trim().ToUpperInvariant();

            // Fetch active rules that match either the specific airline or wildcard '*', and match the trip type
            var rules = await _dbContext.FlightMarkupRules
                .Where(x => x.IsActive && 
                            x.TripType == tripType && 
                            (x.AirlineCode == cleanAirlineCode || x.AirlineCode == "*"))
                .OrderByDescending(x => x.Priority)
                .ToListAsync();

            if (rules.Count == 0)
            {
                return 0m;
            }

            // Prefer specific airline match first, fallback to wildcard '*'
            var rule = rules.FirstOrDefault(x => x.AirlineCode == cleanAirlineCode) ?? rules.First();

            decimal markupAmount = 0m;
            if (rule.MarkupType == FlightMarkupType.Flat)
            {
                markupAmount = rule.MarkupValue;
            }
            else if (rule.MarkupType == FlightMarkupType.Percentage)
            {
                markupAmount = supplierFare * (rule.MarkupValue / 100m);
            }

            return decimal.Round(markupAmount, 2, MidpointRounding.AwayFromZero);
        }
    }
}
