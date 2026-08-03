using System.Collections.Generic;

namespace PickNBook.Api.Models.DTOs
{
    public class SrdvBookingCallbackRequestDto
    {
        public string ClientId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string EndUserIp { get; set; } = string.Empty;
        public string TraceId { get; set; } = string.Empty;
        public string BookingId { get; set; } = string.Empty;
        public string PNR { get; set; } = string.Empty;
        public string GdsPNR { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Remark { get; set; } = string.Empty;
        public List<SrdvCallbackPassengerDto> Passengers { get; set; } = new();
    }

    public class SrdvCallbackPassengerDto
    {
        public string Title { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? TicketNumber { get; set; }
    }

    public class SrdvBookingCallbackResponseDto
    {
        public SrdvCallbackErrorDto Error { get; set; } = new();
    }

    public class SrdvCallbackErrorDto
    {
        public string ErrorCode { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
    }
}
