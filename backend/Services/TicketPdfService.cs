
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using PickNBook.Api.Models.DTOs;
using QRCoder;

namespace PickNBook.Api.Services;

public class TicketPdfService : ITicketPdfService
{
    public byte[] GenerateFlightTicketPdf(SendFlightTicketEmailRequest request)
    {
        using var document = new PdfDocument();
        document.Info.Title = $"Flight Ticket - {request.BookingReference}";

        var page = document.AddPage();

        using var gfx = XGraphics.FromPdfPage(page);

        var titleFont = new XFont("Arial", 18, XFontStyle.Bold);
        var headerFont = new XFont("Arial", 11, XFontStyle.Bold);
        var valueFont = new XFont("Arial", 11, XFontStyle.Regular);
        var smallFont = new XFont("Arial", 9, XFontStyle.Regular);

        double left = 40;
        double width = page.Width - 80;
        double y = 48;

        gfx.DrawString(
            "PickNBook Flight Ticket",
            titleFont,
            XBrushes.DarkBlue,
            new XRect(left, y, width, 30),
            XStringFormats.TopLeft);

        y += 38;

        gfx.DrawRectangle(XPens.Gray, left, y, width, 1);
        y += 16;

        DrawRow(gfx, headerFont, valueFont, left, ref y, "Passenger", request.PassengerName);
        DrawRow(gfx, headerFont, valueFont, left, ref y, "Booking Ref", request.BookingReference);
        DrawRow(gfx, headerFont, valueFont, left, ref y, "Airline", request.Airline);

        if (!string.IsNullOrWhiteSpace(request.Pnr))
        {
            DrawRow(gfx, headerFont, valueFont, left, ref y, "PNR", request.Pnr);
        }

        DrawRow(gfx, headerFont, valueFont, left, ref y,
            "Route",
            $"{request.Origin} -> {request.Destination}");

        DrawRow(gfx, headerFont, valueFont, left, ref y,
            "Departure",
            request.DepartureTime.ToString("dd MMM yyyy, hh:mm tt"));

        DrawRow(gfx, headerFont, valueFont, left, ref y,
            "Arrival",
            request.ArrivalTime.ToString("dd MMM yyyy, hh:mm tt"));

        DrawRow(gfx, headerFont, valueFont, left, ref y,
            "Stops",
            request.StopsCount.ToString());

        if (request.DurationMinutes > 0)
        {
            var hours = request.DurationMinutes / 60;
            var minutes = request.DurationMinutes % 60;

            DrawRow(
                gfx,
                headerFont,
                valueFont,
                left,
                ref y,
                "Duration",
                $"{hours}h {minutes}m");
        }

        if (!string.IsNullOrWhiteSpace(request.SeatNumber))
        {
            DrawRow(gfx, headerFont, valueFont, left, ref y, "Seat", request.SeatNumber);
        }

        if (!string.IsNullOrWhiteSpace(request.Terminal))
        {
            DrawRow(gfx, headerFont, valueFont, left, ref y, "Terminal", request.Terminal);
        }

        DrawRow(
            gfx,
            headerFont,
            valueFont,
            left,
            ref y,
            "Fare",
            $"{request.Price:0.00} {request.Currency}");

        y += 20;

        gfx.DrawRectangle(XPens.Gray, left, y, width, 1);

        y += 14;

        gfx.DrawString(
            "Please carry a valid government ID proof while traveling. This is a system generated ticket.",
            smallFont,
            XBrushes.DarkSlateGray,
            new XRect(left, y, width, 40),
            XStringFormats.TopLeft);

        using var stream = new MemoryStream();
        document.Save(stream, false);
        return stream.ToArray();
    }

