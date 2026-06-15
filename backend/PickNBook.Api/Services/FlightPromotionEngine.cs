using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;

namespace PickNBook.Api.Services
{
    public class FlightPromotionEvaluationContext
    {
        public FlightBooking Flight { get; set; } = null!;
        public string TravelClass { get; set; } = string.Empty;
        public TripType TripType { get; set; }
        public decimal BaseFare { get; set; } // Total base fare for all seats in this class before promotions
        public int PassengerCount { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int? SelectedPromotionId { get; set; }
    }

    public interface IFlightPromotionEngine
    {
        Task<List<FlightPromotion>> GetEligiblePromotionsAsync(FlightPromotionEvaluationContext context);
        Task<FlightPromotion?> GetBestPromotionAsync(FlightPromotionEvaluationContext context);
        Task<decimal> CalculatePromotionDiscountAsync(FlightPromotion promotion, decimal baseFare);
        Task<decimal> ApplyPromotionAsync(FlightPromotion promotion, FlightPromotionEvaluationContext context);
    }

    public class FlightPromotionEngine : IFlightPromotionEngine
    {
        private readonly AppDbContext _dbContext;

        public FlightPromotionEngine(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<FlightPromotion>> GetEligiblePromotionsAsync(FlightPromotionEvaluationContext context)
        {
            var now = DateTime.UtcNow;

            // Fetch active promotions that are within validity dates
            var query = _dbContext.FlightPromotions
                .Include(p => p.Conditions)
                .Where(p => p.IsActive &&
                            (!p.StartDate.HasValue || p.StartDate <= now) &&
                            (!p.EndDate.HasValue || p.EndDate >= now));

            if (context.SelectedPromotionId.HasValue)
            {
                query = query.Where(p => p.Id == context.SelectedPromotionId.Value);
            }
            else
            {
                query = query.Where(p => p.IsAutoApply);
            }

            var promotions = await query.ToListAsync();

            var eligible = new List<FlightPromotion>();

            foreach (var promo in promotions)
            {
                // Check general promo minimum fare requirement
                if (context.BaseFare < promo.MinimumFare)
                {
                    continue;
                }

                // Check condition criteria
                bool isEligible = true;
                foreach (var condition in promo.Conditions)
                {
                    if (!EvaluateCondition(condition, context))
                    {
                        isEligible = false;
                        break;
                    }
                }

                if (isEligible)
                {
                    eligible.Add(promo);
                }
            }

            return eligible;
        }

        public async Task<FlightPromotion?> GetBestPromotionAsync(FlightPromotionEvaluationContext context)
        {
            var eligible = await GetEligiblePromotionsAsync(context);
            if (eligible.Count == 0)
            {
                return null;
            }

            // Calculate potential savings for each promotion and select the best one
            var promoSavings = new List<(FlightPromotion Promo, decimal Savings)>();
            foreach (var promo in eligible)
            {
                var savings = await CalculatePromotionDiscountAsync(promo, context.BaseFare);
                promoSavings.Add((promo, savings));
            }

            // Sort by Savings descending, then by Priority descending
            var best = promoSavings
                .OrderByDescending(x => x.Savings)
                .ThenByDescending(x => x.Promo.Priority)
                .FirstOrDefault();

            return best.Promo;
        }

        public Task<decimal> CalculatePromotionDiscountAsync(FlightPromotion promotion, decimal baseFare)
        {
            if (promotion == null || baseFare <= 0)
            {
                return Task.FromResult(0m);
            }

            decimal discount = 0m;
            if (promotion.DiscountType == FlightDiscountType.Percentage)
            {
                discount = baseFare * (promotion.DiscountValue / 100m);
            }
            else if (promotion.DiscountType == FlightDiscountType.Flat)
            {
                discount = promotion.DiscountValue;
            }

            // Limit to max discount if configured
            if (promotion.MaximumDiscount.HasValue && promotion.MaximumDiscount.Value > 0)
            {
                discount = Math.Min(discount, promotion.MaximumDiscount.Value);
            }

            // Cannot exceed original base fare
            discount = Math.Min(discount, baseFare);

            return Task.FromResult(decimal.Round(discount, 2, MidpointRounding.AwayFromZero));
        }

        public async Task<decimal> ApplyPromotionAsync(FlightPromotion promotion, FlightPromotionEvaluationContext context)
        {
            if (promotion == null)
            {
                return 0m;
            }

            return await CalculatePromotionDiscountAsync(promotion, context.BaseFare);
        }

        private bool EvaluateCondition(FlightPromotionCondition condition, FlightPromotionEvaluationContext context)
        {
            try
            {
                switch (condition.ConditionType)
                {
                    case FlightConditionType.TravelClass:
                        return EvaluateString(context.TravelClass, condition.Operator, condition.Value);

                    case FlightConditionType.Airline:
                        // Match either airline name (e.g. "Air India") or airline code prefix (e.g. "AI") from flight number
                        var flightNumber = context.Flight.FlightNumber;
                        var airlineCode = flightNumber.Contains('-') ? flightNumber.Split('-')[0] : string.Empty;
                        return EvaluateString(context.Flight.Airline, condition.Operator, condition.Value) ||
                               EvaluateString(airlineCode, condition.Operator, condition.Value);

                    case FlightConditionType.Route:
                        // Expected condition value: "Delhi-Mumbai" or "DEL-BOM" (case-insensitive)
                        var route = $"{context.Flight.FromCity}-{context.Flight.ToCity}";
                        return EvaluateString(route, condition.Operator, condition.Value);

                    case FlightConditionType.TripType:
                        return EvaluateString(context.TripType.ToString(), condition.Operator, condition.Value);

                    case FlightConditionType.MinimumFare:
                        if (decimal.TryParse(condition.Value, out var minFare))
                        {
                            return EvaluateNumeric(context.BaseFare, condition.Operator, minFare);
                        }
                        return false;

                    case FlightConditionType.PassengerCount:
                        if (int.TryParse(condition.Value, out var passCount))
                        {
                            return EvaluateNumeric(context.PassengerCount, condition.Operator, passCount);
                        }
                        return false;

                    case FlightConditionType.AdvanceBookingDays:
                        if (int.TryParse(condition.Value, out var advanceDays))
                        {
                            var days = (context.Flight.DepartureTime.Date - DateTime.UtcNow.Date).Days;
                            return EvaluateNumeric(days, condition.Operator, advanceDays);
                        }
                        return false;

                    default:
                        return false;
                }
            }
            catch
            {
                return false;
            }
        }

        private bool EvaluateNumeric(decimal actualValue, string op, decimal targetValue)
        {
            var cleanedOp = op.Trim();
            return cleanedOp switch
            {
                ">=" or "GreaterThanOrEqual" => actualValue >= targetValue,
                "<=" or "LessThanOrEqual" => actualValue <= targetValue,
                ">" or "GreaterThan" => actualValue > targetValue,
                "<" or "LessThan" => actualValue < targetValue,
                "==" or "Equals" or "Equal" => actualValue == targetValue,
                "!=" or "NotEqual" or "NotEquals" => actualValue != targetValue,
                _ => false
            };
        }

        private bool EvaluateString(string actualValue, string op, string targetValue)
        {
            if (actualValue == null || targetValue == null)
            {
                return false;
            }

            var cleanedOp = op.Trim();
            var cleanActual = actualValue.Trim();
            var cleanTarget = targetValue.Trim();

            return cleanedOp switch
            {
                "==" or "Equals" or "Equal" => cleanActual.Equals(cleanTarget, StringComparison.OrdinalIgnoreCase),
                "!=" or "NotEqual" or "NotEquals" => !cleanActual.Equals(cleanTarget, StringComparison.OrdinalIgnoreCase),
                "Contains" => cleanActual.Contains(cleanTarget, StringComparison.OrdinalIgnoreCase),
                _ => false
            };
        }
    }
}
