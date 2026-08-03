namespace PickNBook.Api.Models
{
    public class FlightSearchLog
    {
        public int Id { get; set; }
        public string? UserId { get; set; }
        public string? UserOrGuestId { get; set; }
        public bool IsGuest { get; set; }
        public string FromCity { get; set; } = string.Empty;
        public string ToCity { get; set; } = string.Empty;
        public DateOnly? DepartDate { get; set; }
        public DateOnly? ReturnDate { get; set; }
        public string TripType { get; set; } = "OneWay";
        public int Adults { get; set; }
        public int Children { get; set; }
        public int Infants { get; set; }
        public DateTime SearchedAtUtc { get; set; }
    }
}