    private static void DrawRow(
        XGraphics gfx,
        XFont headerFont,
        XFont valueFont,
        double left,
        ref double y,
        string label,
        string value)
    {
        gfx.DrawString(
            label,
            headerFont,
            XBrushes.Black,
            new XRect(left, y, 170, 18),
            XStringFormats.TopLeft);

        gfx.DrawString(
            value,
            valueFont,
            XBrushes.Black,
            new XRect(left + 175, y, 340, 18),
            XStringFormats.TopLeft);

        y += 21;
    }

    public byte[] GenerateBusTicketPdf(SendBusTicketEmailRequest request)
    {
        using var document = new PdfDocument();
        document.Info.Title = $"Bus Ticket - {request.BookingReference}";

        BuildBusTicketPage(document, request);
        BuildBusTermsPage(document, request);

        using var stream = new MemoryStream();
        document.Save(stream, false);
        return stream.ToArray();
    }

    private static void BuildBusTicketPage(
        PdfDocument document,
        SendBusTicketEmailRequest req)
    {
        var page = document.AddPage();

        page.Width = XUnit.FromPoint(650);

        page.Height = XUnit.FromPoint(
            Math.Max(
                500,
                360 + ((req.Passengers?.Count ?? 1) * 28)));

        using var gfx = XGraphics.FromPdfPage(page);

        var navyBrush = new XSolidBrush(XColor.FromArgb(14, 36, 89));
        var blueBrush = new XSolidBrush(XColor.FromArgb(17, 66, 173));
        var grayBrush = new XSolidBrush(XColor.FromArgb(120, 130, 155));
        var lightGrayPen = new XPen(XColor.FromArgb(210, 218, 235), 0.8);
        var dashedPen = new XPen(XColor.FromArgb(180, 195, 220), 0.8);

        double pageW = page.Width;
        double left = 28;
        double mainW = pageW - 28 - 155;
        double sideX = pageW - 145;

        var fCity = new XFont("Arial", 24, XFontStyle.Bold);
        var fTitle = new XFont("Arial", 13, XFontStyle.Bold);
        var fBold = new XFont("Arial", 10, XFontStyle.Bold);
        var fReg = new XFont("Arial", 10, XFontStyle.Regular);
        var fSmall = new XFont("Arial", 8, XFontStyle.Regular);
        var fSmallB = new XFont("Arial", 8, XFontStyle.Bold);
        var fTiny = new XFont("Arial", 7, XFontStyle.Regular);
        var fTinyB = new XFont("Arial", 7, XFontStyle.Bold);
        var fKicker = new XFont("Arial", 7, XFontStyle.Bold);

        gfx.DrawRectangle(navyBrush, 0, 0, pageW, 56);

        gfx.DrawString(
            $"{req.OperatorName.ToUpperInvariant()} - BUS TICKET",
            fTiny,
            XBrushes.LightGray,
            new XRect(left, 9, mainW - left, 13),
            XStringFormats.TopLeft);

        gfx.DrawString(
            $"{req.BusType} - {req.BookingReference}",
            fTitle,
            XBrushes.White,
            new XRect(left, 23, mainW - left, 22),
            XStringFormats.TopLeft);

        double badgeX = sideX - 4;

        gfx.DrawRectangle(
            new XPen(XBrushes.White, 1.2),
            badgeX,
            16,
            76,
            22);

        gfx.DrawString(
            "BOOKED",
            new XFont("Arial", 9, XFontStyle.Bold),
            XBrushes.White,
            new XRect(badgeX, 16, 76, 22),
            XStringFormats.Center);

        double y = 72;

        gfx.DrawString(
            req.Origin,
            fCity,
            navyBrush,
            new XRect(left, y, 165, 36),
            XStringFormats.TopLeft);

        // Sub-text for Boarding Point (below Origin)
        gfx.DrawString(
            string.IsNullOrWhiteSpace(req.BoardingPoint) ? req.Origin : req.BoardingPoint,
            fTiny,
            grayBrush,
            new XRect(left, y + 28, 165, 12),
            XStringFormats.TopLeft);

        double centerX = left + 170;

        int hrs = req.DurationMinutes / 60;
        int mins = req.DurationMinutes % 60;

        string dur = $"{hrs}h {mins:00}m";

        gfx.DrawString(
            dur,
            fTiny,
            grayBrush,
            new XRect(centerX, y + 2, 80, 13),
            XStringFormats.TopCenter);

        gfx.DrawLine(lightGrayPen, centerX + 4, y + 17, centerX + 76, y + 17);

        gfx.DrawString(
            "›",
            new XFont("Arial", 14, XFontStyle.Regular),
            grayBrush,
            new XRect(centerX + 68, y + 8, 14, 14),
            XStringFormats.TopLeft);

        gfx.DrawString(
            req.IsOvernightArrival ? "OVERNIGHT" : "SAME DAY",
            fTiny,
            grayBrush,
            new XRect(centerX, y + 22, 80, 11),
            XStringFormats.TopCenter);

        gfx.DrawString(
            req.Destination,
            fCity,
            navyBrush,
            new XRect(centerX + 85, y, 165, 36),
            XStringFormats.TopLeft);

        // Sub-text for Arrival Point (below Destination)
        gfx.DrawString(
            string.IsNullOrWhiteSpace(req.ArrivalPoint) ? req.Destination : req.ArrivalPoint,
            fTiny,
            grayBrush,
            new XRect(centerX + 85, y + 28, 165, 12),
            XStringFormats.TopLeft);

        y += 52;

        gfx.DrawLine(lightGrayPen, left, y, mainW, y);
        y += 12;

        // ─────────────────────────────────────────────────────────────
        // 4-COLUMN ROW: DEPARTURE | DATE | ARRIVAL | ARRIVAL DATE
        // ─────────────────────────────────────────────────────────────
        double col1 = left;
        double col2 = left + 115;
        double col3 = left + 250;
        double col4 = left + 365;

        gfx.DrawString("DEPARTURE", fTiny, grayBrush, col1, y);
        gfx.DrawString("DATE", fTiny, grayBrush, col2, y);
        gfx.DrawString("ARRIVAL", fTiny, grayBrush, col3, y);
        gfx.DrawString("ARRIVAL DATE", fTiny, grayBrush, col4, y);

        y += 13;

        gfx.DrawString(
            ToIst(req.DepartureTime).ToString("HH:mm"),
            fBold,
            navyBrush,
            col1,
            y);

        gfx.DrawString(
            ToIst(req.DepartureTime).ToString("ddd, dd MMM, yyyy"),
            fBold,
            navyBrush,
            col2,
            y);

        gfx.DrawString(
            ToIst(req.ArrivalTime).ToString("HH:mm"),
            fBold,
            navyBrush,
            col3,
            y);

        gfx.DrawString(
            ToIst(req.ArrivalTime).ToString("ddd, dd MMM, yyyy"),
            fBold,
            navyBrush,
            col4,
            y);

        y += 32;

        DrawDashedLine(gfx, dashedPen, left, y, mainW);
        y += 12;

        // ─────────────────────────────────────────────────────────────
        // 4-COLUMN ROW: BUS TYPE | BOARDING | ARRIVAL PLACE | TOTAL FARE
        // ─────────────────────────────────────────────────────────────
        gfx.DrawString("BUS TYPE", fTiny, grayBrush, col1, y);
        gfx.DrawString("BOARDING", fTiny, grayBrush, col2, y);
        gfx.DrawString("ARRIVAL PLACE", fTiny, grayBrush, col3, y);
        gfx.DrawString("TOTAL FARE", fTiny, grayBrush, col4, y);

        y += 13;

        gfx.DrawString(
            string.IsNullOrWhiteSpace(req.BusType) ? "–" : req.BusType,
            fBold,
            navyBrush,
            col1,
            y);

        gfx.DrawString(
            string.IsNullOrWhiteSpace(req.BoardingPoint) ? req.Origin : req.BoardingPoint,
            fBold,
            navyBrush,
            col2,
            y);

        gfx.DrawString(
            string.IsNullOrWhiteSpace(req.ArrivalPoint) ? req.Destination : req.ArrivalPoint,
            fBold,
            navyBrush,
            col3,
            y);

        gfx.DrawString(
            $"{req.Currency} {req.Price:0.##}",
            fBold,
            navyBrush,
            col4,
            y);

        y += 28;

        DrawDashedLine(gfx, dashedPen, left, y, mainW);
        y += 14;

        gfx.DrawString("PASSENGERS & SEATS", fTiny, grayBrush, left, y);

        y += 14;

        foreach (var (p, i) in
      (req.Passengers ?? new List<BusPassengerSeatDto>())
      .Select((passenger, index) => (passenger, index)))
        {
            gfx.DrawEllipse(navyBrush, left, y, 16, 16);

            gfx.DrawString(
                (i + 1).ToString(),
                fTinyB,
                XBrushes.White,
                new XRect(left, y, 16, 16),
                XStringFormats.Center);

            gfx.DrawString(
                $"{p.FullName} ({p.Gender})",
                fReg,
                navyBrush,
                new XRect(left + 22, y, mainW - left - 90, 16),
                XStringFormats.TopLeft);

            double seatBadgeX = mainW - 55;

            gfx.DrawRectangle(lightGrayPen, seatBadgeX, y - 1, 52, 17);

            gfx.DrawString(
                p.SeatNumber,
                fSmallB,
                blueBrush,
                new XRect(seatBadgeX, y - 1, 52, 17),
                XStringFormats.Center);

            y += 22;
        }

        if (!(req.Passengers?.Any() ?? false))
        {
            gfx.DrawString(
                $"Seat: {req.SeatNumber}",
                fReg,
                navyBrush,
                new XRect(left, y, mainW - left, 16),
                XStringFormats.TopLeft);

            y += 20;
        }

        for (double dy = 62; dy < 480; dy += 7)
        {
            gfx.DrawLine(
                dashedPen,
                sideX - 12,
                dy,
                sideX - 12,
                Math.Min(dy + 4, 480));
        }

        double sY = 72;
        double sw = 130;

        gfx.DrawString("PNR", fKicker, grayBrush, sideX, sY);

        sY += 13;

        var pnrFont = new XFont("Arial", 9, XFontStyle.Bold);
        var pnrBrush = new XSolidBrush(XColor.FromArgb(17, 66, 173));

        gfx.DrawString(
            req.BookingReference,
            pnrFont,
            pnrBrush,
            new XRect(sideX, sY, sw, 36),
            XStringFormats.TopLeft);

        sY += 38;

        gfx.DrawString(
            "TOTAL FARE",
            fKicker,
            grayBrush,
            sideX,
            sY);

        sY += 13;

        gfx.DrawString(
            $"{req.Currency} {req.Price:0.00}",
            fBold,
            navyBrush,
            sideX,
            sY);

        sY += 22;

        try
        {
            using var qrGenerator = new QRCodeGenerator();

            var qrData = qrGenerator.CreateQrCode(
                req.BookingReference,
                QRCodeGenerator.ECCLevel.Q);

            using var qrCode = new PngByteQRCode(qrData);

            byte[] qrPng = qrCode.GetGraphic(4);

            var xImg = XImage.FromStream(() => new MemoryStream(qrPng));

            double qrSize = 90;

            gfx.DrawImage(xImg, sideX, sY, qrSize, qrSize);

            sY += qrSize + 6;

            gfx.DrawString(
                "Show to conductor",
                fTiny,
                grayBrush,
                new XRect(sideX, sY, sw, 12),
                XStringFormats.TopCenter);
        }
        catch
        {
            gfx.DrawRectangle(lightGrayPen, sideX, sY, 90, 90);

            gfx.DrawString(
                "QR Code",
                fSmall,
                grayBrush,
                new XRect(sideX, sY, 90, 90),
                XStringFormats.Center);
        }

        gfx.DrawLine(lightGrayPen, left, 480, pageW - 20, 480);

        gfx.DrawString(
            "Please carry a valid government ID. Report 30 minutes before departure. This is a system-generated ticket.",
            fTiny,
            grayBrush,
            new XRect(left, 483, pageW - 40, 14),
            XStringFormats.TopLeft);
    }

