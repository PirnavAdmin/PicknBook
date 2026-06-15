using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Services;

public interface IBusPromotionEngineService
{
    Task<BusPricingPreviewResponseDto> CalculateAsync(
        int busId,
        List<string> seatCodes,
        string? couponCode,
        int? promotionId,
        int? userId = null,
         int? selectedFeaturedOfferId = null);
}