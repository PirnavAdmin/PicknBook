import React, { useState, useEffect } from "react";
import { Search, Printer, RefreshCw, ClipboardList, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getBookingsReport } from "../../services/b2bService";
import "../../STYLES/B2BLayout.css";

export default function B2BPrintTicket() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // getBookingsReport automatically returns bookings for the logged-in agent only
      const data = await getBookingsReport();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load agent bookings for printing:", err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Filter bookings based on user search query (by reference, passenger, or PNR)
  const filteredBookings = bookings.filter((b) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (b.bookingReference || "").toLowerCase().includes(query) ||
      (b.pnr || "").toLowerCase().includes(query) ||
      (b.passengerName || "").toLowerCase().includes(query) ||
      (b.serviceType || "").toLowerCase().includes(query)
    );
  });

  const handlePrint = (booking) => {
    // Navigate to B2C print-ticket page with standard state format
    navigate("/print-ticket", {
      state: {
        pnr: booking.pnr || booking.bookingReference,
        mobile: booking.passengerMobile || "",
        email: booking.passengerEmail || "",
        bookingType: (booking.serviceType || "bus").toLowerCase() === "flight" ? "flight" : "bus",
        ticket: booking,
        tickets: [booking]
      }
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="b2b-dashboard">
      <div className="b2b-dashboard-header">
        <h1>Print Travel Tickets</h1>
        <p>Retrieve, review, and print physical GDS tickets for bookings completed by your agency.</p>
      </div>

      {/* Search Filter Panel */}
      <div className="b2b-panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--b2b-text-secondary)" }}>
              <Search size={18} />
            </span>
            <input
              type="text"
              className="b2b-input"
              style={{ paddingLeft: "42px", width: "100%" }}
              placeholder="Search by Passenger Name, Booking Reference, or PNR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={fetchTickets}
            className="b2b-btn"
            style={{ display: "flex", alignItems: "center", gap: "6px", height: "42px", padding: "0 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", cursor: "pointer", borderRadius: "8px" }}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Bookings Ticket Table */}
      <div className="b2b-panel">
        <h2 className="b2b-panel-title">Completed Agent Bookings</h2>

        {loading ? (
          <div style={{ padding: "80px", textAlign: "center" }}>
            <RefreshCw size={30} className="spin" style={{ color: "var(--b2b-primary)", marginBottom: "10px" }} />
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--b2b-text-secondary)" }}>Loading tickets...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--b2b-text-secondary)" }}>
            <ClipboardList size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <p style={{ margin: 0, fontSize: "0.9rem" }}>No tickets found matching your query.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--b2b-border)", color: "var(--b2b-text-secondary)" }}>
                  <th style={{ padding: "12px 8px" }}>Booking Ref</th>
                  <th style={{ padding: "12px 8px" }}>PNR</th>
                  <th style={{ padding: "12px 8px" }}>Service</th>
                  <th style={{ padding: "12px 8px" }}>Passenger Name</th>
                  <th style={{ padding: "12px 8px" }}>Booking Date</th>
                  <th style={{ padding: "12px 8px", textAlign: "right" }}>Net Amount</th>
                  <th style={{ padding: "12px 8px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.bookingId || b.id} style={{ borderBottom: "1px solid var(--b2b-border)" }}>
                    <td style={{ padding: "16px 8px", fontWeight: "bold" }}>{b.bookingReference || "—"}</td>
                    <td style={{ padding: "16px 8px", fontFamily: "monospace", fontWeight: "600" }}>{b.pnr || "—"}</td>
                    <td style={{ padding: "16px 8px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: "700",
                        background: (b.serviceType || "").toLowerCase() === "flight" ? "rgba(59,130,246,0.12)" : "rgba(16,185,129,0.12)",
                        color: (b.serviceType || "").toLowerCase() === "flight" ? "#3b82f6" : "#10b981"
                      }}>
                        {b.serviceType || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 8px" }}>{b.passengerName || "—"}</td>
                    <td style={{ padding: "16px 8px" }}>{formatDate(b.bookedAt)}</td>
                    <td style={{ padding: "16px 8px", textAlign: "right", fontWeight: "bold" }}>₹{Number(b.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: "16px 8px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => handlePrint(b)}
                        className="b2b-btn"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          padding: "6px 12px", background: "var(--b2b-primary, #2563eb)",
                          color: "#fff", border: "none", borderRadius: "6px",
                          fontSize: "0.8rem", cursor: "pointer", fontWeight: "600"
                        }}
                      >
                        <Printer size={13} />
                        <span>Print Ticket</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
