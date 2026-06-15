using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Services;

public class TicketEmailService : ITicketEmailService
{
    private readonly IEmailService _emailService;
    private readonly ITicketPdfService _ticketPdfService;

    public TicketEmailService(
        IEmailService emailService,
        ITicketPdfService ticketPdfService)
    {
        _emailService = emailService;
        _ticketPdfService = ticketPdfService;
    }

    public async Task SendFlightTicketAsync(
        SendFlightTicketEmailRequest request)
    {
        var pdfBytes =
            _ticketPdfService.GenerateFlightTicketPdf(request);

        var attachment = new EmailAttachment
        {
            FileName =
                $"ticket-{request.BookingReference}.pdf",

            ContentType = "application/pdf",

            Content = pdfBytes
        };

        var subject =
            $"Your PickNBook Ticket - {request.BookingReference}";

        var body = $@"
            <p>Hi {request.PassengerName},</p>

            <p>
                Your ticket is confirmed for
                <b>{request.Origin} to {request.Destination}</b>.
            </p>

            <p>
                Please find your ticket PDF attached
                with this email.
            </p>

            <p>Have a safe journey.</p>

            <p>Team PickNBook</p>";

        await _emailService.SendEmailWithAttachmentsAsync(
            request.ToEmail,
            subject,
            body,
            [attachment]);
    }

