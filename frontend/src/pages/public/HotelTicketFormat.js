/* eslint-disable */
import React from "react";
import { getHotelVisuals } from "../booking/hotelPresentation";
import pickNBookLogo from "../../assets/images/brand/pick-n-book-logo.png";

export default function HotelTicketFormat({
  ticket,
  passengers,
  seats,
  fare,
  isAgent,
  adjustedBaseFare,
  adjustedDiscount,
  totalPaid,
  formatDateTime,
  formatCurrency,
  navigate,
  ticketCardRef,
  handleDownloadPdf,
  isDownloadingPdf,
  handleOpenPrintFormat,
  handleSendNotifications,
  isDispatchingNotifications,
  getNotificationStatus,
}) {
  const visuals = getHotelVisuals(ticket.providerName || "hotel");
  const hotelImage =
    ticket.hotelImage ||
    visuals.cardImage ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80";
  const bannerImage =
    visuals.gallery[1] ||
    visuals.cardImage ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80";

  const getAppliedOffersList = () => {
    const list = [];
    if (Array.isArray(ticket.offersApplied) && ticket.offersApplied.length > 0) {
      return ticket.offersApplied;
    }
    if (ticket.appliedCoupon) {
      const couponName =
        typeof ticket.appliedCoupon === "object"
          ? ticket.appliedCoupon.code || ticket.appliedCoupon.title
          : ticket.appliedCoupon;
      if (couponName) list.push(`${couponName} - Applied`);
    }
    if (ticket.promoCode || ticket.couponCode) {
      const code = ticket.promoCode || ticket.couponCode;
      if (code && !list.some((item) => item.includes(code))) {
        list.push(`${code} - Applied`);
      }
    }
    if (ticket.appliedOffer) {
      const offerTitle =
        typeof ticket.appliedOffer === "object"
          ? ticket.appliedOffer.title || ticket.appliedOffer.code
          : ticket.appliedOffer;
      if (offerTitle && !list.some((item) => item.includes(offerTitle))) {
        list.push(`${offerTitle} - Applied`);
      }
    }
    if (list.length === 0 && (fare?.discount > 0 || adjustedDiscount > 0)) {
      list.push("Special Discount Applied");
    }
    return list;
  };

  const activeOffers = getAppliedOffersList();

  return (
    <main
      className="ticket-confirmation-page"
      style={{ background: "#f8fafc", padding: "40px 20px" }}
    >
      <div
        style={{
          maxWidth: "940px",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
          padding: "36px 40px",
          border: "1px solid #f1f5f9",
        }}
        ref={ticketCardRef}
      >
        {/* Top Brand Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid #f1f5f9",
            paddingBottom: "20px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <img
              src={pickNBookLogo}
              alt="PickNBook"
              style={{ height: "34px", objectFit: "contain" }}
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Hotel Booking Ticket
            </h2>
            <div
              style={{
                width: "45px",
                height: "3px",
                background: "#dc2626",
                margin: "6px auto 0",
                borderRadius: "2px",
              }}
            ></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: "0.74rem",
                color: "#64748b",
                fontWeight: 600,
                display: "block",
              }}
            >
              Booking ID
            </span>
            <strong
              style={{
                fontSize: "1.1rem",
                color: "#dc2626",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                justifyContent: "flex-end",
                marginTop: "2px",
              }}
            >
              #
              {ticket.bookingReference ||
                ticket.confirmationNo ||
                ticket.bookingRefNo ||
                ticket.bookingId ||
                ticket.pnr ||
                "PNB458921"}
              <span
                style={{ fontSize: "0.8rem", cursor: "pointer" }}
                onClick={() =>
                  navigator.clipboard.writeText(
                    ticket.bookingReference ||
                      ticket.confirmationNo ||
                      ticket.bookingRefNo ||
                      ticket.bookingId ||
                      ""
                  )
                }
                title="Copy Code"
              >
                📋
              </span>
            </strong>
            <span
              style={{
                fontSize: "0.68rem",
                color: "#64748b",
                display: "block",
                marginTop: "4px",
              }}
            >
              Booking Date: {formatDateTime(ticket.bookedAt || new Date())}
            </span>
          </div>
        </div>

        {/* Confirmed Banner with Hotel Image */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #f0fdf4 0%, #f0fdf4 100%)",
            borderRadius: "16px",
            padding: "20px 24px",
            display: "grid",
            gridTemplateColumns: "1fr 240px",
            gap: "20px",
            alignItems: "center",
            marginBottom: "24px",
            border: "1px solid #bbf7d0",
          }}
        >
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "1.2rem",
                fontWeight: "bold",
              }}
            >
              ✓
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "#166534",
                }}
              >
                Booking Confirmed!
              </h3>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "0.8rem",
                  color: "#14532d",
                  fontWeight: 500,
                }}
              >
                Your stay is successfully booked. Thank you for choosing
                PickNBook.
              </p>
            </div>
          </div>
          <div style={{ height: "80px", borderRadius: "10px", overflow: "hidden" }}>
            <img
              src={bannerImage}
              alt="Lobby"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>

        {/* Hotel Details Card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 110px",
            gap: "20px",
            alignItems: "center",
            border: "1px solid #e2e8f0",
            padding: "16px",
            borderRadius: "12px",
            marginBottom: "24px",
          }}
        >
          <div style={{ height: "80px", borderRadius: "8px", overflow: "hidden" }}>
            <img
              src={hotelImage}
              alt={ticket.providerName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {ticket.providerName || "Hotel Stay"}
            </h3>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
              📍 {ticket.address || "Rohini, New Delhi, Delhi - 110085"}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.74rem",
                fontWeight: 600,
                color: "#eab308",
              }}
            >
              <span>★ 4.5/5 (1,240 reviews)</span>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
              <span
                style={{
                  fontSize: "0.68rem",
                  background: "#f1f5f9",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  color: "#475569",
                  fontWeight: 500,
                }}
              >
                Free WiFi
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  background: "#f1f5f9",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  color: "#475569",
                  fontWeight: 500,
                }}
              >
                Breakfast Included
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  background: "#f1f5f9",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  color: "#475569",
                  fontWeight: 500,
                }}
              >
                Free Cancellation
              </span>
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${
                ticket.bookingReference || "PNB458921"
              }`}
              alt="QR Code"
              style={{ width: "55px", height: "55px" }}
            />
            <span style={{ fontSize: "0.58rem", color: "#64748b", fontWeight: 600 }}>
              Scan to view details
            </span>
          </div>
        </div>

        {/* Stay Details horizontal grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
            gap: "10px",
            border: "1px solid #e2e8f0",
            background: "#fafafa",
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#475569",
                fontWeight: 700,
                display: "block",
                marginBottom: "2px",
              }}
            >
              Check-in
            </span>
            <strong
              style={{
                fontSize: "0.85rem",
                color: "#0f172a",
                display: "block",
                fontWeight: 700,
              }}
            >
              {ticket.departureTime || ticket.departureDateTime || "14 Aug 2026"}
            </strong>
            <span style={{ fontSize: "0.65rem", color: "#64748b" }}>02:00 PM</span>
          </div>
          <div>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#475569",
                fontWeight: 700,
                display: "block",
                marginBottom: "2px",
              }}
            >
              Check-out
            </span>
            <strong
              style={{
                fontSize: "0.85rem",
                color: "#0f172a",
                display: "block",
                fontWeight: 700,
              }}
            >
              {ticket.arrivalTime || "15 Aug 2026"}
            </strong>
            <span style={{ fontSize: "0.65rem", color: "#64748b" }}>11:00 AM</span>
          </div>
          <div>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#475569",
                fontWeight: 700,
                display: "block",
                marginBottom: "2px",
              }}
            >
              Duration
            </span>
            <strong
              style={{
                fontSize: "0.85rem",
                color: "#0f172a",
                display: "block",
                fontWeight: 700,
              }}
            >
              {ticket.duration || "1 Night"}
            </strong>
          </div>
          <div>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#475569",
                fontWeight: 700,
                display: "block",
                marginBottom: "2px",
              }}
            >
              Rooms
            </span>
            <strong
              style={{
                fontSize: "0.85rem",
                color: "#0f172a",
                display: "block",
                fontWeight: 700,
              }}
            >
              {ticket.noOfRooms || seats.length || 1}{" "}
              {(ticket.noOfRooms || seats.length || 1) > 1 ? "Rooms" : "Room"}
            </strong>
          </div>
          <div>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#475569",
                fontWeight: 700,
                display: "block",
                marginBottom: "2px",
              }}
            >
              Guests
            </span>
            <strong
              style={{
                fontSize: "0.85rem",
                color: "#0f172a",
                display: "block",
                fontWeight: 700,
              }}
            >
              {ticket.guestsSummary ||
                (ticket.totalGuests
                  ? `${ticket.totalGuests} Guests`
                  : `${passengers.length || 1} Guests`)}
            </strong>
          </div>
        </div>

        {/* Four Column Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1.2fr 1.3fr 1.3fr",
            gap: "20px",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "20px",
            marginBottom: "24px",
          }}
        >
          {/* Col 1: Guest Details */}
          <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: "12px" }}>
            <h4
              style={{
                margin: "0 0 10px",
                fontSize: "0.88rem",
                fontWeight: 800,
                color: "#dc2626",
              }}
            >
              👤 Guest Details
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#475569",
                    fontWeight: 700,
                    display: "block",
                  }}
                >
                  Primary Guest
                </span>
                <span style={{ fontSize: "0.8rem", color: "#0f172a", fontWeight: 500 }}>
                  {passengers[0]?.name || passengers[0]?.fullName || "Supriya Yadav"}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#475569",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "2px",
                  }}
                >
                  Guests
                </span>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    fontSize: "0.76rem",
                    color: "#475569",
                  }}
                >
                  {passengers.map((p, idx) => (
                    <li key={idx}>
                      • {p.name || p.fullName} ({p.passengerType || "Adult"})
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#475569",
                    fontWeight: 700,
                    display: "block",
                  }}
                >
                  Special Requests
                </span>
                <span style={{ fontSize: "0.76rem", color: "#475569" }}>
                  {ticket.specialRequests || "Late check-in, High floor room"}
                </span>
              </div>
            </div>
          </div>

          {/* Col 2: Room Details */}
          <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: "12px" }}>
            <h4
              style={{
                margin: "0 0 10px",
                fontSize: "0.88rem",
                fontWeight: 800,
                color: "#dc2626",
              }}
            >
              🛏 Room Details
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#475569",
                    fontWeight: 700,
                    display: "block",
                  }}
                >
                  Room Type
                </span>
                <span style={{ fontSize: "0.8rem", color: "#0f172a", fontWeight: 500 }}>
                  {ticket.roomType || seats[0] || "Standard Room"}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#475569",
                    fontWeight: 700,
                    display: "block",
                  }}
                >
                  Bed Type
                </span>
                <span style={{ fontSize: "0.76rem", color: "#475569" }}>
                  {ticket.bedType || "Twin Bed"}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#475569",
                    fontWeight: 700,
                    display: "block",
                  }}
                >
                  Meal Plan
                </span>
                <span style={{ fontSize: "0.78rem", color: "#0f172a", fontWeight: 500 }}>
                  {ticket.mealPlan || "Breakfast Included"}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#475569",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "2px",
                  }}
                >
                  Amenities
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  <span
                    style={{
                      fontSize: "0.64rem",
                      background: "#f8fafc",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      color: "#475569",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    WiFi
                  </span>
                  <span
                    style={{
                      fontSize: "0.64rem",
                      background: "#f8fafc",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      color: "#475569",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    AC
                  </span>
                  <span
                    style={{
                      fontSize: "0.64rem",
                      background: "#f8fafc",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      color: "#475569",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    TV
                  </span>
                  <span
                    style={{
                      fontSize: "0.64rem",
                      background: "#f8fafc",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      color: "#475569",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    Room Service
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: Payment Details */}
          <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: "12px" }}>
            <h4
              style={{
                margin: "0 0 10px",
                fontSize: "0.88rem",
                fontWeight: 800,
                color: "#dc2626",
              }}
            >
              💳 Payment Details
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                fontSize: "0.78rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#475569", fontWeight: 700 }}>Base Fare</span>
                <strong style={{ fontWeight: 500, color: "#0f172a" }}>
                  {formatCurrency(adjustedBaseFare)}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#475569", fontWeight: 700 }}>Taxes & Fees</span>
                <strong style={{ fontWeight: 500, color: "#0f172a" }}>
                  {formatCurrency(fare.tax || fare.taxes || 0)}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#475569", fontWeight: 700 }}>Convenience Fee</span>
                <strong style={{ fontWeight: 500, color: "#0f172a" }}>
                  {formatCurrency(fare.convenienceFee || 0)}
                </strong>
              </div>
              {adjustedDiscount > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#16a34a",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>Discount</span>
                  <strong>-{formatCurrency(adjustedDiscount)}</strong>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "6px",
                  marginTop: "2px",
                  fontSize: "0.85rem",
                  color: "#dc2626",
                }}
              >
                <span style={{ fontWeight: 800 }}>Total Paid</span>
                <strong style={{ fontWeight: 800 }}>{formatCurrency(totalPaid)}</strong>
              </div>
              <div
                style={{
                  marginTop: "6px",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.7rem",
                    marginBottom: "1px",
                  }}
                >
                  <span style={{ color: "#475569", fontWeight: 700 }}>Method</span>
                  <span style={{ color: "#0f172a", fontWeight: 500 }}>
                    {ticket.paymentMethod || "Net Banking"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.7rem",
                    marginBottom: "2px",
                  }}
                >
                  <span style={{ color: "#475569", fontWeight: 700 }}>Txn ID</span>
                  <span
                    style={{ color: "#0f172a", fontSize: "0.65rem", fontWeight: 500 }}
                  >
                    {ticket.transactionId || "TXN893475892"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.7rem", color: "#475569", fontWeight: 700 }}>
                    Status
                  </span>
                  <span
                    style={{
                      background: "#dcfce7",
                      color: "#166534",
                      padding: "1px 5px",
                      borderRadius: "3px",
                      fontSize: "0.64rem",
                      fontWeight: 700,
                    }}
                  >
                    Paid
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 4: Offers Applied & Confirmation Status */}
          <div>
            <h4
              style={{
                margin: "0 0 10px",
                fontSize: "0.88rem",
                fontWeight: 800,
                color: "#dc2626",
              }}
            >
              🏷️ Offers Applied
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontSize: "0.74rem",
                  color: "#166534",
                }}
              >
                {activeOffers.length > 0 ? (
                  activeOffers.map((item, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 600,
                      }}
                    >
                      🟢 {item}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#64748b", fontSize: "0.72rem" }}>
                    No coupons applied
                  </span>
                )}
              </div>
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px" }}>
                <h4
                  style={{
                    margin: "0 0 6px",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  ☑ Confirmation Status
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    fontSize: "0.74rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#475569", fontWeight: 700 }}>✉ Email</span>
                    <span
                      style={{
                        background:
                          getNotificationStatus(
                            ticket?.notifications?.email ||
                              (ticket?.contact?.email ? "sent" : "skipped")
                          ) === "Sent"
                            ? "#dcfce7"
                            : "#f1f5f9",
                        color:
                          getNotificationStatus(
                            ticket?.notifications?.email ||
                              (ticket?.contact?.email ? "sent" : "skipped")
                          ) === "Sent"
                            ? "#166534"
                            : "#475569",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontSize: "0.64rem",
                        fontWeight: 700,
                      }}
                    >
                      {getNotificationStatus(
                        ticket?.notifications?.email ||
                          (ticket?.contact?.email ? "sent" : "skipped")
                      )}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#475569", fontWeight: 700 }}>📱 SMS</span>
                    <span
                      style={{
                        background:
                          getNotificationStatus(
                            ticket?.notifications?.sms ||
                              (ticket?.contact?.mobile ? "sent" : "skipped")
                          ) === "Sent"
                            ? "#dcfce7"
                            : "#f1f5f9",
                        color:
                          getNotificationStatus(
                            ticket?.notifications?.sms ||
                              (ticket?.contact?.mobile ? "sent" : "skipped")
                          ) === "Sent"
                            ? "#166534"
                            : "#475569",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontSize: "0.64rem",
                        fontWeight: 700,
                      }}
                    >
                      {getNotificationStatus(
                        ticket?.notifications?.sms ||
                          (ticket?.contact?.mobile ? "sent" : "skipped")
                      )}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "#475569", fontWeight: 700 }}>
                      💬 WhatsApp
                    </span>
                    <span
                      style={{
                        background:
                          getNotificationStatus(ticket?.notifications?.whatsapp) ===
                          "Sent"
                            ? "#dcfce7"
                            : "#f1f5f9",
                        color:
                          getNotificationStatus(ticket?.notifications?.whatsapp) ===
                          "Sent"
                            ? "#166534"
                            : "#475569",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontSize: "0.64rem",
                        fontWeight: 700,
                      }}
                    >
                      {getNotificationStatus(ticket?.notifications?.whatsapp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Info bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1.2fr 1.2fr",
            gap: "16px",
            borderTop: "2px dashed #e2e8f0",
            paddingTop: "16px",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.68rem",
                color: "var(--hotel-muted)",
                fontWeight: 500,
                display: "block",
              }}
            >
              Total Amount Paid
            </span>
            <strong
              style={{
                fontSize: "1.25rem",
                color: "var(--hotel-rose)",
                fontWeight: 800,
              }}
            >
              {formatCurrency(totalPaid)}
            </strong>
            <span
              style={{
                fontSize: "0.58rem",
                color: "var(--hotel-muted)",
                display: "block",
              }}
            >
              (All taxes included)
            </span>
          </div>
          <div
            style={{
              borderLeft: "1px solid #f1f5f9",
              borderRight: "1px solid #f1f5f9",
              padding: "0 8px",
            }}
          >
            <strong
              style={{
                fontSize: "0.78rem",
                color: "var(--hotel-ink)",
                display: "block",
                fontWeight: 700,
              }}
            >
              🛡️ Secure Booking
            </strong>
            <span
              style={{
                fontSize: "0.68rem",
                color: "var(--hotel-muted)",
                display: "block",
                marginTop: "1px",
              }}
            >
              100% Secure Payments
            </span>
            <span
              style={{
                fontSize: "0.64rem",
                color: "var(--hotel-muted)",
                display: "block",
              }}
            >
              Best Price Guarantee
            </span>
          </div>
          <div
            onClick={() => navigate("/contact-us")}
            style={{ cursor: "pointer", padding: "4px", borderRadius: "6px" }}
            title="Click to go to Contact Us page"
          >
            <strong
              style={{
                fontSize: "0.78rem",
                color: "var(--hotel-ink)",
                display: "block",
                fontWeight: 700,
              }}
            >
              📞 Need Help?
            </strong>
            <span
              style={{
                fontSize: "0.68rem",
                color: "var(--hotel-muted)",
                display: "block",
                marginTop: "1px",
              }}
            >
              24x7 Customer Support
            </span>
            <strong
              style={{
                fontSize: "0.82rem",
                color: "#dc2626",
                display: "block",
                marginTop: "1px",
              }}
            >
              1800-123-4567
            </strong>
          </div>
        </div>
      </div>

      {/* Outer Control Buttons */}
      <div
        style={{
          maxWidth: "940px",
          margin: "20px auto 0",
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
        }}
      >
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          style={{
            height: "40px",
            padding: "0 22px",
            background: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(220, 38, 38, 0.25)",
          }}
        >
          {isDownloadingPdf ? "Preparing PDF..." : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={handleOpenPrintFormat}
          style={{
            height: "40px",
            padding: "0 20px",
            background: "#fff",
            color: "var(--hotel-ink)",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Print Ticket
        </button>
        <button
          type="button"
          onClick={handleSendNotifications}
          disabled={isDispatchingNotifications}
          style={{
            height: "40px",
            padding: "0 20px",
            background: "#fff",
            color: "var(--hotel-ink)",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isDispatchingNotifications ? "Sharing..." : "Share Booking"}
        </button>
      </div>
    </main>
  );
}