    private static void BuildBusTermsPage(
        PdfDocument document,
        SendBusTicketEmailRequest req)
    {
       
        var page = document.AddPage();
        page.Width = XUnit.FromPoint(650);
        page.Height = XUnit.FromPoint(500);

        using var gfx = XGraphics.FromPdfPage(page);

        var navyBrush = new XSolidBrush(XColor.FromArgb(14, 36, 89));
        var blueBrush = new XSolidBrush(XColor.FromArgb(17, 66, 173));
        var grayBrush = new XSolidBrush(XColor.FromArgb(100, 115, 140));
        var greenBrush = new XSolidBrush(XColor.FromArgb(22, 130, 72));
        var cardBorderPen = new XPen(XColor.FromArgb(190, 205, 230), 1.0);
        var bgBrush = new XSolidBrush(XColor.FromArgb(246, 249, 255));

        var fH2 = new XFont("Arial", 9, XFontStyle.Bold);
        var fReg = new XFont("Arial", 8, XFontStyle.Regular);
        var fBold = new XFont("Arial", 8, XFontStyle.Bold);
        var fSmall = new XFont("Arial", 7, XFontStyle.Regular);
        var fTiny = new XFont("Arial", 7, XFontStyle.Bold);

        double pageW = page.Width;

        gfx.DrawRectangle(navyBrush, 0, 0, pageW, 40);
        gfx.DrawString(
            "Bus Terms & Conditions",
            new XFont("Arial", 13, XFontStyle.Bold),
            XBrushes.White,
            new XRect(20, 0, pageW - 40, 40),
            XStringFormats.CenterLeft);

        gfx.DrawRectangle(bgBrush, 0, 40, pageW, page.Height - 40);

        double leftCol = 20;
        double leftColW = pageW / 2 - 30;
        double rightCol = pageW / 2 + 10;
        double rightColW = pageW / 2 - 30;
        double y = 55;

        void TermsSection(string title, string[] bullets)
        {
            gfx.DrawString(title, fH2, navyBrush, leftCol, y);
            y += 14;

            foreach (var b in bullets)
            {
                gfx.DrawString("•", fReg, grayBrush, leftCol + 2, y);

                gfx.DrawString(
                    b,
                    fReg,
                    grayBrush,
                    new XRect(leftCol + 12, y, leftColW - 12, 11),
                    XStringFormats.TopLeft);

                y += 12;
            }

            y += 6;
        }

        TermsSection("1. BOARDING & TIMING", new[]
        {
            "Report 30 minutes before departure",
            "Valid photo ID required",
            "No entry after departure time"
        });

        TermsSection("2. LUGGAGE POLICY", new[]
        {
            "Complimentary: 20kg",
            "Excess: INR 100 per kg",
            "No bulky items allowed"
        });

        TermsSection("3. CANCELLATION TERMS", new[]
        {
            "Cancel 12+ hours: 100% refund",
            "Cancel 6–12 hours: 75% refund",
            "Cancel <6 hours: 50% refund"
        });

        double rY = 55;

        bool hasDiscount =
            req.AutoDiscountAmount > 0 ||
            req.CouponDiscountAmount > 0;

        string panelTitle =
            hasDiscount
            ? "DISCOUNTS APPLIED & FARE BREAKDOWN"
            : "FARE BREAKDOWN";

        gfx.DrawString(
            panelTitle,
            fTiny,
            blueBrush,
            new XRect(rightCol, rY, rightColW, 14),
            XStringFormats.TopCenter);

        rY += 18;

        double cardH = hasDiscount ? 175 : 100;

        gfx.DrawRectangle(
            cardBorderPen,
            XBrushes.White,
            rightCol,
            rY,
            rightColW,
            cardH);

        rY += 10;

        void FareRow(
            string label,
            string value,
            XFont font,
            XBrush brush,
            bool isTotal = false)
        {
            if (isTotal)
            {
                gfx.DrawLine(
                    new XPen(XColor.FromArgb(210, 218, 235), 0.6),
                    rightCol + 8,
                    rY - 2,
                    rightCol + rightColW - 8,
                    rY - 2);

                rY += 4;
            }

            gfx.DrawString(
                label,
                font,
                brush,
                new XRect(rightCol + 10, rY, rightColW - 20, 12),
                XStringFormats.TopLeft);

            gfx.DrawString(
                value,
                font,
                brush,
                new XRect(rightCol + 10, rY, rightColW - 20, 12),
                XStringFormats.TopRight);

            rY += 14;
        }

        FareRow(
            "Base Fare",
            $"₹ {(req.NetFare > 0 ? req.NetFare : req.Price):0.00}",
            fReg,
            grayBrush);

        if (hasDiscount)
        {
            decimal totalSavings =
                req.AutoDiscountAmount +
                req.CouponDiscountAmount;

            string promotionTitle =
                string.IsNullOrWhiteSpace(req.AppliedPromotionCode)
                ? "OFFERS APPLIED"
                : $"🎟 {req.AppliedPromotionCode.ToUpperInvariant()}";

            gfx.DrawRectangle(
                new XPen(XColor.FromArgb(22, 130, 72), 0.8),
                new XSolidBrush(XColor.FromArgb(240, 253, 244)),
                rightCol + 10,
                rY,
                rightColW - 20,
                28);

            gfx.DrawString(
                promotionTitle,
                fBold,
                greenBrush,
                new XRect(rightCol + 14, rY + 4, rightColW - 28, 10),
                XStringFormats.TopLeft);

            gfx.DrawString(
                $"YOU SAVED ₹{totalSavings:0}",
                fSmall,
                greenBrush,
                new XRect(rightCol + 14, rY + 15, rightColW - 28, 10),
                XStringFormats.TopLeft);

            rY += 34;

            if (req.AutoDiscountAmount > 0)
            {
                FareRow(
                    "Offer Discount",
                    $"- ₹ {req.AutoDiscountAmount:0.00}",
                    fReg,
                    greenBrush);
            }

            if (req.CouponDiscountAmount > 0)
            {
                FareRow(
                    "Coupon Discount",
                    $"- ₹ {req.CouponDiscountAmount:0.00}",
                    fReg,
                    greenBrush);
            }
        }

        FareRow(
            $"GST ({req.GstPercent:0.##}%)",
            $"+ ₹ {req.GstAmount:0.00}",
            fReg,
            grayBrush);

        FareRow(
            "Convenience Fee",
            $"+ ₹ {req.ConvenienceFee:0.00}",
            fReg,
            grayBrush);

        FareRow(
            "Total Fare",
            $"₹ {req.Price:0.00}",
            new XFont("Arial", 9, XFontStyle.Bold),
            navyBrush,
            isTotal: true);
    }
    

    private static DateTime ToIst(DateTime utc)
    {
        return DateTime.SpecifyKind(
            utc,
            DateTimeKind.Utc).AddHours(5.5);
    }

    private static void DrawDashedLine(
        XGraphics gfx,
        XPen pen,
        double x1,
        double y,
        double x2)
    {
        double dash = 5;
        double gap = 3;
        double x = x1;

        while (x < x2)
        {
            double end = Math.Min(x + dash, x2);
            gfx.DrawLine(pen, x, y, end, y);
            x += dash + gap;
        }
    }
}
