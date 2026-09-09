/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { b2bAdminService } from '../../../services/b2bAdminService';
import '../b2bShared.css';

function AgentBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') || 'All'; // All, Flight, Bus, Hotel, Cancelled, Failed

  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const data = await b2bAdminService.getB2bBookingsList(search);
      const normalized = Array.isArray(data) ? data.map(b => ({
        id: b.bookingId,
        bookingNumber: b.bookingReference,
        type: b.serviceType,
        agentName: b.agentName,
        agentId: '',
        passenger: b.passengerName,
        detail: `PNR: ${b.pnr || '—'} (${b.serviceType})`,
        amount: b.amount,
        date: b.bookedAt ? b.bookedAt.split('T')[0] : '',
        status: b.status
      })) : [];
      setBookings(normalized);
    } catch (e) {
      console.error("Failed to load agent bookings:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [search]);

  const filtered = bookings.filter(b => {
    if (activeTab === 'Flight' && b.type !== 'Flight') return false;
    if (activeTab === 'Bus' && b.type !== 'Bus') return false;
    if (activeTab === 'Hotel' && b.type !== 'Hotel') return false;
    if (activeTab === 'Cancelled' && b.status !== 'Cancelled' && b.status !== 'Failed') return false;
    if (activeTab === 'Failed' && b.status !== 'Failed') return false;
    return true;
  });

  return (
    <div className="b2b-container">
      <div className="b2b-header-row">
        <div>
          <h1 className="b2b-title">Agent Bookings</h1>
          <p className="b2b-subtitle">View and audit flight, bus, and hotel bookings made by agents.</p>
        </div>
      </div>

      <div className="b2b-tabs">
        {['All', 'Flight', 'Bus', 'Hotel', 'Cancelled', 'Failed'].map(tab => (
          <button
            key={tab}
            className={`b2b-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setSearchParams({ type: tab });
            }}
          >
            {tab} Bookings
          </button>
        ))}
      </div>

      <div className="b2b-card">
        <div className="b2b-filter-bar">
          <div className="b2b-search">
            <span className="b2b-search-icon">🔍</span>
            <input 
              type="text" 
              className="b2b-input" 
              placeholder="Search by PNR, Agent, Passenger name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="b2b-table-wrap">
          <table className="b2b-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Type</th>
                <th>Agent Agency</th>
                <th>Passenger</th>
                <th>Details / Route</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
             <tbody>
               {isLoading ? (
                 <tr>
                   <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--b2b-muted)' }}>
                     Loading bookings from backend API...
                   </td>
                 </tr>
               ) : filtered.length > 0 ? (
                 filtered.map(b => (
                   <tr key={b.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--b2b-primary)' }}>{b.bookingNumber}</td>
                    <td>
                      <span className={`b2b-badge ${
                        b.type === 'Flight' ? 'b2b-badge-primary' :
                        b.type === 'Hotel' ? 'b2b-badge-success' : 'b2b-badge-warning'
                      }`}>
                        {b.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{b.agentName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--b2b-muted)' }}>ID: {b.agentId}</div>
                    </td>
                    <td>{b.passenger}</td>
                    <td>{b.detail}</td>
                    <td style={{ fontWeight: '600' }}>₹{b.amount.toLocaleString('en-IN')}</td>
                    <td>{b.date}</td>
                    <td>
                      <span className={`b2b-badge b2b-badge-${
                        b.status === 'Completed' ? 'success' :
                        b.status === 'Cancelled' ? 'warning' : 'danger'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="b2b-btn b2b-btn-secondary"
                        onClick={() => setSelectedBooking(b)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        👁️ View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--b2b-muted)' }}>
                    No bookings found matching selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBooking && (
        <div className="b2b-backdrop" onClick={() => setSelectedBooking(null)}>
          <div className="b2b-modal" onClick={(e) => e.stopPropagation()}>
            <div className="b2b-modal-header">
              <h3 style={{ margin: 0 }}>Booking Details ({selectedBooking.bookingNumber})</h3>
              <button className="b2b-modal-close" onClick={() => setSelectedBooking(null)}>✕</button>
            </div>
            <div className="b2b-modal-body">
              <div className="b2b-detail-grid">
                <div className="b2b-detail-item">
                  <span className="b2b-detail-label">Service Type</span>
                  <span className="b2b-detail-val">{selectedBooking.type}</span>
                </div>
                <div className="b2b-detail-item">
                  <span className="b2b-detail-label">Booking PNR</span>
                  <span className="b2b-detail-val">{selectedBooking.bookingNumber}</span>
                </div>
                <div className="b2b-detail-item b2b-detail-full">
                  <span className="b2b-detail-label">Agency Name</span>
                  <span className="b2b-detail-val">{selectedBooking.agentName} (ID: {selectedBooking.agentId})</span>
                </div>
                <div className="b2b-detail-item b2b-detail-full">
                  <span className="b2b-detail-label">Passenger Name</span>
                  <span className="b2b-detail-val">{selectedBooking.passenger}</span>
                </div>
                <div className="b2b-detail-item b2b-detail-full">
                  <span className="b2b-detail-label">Itinerary Details</span>
                  <span className="b2b-detail-val">{selectedBooking.detail}</span>
                </div>
                <div className="b2b-detail-item">
                  <span className="b2b-detail-label">Gross Amount</span>
                  <span className="b2b-detail-val" style={{ color: 'var(--b2b-primary)', fontSize: '1.1rem' }}>
                    ₹{selectedBooking.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="b2b-detail-item">
                  <span className="b2b-detail-label">Booking Date</span>
                  <span className="b2b-detail-val">{selectedBooking.date}</span>
                </div>
                <div className="b2b-detail-item">
                  <span className="b2b-detail-label">Booking Status</span>
                  <span className="b2b-detail-val">
                    <span className={`b2b-badge b2b-badge-${
                      selectedBooking.status === 'Completed' ? 'success' :
                      selectedBooking.status === 'Cancelled' ? 'warning' : 'danger'
                    }`}>
                      {selectedBooking.status}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="b2b-modal-footer">
              <button type="button" className="b2b-btn b2b-btn-primary" onClick={() => setSelectedBooking(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentBookings;
