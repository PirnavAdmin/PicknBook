namespace PickNBook.Api.Models
{
    public class BusSeat
    {
        public int Id { get; set; }
        public int BusBookingId { get; set; }
        public string SeatCode { get; set; } = string.Empty;
        public string SeatType { get; set; } = "SEATER";
        public bool IsBooked { get; set; }
    }
}
