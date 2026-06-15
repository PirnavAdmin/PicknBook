using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Services
{
    public class BookingHistoryService :   IBookingHistoryService
    {
        private readonly AppDbContext _context;

        private static readonly TimeSpan IndiaOffset =
    TimeSpan.FromHours(5.5);

        private static DateTime ToIst(DateTime utcDateTime)
        {
            return DateTime.SpecifyKind(
                utcDateTime,
                DateTimeKind.Utc).Add(IndiaOffset);
        }
        public BookingHistoryService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<BookingHistoryDto>> GetBookingHistoryAsync(string  userId)
        {
            var result = new List<BookingHistoryDto>();

            var busBookings = await _context.BusReservations
                .Include(x => x.BusBooking)
                .Where(x => x.UserId == userId)
                .ToListAsync();

            foreach (var booking in busBookings)
            {
                if (booking.BusBooking == null)
                {
                    continue;
                }

                var journeyDateTime =
     ToIst(booking.BusBooking.DepartureTime);
                string status;
;
                if (booking.Status == "Cancelled")
                {
                    status = "Cancelled";
                }
                else if (journeyDateTime >
          ToIst(DateTime.UtcNow))
                {
                    status = "Upcoming";
                }
                else
                {
                    status = "Past";
                }

                string note;
                string ctaLabel;

                switch (status)
                {
                    case "Upcoming":
                        note = "Your journey is coming up soon.";
                        ctaLabel = "View Ticket";
                        break;

                    case "Past":
                        note = "Extra savings on next booking!";
                        ctaLabel = "Book Return";
                        break;

                    case "Cancelled":
                        note = "Seats on this route are filling fast.";
                        ctaLabel = "Book Again";
                        break;

                    default:
                        note = "";
                        ctaLabel = "";
                        break;
                }

                result.Add(new BookingHistoryDto
                {
                    BookingId = booking.Id,
                    BookingReference = booking.BookingReference,

                    TripType = "Bus",

                    From = booking.BusBooking.FromCity,
                    To = booking.BusBooking.ToCity,

                    Date = journeyDateTime
    .ToString("ddd, dd MMM yyyy"),

                    Time = journeyDateTime
    .ToString("HH:mm"),

                    Status = status,

                    Note = note,

                    CtaLabel = ctaLabel
                });
            }

            var hotelBookings = await _context.HotelReservations
                .Where(x => x.UserId == userId)
                .ToListAsync();

            foreach (var booking in hotelBookings)
            {
                var checkInDateTimeIst = ToIst(booking.CheckInDate);
                string status;
                if (booking.Status == "Cancelled")
                {
                    status = "Cancelled";
                }
                else if (checkInDateTimeIst > ToIst(DateTime.UtcNow))
                {
                    status = "Upcoming";
                }
                else
                {
                    status = "Past";
                }

                string note;
                string ctaLabel;

                switch (status)
                {
                    case "Upcoming":
                        note = "Your hotel stay is coming up soon.";
                        ctaLabel = "View Booking";
                        break;

                    case "Past":
                        note = "Hope you enjoyed your stay!";
                        ctaLabel = "Book Again";
                        break;

                    case "Cancelled":
                        note = "Need a room? Book another hotel.";
                        ctaLabel = "Book Again";
                        break;

                    default:
                        note = "";
                        ctaLabel = "";
                        break;
                }

                result.Add(new BookingHistoryDto
                {
                    BookingId = booking.Id,
                    BookingReference = booking.BookingReference,
                    TripType = "Hotel",
                    From = booking.HotelName,
                    To = booking.CityCode,
                    Date = checkInDateTimeIst.ToString("ddd, dd MMM yyyy"),
                    Time = checkInDateTimeIst.ToString("HH:mm"),
                    Status = status,
                    Note = note,
                    CtaLabel = ctaLabel
                });
            }

            return result
                .OrderByDescending(x => x.Date)
                .ToList();
        }
    }
}
