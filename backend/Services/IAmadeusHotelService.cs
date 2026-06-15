using PickNBook.Api.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PickNBook.Api.Services
{
    public interface IAmadeusHotelService
    {
        Task<List<HotelSearchResponseDto>> SearchHotelsAsync(
            string cityCode,
            DateTime checkInDate,
            DateTime checkOutDate,
            int adults,
            int rooms);

        Task<HotelOfferDto?> GetOfferDetailsAsync(string offerId);

        Task<HotelBookingResponseDto> BookHotelAsync(
            string offerId,
            string guestName,
            string guestEmail,
            string guestPhone,
            string userId);

        Task<bool> CancelBookingAsync(string providerBookingId);
    }
}
