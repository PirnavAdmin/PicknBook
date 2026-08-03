namespace PickNBook.Api.Models
{
    public class FlightReservation
    {
        public int Id { get; set; }
        public string BookingReference { get; set; } = string.Empty;
        public string Pnr { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public int FlightBookingId { get; set; }
        public FlightBooking? FlightBooking { get; set; }
        public string PassengerName { get; set; } = string.Empty;
        public string PassengerPhone { get; set; } = string.Empty;
        public string? PassengerEmail { get; set; }
        public string TravelClass { get; set; } = "Economy";
        public int Adults { get; set; }
        public int Children { get; set; }
        public int Infants { get; set; }
        public int SeatsBooked { get; set; }
        public decimal TotalPriceInr { get; set; }
        public decimal CustomerFareInr { get; set; }
        public decimal NetFareInr { get; set; }
        public decimal DiscountAmountInr { get; set; }
        public decimal ConvenienceFeeInr { get; set; }
        public string? CouponCode { get; set; }
        public string Status { get; set; } = "Booked";
        public DateTime BookedAtUtc { get; set; }
        public DateTime? CancelledAtUtc { get; set; }
        public string? CancellationReason { get; set; }
        public decimal? CancellationChargeInr { get; set; }
        public decimal? RefundAmountInr { get; set; }

        public decimal SupplierBaseFare { get; set; }
        public decimal SupplierTaxAmount { get; set; }
        public decimal SupplierTotalFare { get; set; }
        public decimal MarkupAmount { get; set; }
        public int? PromotionId { get; set; }
        public string? PromotionName { get; set; }
        public decimal PromotionDiscount { get; set; }
        public int? CouponId { get; set; }
        public decimal CouponDiscount { get; set; }
        public decimal ConvenienceFee { get; set; }
        public decimal FinalAmount { get; set; }
        public string? PricingSnapshotJson { get; set; }

        // SRDV Booking Response Fields
        public string? SrdvBookingId { get; set; }
        public string? SrdvPnr { get; set; }
        public string? SrdvTicketResponseJson { get; set; }
    }
}
