using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Services;

public interface ITicketEmailService
{
    Task SendFlightTicketAsync(SendFlightTicketEmailRequest request);
    Task SendBusTicketAsync(SendBusTicketEmailRequest request);
    Task SendBusCancellationAsync(SendBusTicketEmailRequest request, decimal refundAmount);
    Task SendFlightCancellationAsync(SendFlightTicketEmailRequest request, decimal refundAmount);
}
