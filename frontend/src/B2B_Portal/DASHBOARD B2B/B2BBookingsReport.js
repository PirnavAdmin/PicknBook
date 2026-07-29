/* eslint-disable */
import React, { useState, useEffect } from "react";
import { Search, ClipboardList, Download, RefreshCw, FileText, CheckCircle2, XCircle } from "lucide-react";
import { getBookingsReport } from "../../services/b2bService";
import { toApiUrl } from "../../services/apiClient";
import "../../STYLES/B2BLayout.css";

export default function B2BBookingsReport() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [serviceType, setServiceType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    const params = {};
    if (serviceType) params.serviceType = serviceType;
    if (statusFilter) params.status = statusFilter;
    
    try {
      const data = await getBookingsReport(params);
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading bookings report:", error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [serviceType, statusFilter]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("b2b_token") || "";
      const query = new URLSearchParams();
      if (serviceType) query.set("serviceType", serviceType);
      if (statusFilter) query.set("status", statusFilter);
      query.set("export", "true");

      const response = await fetch(toApiUrl(`/api/agentportal/bookings?${query.toString()}`), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("CSV Export request failed.");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `B2B_Bookings_Report_${new Date().toISOString().replace(/[:.T-]/g, "")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      
      // Fallback CSV Simulation
      try {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Booking ID,Booking Reference,PNR,Service Type,Passenger Name,Amount,Status,Booked At\n";
        bookings.forEach(b => {
          csvContent += `"${b.bookingId}","${b.bookingReference}","${b.pnr}","${b.serviceType}","${b.passengerName}",${b.amount},"${b.status}","${b.bookedAt}"\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const a = document.createElement("a");
        a.href = encodedUri;
        a.download = `B2B_Bookings_Report_${new Date().toISOString().replace(/[:.T-]/g, "")}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        alert("Failed to export booking CSV file.");
      }
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="b2b-dashboard">
      <div className="b2b-dashboard-header">
        <h1>Bookings Report</h1>
        <p>Analyze transaction logs, reservation states, client lists, and download accounting summaries as physical CSVs.</p>
      </div>

      {/* Filter and Action bar */}
      <div className="b2b-panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '16px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
            <div className="form-group-item" style={{ flex: 1, minWidth: '130px' }}>
              <label>Service Type</label>
              <select 
                value={serviceType} 
                onChange={(e) => setServiceType(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--b2b-border)', borderRadius: '8px', background: '#ffffff', color: '#1e293b', outline: 'none' }}
              >
                <option value="">All Services</option>
                <option value="Flight">Flight</option>
                <option value="Bus">Bus</option>
              </select>
            </div>

            <div className="form-group-item" style={{ flex: 1, minWidth: '130px' }}>
              <label>Booking Status</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--b2b-border)', borderRadius: '8px', background: '#ffffff', color: '#1e293b', outline: 'none' }}
              >
                <option value="">All Statuses</option>
                <option value="Booked">Booked</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleExportCSV}
            disabled={exporting || bookings.length === 0}
            className="b2b-btn"
            style={{ padding: '12px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', height: '42px' }}
          >
            {exporting ? <RefreshCw size={16} className="spin" /> : <Download size={16} />}
            {exporting ? "Exporting..." : "Export CSV Report"}
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="b2b-panel">
        <h2 className="b2b-panel-title" style={{ marginBottom: '20px' }}>Agency Bookings</h2>

        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <RefreshCw size={30} className="spin" style={{ color: 'var(--b2b-primary)', marginBottom: '10px' }} />
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--b2b-text-secondary)' }}>Loading booking details...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--b2b-text-secondary)' }}>
            <ClipboardList size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>No reservation records match selected filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--b2b-border)', paddingBottom: '12px', color: 'var(--b2b-text-secondary)' }}>
                  <th style={{ padding: '12px 8px' }}>Booking Ref</th>
                  <th style={{ padding: '12px 8px' }}>Date</th>
                  <th style={{ padding: '12px 8px' }}>Service</th>
                  <th style={{ padding: '12px 8px' }}>PNR</th>
                  <th style={{ padding: '12px 8px' }}>Primary Passenger</th>
                  <th style={{ padding: '12px 8px' }}>Net Amount</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.bookingId} style={{ borderBottom: '1px solid var(--b2b-border)' }}>
                    <td style={{ padding: '16px 8px', fontWeight: 'bold' }}>{b.bookingReference}</td>
                    <td style={{ padding: '16px 8px', whiteSpace: 'nowrap' }}>{formatDate(b.bookedAt)}</td>
                    <td style={{ padding: '16px 8px' }}>{b.serviceType}</td>
                    <td style={{ padding: '16px 8px', fontFamily: 'monospace' }}>{b.pnr}</td>
                    <td style={{ padding: '16px 8px' }}>{b.passengerName}</td>
                    <td style={{ padding: '16px 8px', fontWeight: 'bold' }}>₹{b.amount.toFixed(2)}</td>
                    <td style={{ padding: '16px 8px' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        padding: '4px 8px', 
                        borderRadius: '20px', 
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        background: b.status === "Booked" ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        color: b.status === "Booked" ? '#10b981' : '#ef4444'
                      }}>
                        {b.status === "Booked" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {b.status}
                      </span>
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
