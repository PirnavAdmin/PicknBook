namespace PickNBook.Api.Models
{
    public class FlightReservationPassenger
    {
        public int Id { get; set; }
        public int FlightReservationId { get; set; }
        public FlightReservation? FlightReservation { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string PassengerType { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string? SeatNumber { get; set; }
        public bool IsCancelled { get; set; } = false;
        public DateTime? CancelledAtUtc { get; set; }
    }
}
