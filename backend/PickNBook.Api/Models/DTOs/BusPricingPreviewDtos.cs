namespace PickNBook.Api.Models.DTOs
{
    public class BusPricingPreviewRequestDto
    {
        public int BusId { get; set; }

        public List<string> SeatCodes { get; set; } = [];

        public string? CouponCode { get; set; }
        public int? PromotionId { get; set; }
        public int? SelectedFeaturedOfferId { get; set; }
    }

    public class BusSeatPriceBreakdownDto
    {
        public string SeatCode { get; set; } = string.Empty;

        public string SeatType { get; set; } = string.Empty;

        public decimal BaseFare { get; set; }

        public decimal MarkupAmount { get; set; }

        public decimal FareBeforeTax { get; set; }
    }

    public class BusPricingPreviewResponseDto
    {
        public int BusId { get; set; }

        public string GstCategory { get; set; } = string.Empty;

        public decimal SubtotalBeforeCoupon { get; set; }
        public decimal CouponAmount { get; set; }
        public decimal TaxableFare { get; set; }

        public decimal GstPercent { get; set; }

        public decimal GstAmount { get; set; }

        public decimal ConvenienceFee { get; set; }

        public decimal GrandTotal { get; set; }

        public List<BusSeatPriceBreakdownDto> Seats { get; set; } = [];
        public string? AppliedPromotionCode { get; set; }
        public string? AutoPromotionCode { get; set; }

        public string? AppliedPromotionTitle { get; set; }

        public string? DiscountSource { get; set; }
        public string? DiscountLabel { get; set; }

        public bool CouponAllowed { get; set; } = true;
        public string? AppliedPromotionType { get; set; }
        public decimal AutoDiscountAmount { get; set; }

        public decimal CouponDiscountAmount { get; set; }
        public decimal ManualDiscountAmount { get; set; }
        public decimal TotalDiscount { get; set; }
        public decimal FinalAmount { get; set; }
    }
}
