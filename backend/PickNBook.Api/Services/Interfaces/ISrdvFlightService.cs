using PickNBook.Api.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PickNBook.Api.Services
{
    public interface ISrdvFlightService
    {
        Task<string> AuthenticateAsync();
        Task<List<FlightOfferDto>> SearchFlightsAsync(
            string origin, 
            string destination, 
            DateTime departureDate, 
            int adultCount = 1, 
            int childCount = 0, 
            int infantCount = 0);
        Task<FlightFareQuoteDto> GetFareQuoteAsync(string traceId, string resultIndex);
        Task<FlightBookingResponseDto> BookFlightAsync(FlightBookingRequestDto request);
        Task<FlightTicketResponseDto> TicketFlightAsync(string pnr, string bookingId);
    }
}