    public async Task SendBusTicketAsync(
        SendBusTicketEmailRequest request)
    {
        var pdfBytes =
            _ticketPdfService.GenerateBusTicketPdf(request);

        var attachment = new EmailAttachment
        {
            FileName =
                $"bus-ticket-{request.BookingReference}.pdf",

            ContentType = "application/pdf",

            Content = pdfBytes
        };

        var subject =
            $"Your Bus Ticket - {request.BookingReference}";

        // =========================================
        // PASSENGER LIST
        // =========================================

        var passengerLines =
            request.Passengers.Count > 0
            ? string.Join(
                "<br/>",
                request.Passengers.Select((p, i) =>
                    $"&nbsp;&nbsp;{i + 1}. {p.FullName} — Seat <b>{p.SeatNumber}</b>"))
            : $"Seats: {request.SeatNumber}";

        // =========================================
        // DISCOUNT BREAKDOWN
        // =========================================

        var discountSection = string.Empty;

        if (request.AutoDiscountAmount > 0)
        {
            discountSection += $@"
            <p>
                <b>Offer Discount:</b>
                - ₹{request.AutoDiscountAmount:0.00}
            </p>";
        }

        if (request.CouponDiscountAmount > 0)
        {
            discountSection += $@"
            <p>
                <b>Coupon Discount:</b>
                - ₹{request.CouponDiscountAmount:0.00}
            </p>";
        }

        // BACKWARD COMPATIBILITY
        if (string.IsNullOrWhiteSpace(discountSection) &&
            request.DiscountAmount.GetValueOrDefault() > 0)
        {
            discountSection = $@"
            <p>
                <b>Discount:</b>
                - ₹{request.DiscountAmount:0.00}
            </p>";
        }

        // =========================================
        // EMAIL BODY
        // =========================================

        var body = $@"
        <p>Hi {request.PassengerName},</p>

        <p>
            Your bus booking is confirmed for
            <b>{request.Origin} → {request.Destination}</b>.
        </p>

        <p>
            <b>Booking Reference:</b>
            {request.BookingReference}
        </p>

        <p>
            <b>Departure:</b>
            {ToIst(request.DepartureTime):ddd, dd MMM yyyy HH:mm}
        </p>

        <p>
            <b>Passengers:</b><br/>
            {passengerLines}
        </p>

        <p>
            <b>Fare:</b>
            ₹{request.NetFare:0.00}
        </p>

        {discountSection}

        <p>
            <b>GST ({request.GstPercent:0.##}%):</b>
            ₹{request.GstAmount:0.00}
        </p>

        <p>
            <b>Convenience Fee:</b>
            ₹{request.ConvenienceFee:0.00}
        </p>

        <p>
            <b>Total Fare:</b>
            ₹{request.Price:0.00}
        </p>

        <p>
            Please find your ticket PDF attached.
            Have a safe journey!
        </p>

        <p>Team PickNBook</p>";

        await _emailService.SendEmailWithAttachmentsAsync(
            request.ToEmail,
            subject,
            body,
            [attachment]);
    }

    public async Task SendBusCancellationAsync(
        SendBusTicketEmailRequest request,
        decimal refundAmount)
    {
        var subject =
            $"Bus Ticket Cancelled - {request.BookingReference}";

        // =========================================
        // PASSENGER LIST
        // =========================================

        var passengerLines =
            request.Passengers.Count > 0
            ? string.Join(
                "<br/>",
                request.Passengers.Select((p, i) =>
                    $"&nbsp;&nbsp;{i + 1}. {p.FullName} — Seat <b>{p.SeatNumber}</b>"))
            : $"Seats: {request.SeatNumber}";

        // =========================================
        // DISCOUNT BREAKDOWN
        // =========================================

        var discountSection = string.Empty;

        if (request.AutoDiscountAmount > 0)
        {
            discountSection += $@"
            <p>
                <b>Offer Discount:</b>
                - ₹{request.AutoDiscountAmount:0.00}
            </p>";
        }

        if (request.CouponDiscountAmount > 0)
        {
            discountSection += $@"
            <p>
                <b>Coupon Discount:</b>
                - ₹{request.CouponDiscountAmount:0.00}
            </p>";
        }

        // BACKWARD COMPATIBILITY
        if (string.IsNullOrWhiteSpace(discountSection) &&
            request.DiscountAmount.GetValueOrDefault() > 0)
        {
            discountSection = $@"
            <p>
                <b>Discount:</b>
                - ₹{request.DiscountAmount:0.00}
            </p>";
        }

        // =========================================
        // EMAIL BODY
        // =========================================

        var body = $@"
        <p>Hi {request.PassengerName},</p>

        <p>
            Your bus ticket for
            <b>{request.Origin} → {request.Destination}</b>
            has been
            <b style='color:red;'>cancelled</b>.
        </p>

        <p>
            <b>Booking Reference:</b>
            {request.BookingReference}
        </p>

        <p>
            <b>Passengers:</b><br/>
            {passengerLines}
        </p>

        <p>
            <b>Original Fare:</b>
            ₹{request.NetFare:0.00}
        </p>

        {discountSection}

        <p>
            <b>GST ({request.GstPercent:0.##}%):</b>
            ₹{request.GstAmount:0.00}
        </p>

        <p>
            <b>Convenience Fee:</b>
            ₹{request.ConvenienceFee:0.00}
        </p>

        <p>
            <b>Total Fare:</b>
            ₹{request.Price:0.00}
        </p>

        <p>
            <b>Refund Amount:</b>
            ₹{refundAmount:0.00}
        </p>

        <p>
            The refund will be processed to your
            original payment method within
            5–7 working days.
        </p>

        <p>
            If you did not initiate this cancellation,
            please contact support immediately.
        </p>

        <p>
            Regards,<br/>
            Team PickNBook
        </p>";

        // =========================================
        // PDF
        // =========================================

        var pdfBytes =
            _ticketPdfService.GenerateBusTicketPdf(request);

        var attachment = new EmailAttachment
        {
            FileName =
                $"bus-cancelled-{request.BookingReference}.pdf",

            ContentType = "application/pdf",

            Content = pdfBytes
        };

        await _emailService.SendEmailWithAttachmentsAsync(
            request.ToEmail,
            subject,
            body,
            [attachment]);
    }

    public async Task SendFlightCancellationAsync(
        SendFlightTicketEmailRequest request,
        decimal refundAmount)
    {
        var subject = $"Flight Ticket Cancelled - {request.BookingReference}";

        var passengerLines = string.Empty;
        if (request.Passengers != null && request.Passengers.Count > 0)
        {
            passengerLines = "<p><b>Cancelled Passengers:</b><br/>" +
                string.Join("<br/>", request.Passengers.Select((p, i) =>
                    $"&nbsp;&nbsp;{i + 1}. {p.FullName} — Seat <b>{p.SeatNumber ?? "N/A"}</b>")) + "</p>";
        }
        else
        {
            passengerLines = $"<p><b>Passenger:</b> {request.PassengerName} — Seat <b>{request.SeatNumber ?? "N/A"}</b></p>";
        }

        var body = $@"
        <p>Hi {request.PassengerName},</p>

        <p>
            Your flight ticket for
            <b>{request.Origin} to {request.Destination}</b>
            has been
            <b style='color:red;'>cancelled</b>.
        </p>

        <p>
            <b>Booking Reference:</b>
            {request.BookingReference}
        </p>

        {passengerLines}

        <p>
            <b>Original Fare:</b>
            ₹{request.Price:0.00}
        </p>

        <p>
            <b>Refund Amount:</b>
            ₹{refundAmount:0.00}
        </p>

        <p>
            The refund will be processed to your
            original payment method within
            5–7 working days.
        </p>

        <p>
            If you did not initiate this cancellation,
            please contact support immediately.
        </p>

        <p>
            Regards,<br/>
            Team PickNBook
        </p>";

        await _emailService.SendEmailAsync(
            request.ToEmail,
            subject,
            body);
    }

    private static DateTime ToIst(DateTime utc)
    {
        return DateTime.SpecifyKind(
            utc,
            DateTimeKind.Utc
        ).AddHours(5.5);
    }
}