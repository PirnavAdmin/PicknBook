using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Services
{
    public interface IFlightPricingService
    {
        Task<FlightPricingBreakdownDto> CalculatePricingAsync(
            FlightBooking flight,
            string travelClass,
            TripType tripType,
            int passengerCount,
            string? couponCode,
            string userId,
            int? selectedPromotionId = null);
    }

    public class FlightPricingService : IFlightPricingService
    {
        private readonly AppDbContext _dbContext;
        private readonly IFlightMarkupService _markupService;
        private readonly IFlightPromotionEngine _promotionEngine;
        private readonly IUserBookingHistoryService _bookingHistoryService;

        public FlightPricingService(
            AppDbContext dbContext,
            IFlightMarkupService markupService,
            IFlightPromotionEngine promotionEngine,
            IUserBookingHistoryService bookingHistoryService)
        {
            _dbContext = dbContext;
            _markupService = markupService;
            _promotionEngine = promotionEngine;
            _bookingHistoryService = bookingHistoryService;
        }

        public async Task<FlightPricingBreakdownDto> CalculatePricingAsync(
            FlightBooking flight,
            string travelClass,
            TripType tripType,
            int passengerCount,
            string? couponCode,
            string userId,
            int? selectedPromotionId = null)
        {
            if (flight == null)
            {
                throw new ArgumentNullException(nameof(flight));
            }

            // 1. Get class inventory price
            var classInventory = await _dbContext.FlightClassInventories
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.FlightBookingId == flight.Id && x.TravelClass == travelClass);

            decimal unitPrice = classInventory?.PriceInr ?? flight.PriceInr;

            // 2. Calculate supplier fares
            decimal supplierTotalFare = unitPrice * passengerCount;
            decimal supplierTaxAmount = decimal.Round(supplierTotalFare * 0.12m, 2, MidpointRounding.AwayFromZero);
            decimal supplierBaseFare = supplierTotalFare - supplierTaxAmount;

            // 3. Calculate markup amount (System Markup)
            decimal markupAmount = await _markupService.CalculateMarkupAsync(
                flight.FlightNumber.Split('-')[0], // Extract airline code, e.g. "AI" from "AI-105"
                tripType,
                supplierTotalFare);

            // 3.1 Calculate Agent Markup (if user is B2B Agent)
            decimal agentMarkupAmount = 0m;
            bool isAgent = false;
            if (!string.IsNullOrEmpty(userId))
            {
                var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id.ToString() == userId);
                if (user != null && user.Role == AuthRoles.Agent)
                {
                    isAgent = true;
                    var agentMarkupRule = await _dbContext.AgentMarkupSettings
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x => x.AgentId == user.Id && x.ServiceType == "Flight");

                    if (agentMarkupRule != null && agentMarkupRule.MarkupValue > 0)
                    {
                        if (string.Equals(agentMarkupRule.MarkupType, "Flat", StringComparison.OrdinalIgnoreCase))
                        {
                            agentMarkupAmount = agentMarkupRule.MarkupValue;
                        }
                        else if (string.Equals(agentMarkupRule.MarkupType, "Percentage", StringComparison.OrdinalIgnoreCase))
                        {
                            agentMarkupAmount = supplierTotalFare * (agentMarkupRule.MarkupValue / 100m);
                        }
                    }
                }
            }

            decimal totalMarkup = markupAmount + agentMarkupAmount;
            decimal fareAfterMarkup = supplierTotalFare + totalMarkup;

            // 4. Find and apply the best promotion
            FlightPromotion? bestPromo = null;
            decimal promotionDiscount = 0m;

            if (!isAgent)
            {
                var promotionContext = new FlightPromotionEvaluationContext
                {
                    Flight = flight,
                    TravelClass = travelClass,
                    TripType = tripType,
                    BaseFare = fareAfterMarkup,
                    PassengerCount = passengerCount,
                    UserId = userId,
                    SelectedPromotionId = selectedPromotionId
                };

                bestPromo = await _promotionEngine.GetBestPromotionAsync(promotionContext);
                if (bestPromo != null)
                {
                    promotionDiscount = await _promotionEngine.CalculatePromotionDiscountAsync(bestPromo, fareAfterMarkup);
                }
            }

            decimal fareAfterPromo = fareAfterMarkup - promotionDiscount;

            // 5. Apply manual coupon discount
            var (couponDiscount, couponId, appliedCouponCode) = await CalculateCouponDiscountAsync(
                couponCode,
                fareAfterPromo,
                userId,
                isAgent);

            decimal fareAfterCoupon = fareAfterPromo - couponDiscount;

            // 6. Apply convenience fee
            decimal convenienceFee = await GetConvenienceFeeAsync(fareAfterMarkup, tripType);

            // 7. Calculate Final Amount
            decimal finalAmount = fareAfterCoupon + convenienceFee;

            if (finalAmount < 0)
            {
                finalAmount = 0;
            }

            return new FlightPricingBreakdownDto
            {
                SupplierBaseFare = supplierBaseFare,
                SupplierTaxAmount = supplierTaxAmount,
                SupplierTotalFare = supplierTotalFare,
                MarkupAmount = totalMarkup,
                PromotionDiscount = promotionDiscount,
                CouponDiscount = couponDiscount,
                ConvenienceFee = convenienceFee,
                FinalAmount = decimal.Round(finalAmount, 2, MidpointRounding.AwayFromZero),
                PromotionId = bestPromo?.Id,
                PromotionName = bestPromo?.Name,
                CouponId = couponId,
                CouponCode = appliedCouponCode
            };
        }

        private async Task<(decimal CouponDiscount, int? CouponId, string? CouponCode)> CalculateCouponDiscountAsync(
            string? couponCode,
            decimal fareAfterMarkupAndPromo,
            string userId,
            bool isAgent)
        {
            if (isAgent || string.IsNullOrWhiteSpace(couponCode))
            {
                return (0m, null, null);
            }

            var cleanCode = couponCode.Trim().ToUpperInvariant();
            var coupon = await _dbContext.FlightCoupons
                .FirstOrDefaultAsync(c => c.CouponCode == cleanCode && c.Status == "Active");

            if (coupon == null)
            {
                return (0m, null, null);
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5));
            if (coupon.StartDate > today || coupon.ExpiryDate < today)
            {
                return (0m, null, null);
            }

            if (coupon.UseLimit > 0 && coupon.UsedCount >= coupon.UseLimit)
            {
                return (0m, null, null);
            }

            if (coupon.IsFirstTimeUserOnly)
            {
                string? userPhone = null;
                if (!string.IsNullOrWhiteSpace(userId) && int.TryParse(userId, out var userIntId))
                {
                    var userObj = await _dbContext.Users.FindAsync(userIntId);
                    userPhone = userObj?.PhoneNumber;
                }

                var hasPrior = await _bookingHistoryService.HasPriorBookingAsync(userId, userPhone);
                if (hasPrior)
                {
                    return (0m, null, null);
                }
            }

            decimal discount = 0m;
            if (coupon.CouponType.Equals("Percentage", StringComparison.OrdinalIgnoreCase))
            {
                discount = fareAfterMarkupAndPromo * (coupon.Value / 100m);
            }
            else
            {
                discount = coupon.Value;
            }

            discount = Math.Min(discount, fareAfterMarkupAndPromo);
            return (decimal.Round(discount, 2, MidpointRounding.AwayFromZero), coupon.Id, coupon.CouponCode);
        }

        private async Task<decimal> GetConvenienceFeeAsync(decimal baseFare, TripType tripType)
        {
            // Try trip-specific convenience fee rules first
            var rule = await _dbContext.FlightConvenienceFeeRules
                .FirstOrDefaultAsync(x => x.IsActive && x.TripType == tripType);

            if (rule != null)
            {
                decimal fee = 0m;
                if (rule.FeeType.Equals("Percentage", StringComparison.OrdinalIgnoreCase))
                {
                    fee = baseFare * (rule.FeeValue / 100m);
                }
                else
                {
                    fee = rule.FeeValue;
                }
                return decimal.Round(fee, 2, MidpointRounding.AwayFromZero);
            }

            // Fallback to legacy FlightConvenienceFee table
            var legacyFee = await _dbContext.FlightConvenienceFees
                .Where(x => x.Status == "Active")
                .OrderByDescending(x => x.UpdateDateUtc)
                .FirstOrDefaultAsync();

            if (legacyFee != null)
            {
                decimal fee = 0m;
                if (legacyFee.AmountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase))
                {
                    fee = baseFare * (legacyFee.Value / 100m);
                }
                else
                {
                    fee = legacyFee.Value;
                }
                return decimal.Round(fee, 2, MidpointRounding.AwayFromZero);
            }

            return 0m;
        }
    }
}
