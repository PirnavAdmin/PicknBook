namespace PickNBook.Api.Models
{
    public class FlightCancellationRequest
    {
        public int Id { get; set; }
        public int FlightReservationId { get; set; }
        public FlightReservation? FlightReservation { get; set; }
        public DateTime RequestDateUtc { get; set; }
        public string CancellationStatus { get; set; } = "Pending";
        public string CustomerRefundStatus { get; set; } = "Pending";
        public string AdminRefundStatus { get; set; } = "Pending";
        public decimal CustomerRefundAmountInr { get; set; }
        public decimal CustomerCancellationChargeInr { get; set; }
        public decimal CustomerServiceChargeInr { get; set; }
        public decimal AdminRefundAmountInr { get; set; }
        public decimal AdminCancellationChargeInr { get; set; }
        public decimal AdminServiceChargeInr { get; set; }
        public string? SupplierRemark { get; set; }
        public string? CustomerRemark { get; set; }
        public string? AdminRemark { get; set; }
    }
}
