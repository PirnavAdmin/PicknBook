using PickNBook.Api.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PickNBook.Api.Services
{
    public interface IHotelService
    {
        Task<PickNBookHotelSearchResponseDto> SearchHotelsAsync(
            string cityCode,
            DateTime checkInDate,
            DateTime checkOutDate,
            int adults = 1,
            int rooms = 1,
            int children = 0,
            int[]? childAges = null,
            string preferredHotel = "",
            int minRating = 1,
            int maxRating = 5,
            string bookingMode = "5",
            string guestNationality = "IN");

        Task<PickNBookHotelSearchResponseDto> SearchHotelsMultiLevelAsync(SrdvHotelSearchRequestDto request);

        Task<HotelOfferDto?> GetOfferDetailsAsync(string offerId);

        Task<HotelBookingResponseDto> BookHotelAsync(
            string offerId,
            string guestName,
            string guestEmail,
            string guestPhone,
            string userId);

        Task<bool> CancelBookingAsync(string providerBookingId, string traceId);
        Task<PickNBookBalanceResponseDto> GetApiBalanceAsync();
        Task<PickNBookBalanceLogResponseDto> GetApiBalanceLogAsync();
        Task<PickNBookHotelInfoResponseDto> GetHotelInfoAsync(HotelInfoRequestDto request);
        Task<PickNBookHotelInfoResponseDto> GetHotelInfoAsync(string traceId, string resultIndex, string hotelCode);
        Task<PickNBookHotelRoomResponseDto> GetHotelRoomAsync(HotelRoomRequestDto request);
        Task<PickNBookHotelRoomResponseDto> GetHotelRoomAsync(string traceId, string resultIndex, string hotelCode);
        Task<PickNBookBlockRoomResponseDto> BlockRoomAsync(BlockRoomRequestDto request);
        Task<PickNBookBookRoomResponseDto> BookRoomAsync(HotelBookRequestDto request);
        Task<SendChangeResponseDto> CancelRoomAsync(HotelCancelRequestDto request);
        Task<BalanceResponseDto> GetBalanceAsync(BalanceRequestDto request);
        Task<BalanceLogResponseDto> GetBalanceLogAsync(BalanceLogRequestDto request);
    }
}
