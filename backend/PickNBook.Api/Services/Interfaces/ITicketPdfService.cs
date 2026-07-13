using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Services;

public interface ITicketPdfService
{
    byte[] GenerateFlightTicketPdf(SendFlightTicketEmailRequest request);
    byte[] GenerateBusTicketPdf(SendBusTicketEmailRequest request);
    byte[] GenerateHotelTicketPdf(HotelReservation reservation);
}
