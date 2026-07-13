namespace PickNBook.Api.Models
{
    public class FlightClassInventory
    {
        public int Id { get; set; }
        public int FlightBookingId { get; set; }
        public FlightBooking? FlightBooking { get; set; }
        public string TravelClass { get; set; } = "Economy";
        public int TotalSeats { get; set; }
        public int AvailableSeats { get; set; }
        public decimal PriceInr { get; set; }
    }
}
