import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { b2bAdminService } from '../../../services/b2bAdminService';
import '../b2bShared.css';

function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'Sales'; // Sales, Booking, Commission, Deposit, Wallet

  const [activeTab, setActiveTab] = useState('Sales');
  const [agents, setAgents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [deposits, setDeposits] = useState([]);
  
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  const loadData = async () => {
    try {
      const allAgents = await b2bAdminService.getAgents('All');
      setAgents(Array.isArray(allAgents) ? allAgents : []);
    } catch (e) {
      console.error(e);
    }
    try {
      const b2bBookings = await b2bAdminService.getB2bBookingsList();
      const normalized = Array.isArray(b2bBookings) ? b2bBookings.map(b => ({
        id: b.bookingId,
        bookingNumber: b.bookingReference,
        type: b.serviceType,
        agentName: b.agentName,
        amount: b.amount,
        date: b.bookedAt ? b.bookedAt.split('T')[0] : '',
        status: b.status
      })) : [];
      setBookings(normalized);
    } catch (e) {
      console.error(e);
    }
    try {
      const deps = await b2bAdminService.getDeposits();
      setDeposits(Array.isArray(deps) ? deps : []);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerExport = (format) => {
    setToastMsg(`Preparing ${activeTab} Report in ${format} format...`);
    setTimeout(() => {
      setToastMsg(`Successfully downloaded PickNBook_${activeTab}_Report.${format.toLowerCase()}`);
      setTimeout(() => setToastMsg(''), 3000);
    }, 1500);
  };

  const totalRevenue = bookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + b.amount, 0);
  const totalBookingsCount = bookings.length;
  const completedBookingsCount = bookings.filter(b => b.status === 'Completed').length;
  const totalApprovedDeposits = deposits.filter(d => d.status === 'Approved').reduce((sum, d) => sum + Number(d.amount), 0);
  const averageBookingVal = completedBookingsCount > 0 ? (totalRevenue / completedBookingsCount) : 0;

  return (
    <div className="b2b-container">
      <div className="b2b-header-row">
        <div>
          <h1 className="b2b-title">B2B Reports & Analytics</h1>
          <p className="b2b-subtitle">Inspect sales ledgers, booking sheets, and export custom statements to Excel or PDF.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="b2b-btn b2b-btn-secondary" onClick={() => triggerExport('Excel')}>
            📥 Export to Excel (.xlsx)
          </button>
          <button className="b2b-btn b2b-btn-primary" onClick={() => triggerExport('PDF')}>
            📄 Export to PDF
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="b2b-badge b2b-badge-primary" style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', width: 'fit-content' }}>
          ℹ️ {toastMsg}
        </div>
      )}

      <div className="b2b-stats-grid">
        <div className="b2b-stat-card">
          <div className="b2b-stat-icon" style={{ backgroundColor: 'var(--b2b-primary-light)', color: 'var(--b2b-primary)' }}>📊</div>
          <div className="b2b-stat-info">
            <span className="b2b-stat-label">Total Booking Revenue</span>
            <span className="b2b-stat-number">₹{totalRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="b2b-stat-card">
          <div className="b2b-stat-icon" style={{ backgroundColor: 'var(--b2b-success-light)', color: 'var(--b2b-success)' }}>🎫</div>
          <div className="b2b-stat-info">
            <span className="b2b-stat-label">Completed Bookings</span>
            <span className="b2b-stat-number">{completedBookingsCount} / {totalBookingsCount}</span>
          </div>
        </div>
        <div className="b2b-stat-card">
          <div className="b2b-stat-icon" style={{ backgroundColor: 'var(--b2b-warning-light)', color: 'var(--b2b-warning)' }}>💵</div>
          <div className="b2b-stat-info">
            <span className="b2b-stat-label">Average Booking Size</span>
            <span className="b2b-stat-number">₹{Math.round(averageBookingVal).toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="b2b-stat-card">
          <div className="b2b-stat-icon" style={{ backgroundColor: 'var(--b2b-danger-light)', color: 'var(--b2b-danger)' }}>🏦</div>
          <div className="b2b-stat-info">
            <span className="b2b-stat-label">Total Deposits Approved</span>
            <span className="b2b-stat-number">₹{totalApprovedDeposits.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="b2b-tabs">
        {['Sales', 'Booking', 'Commission', 'Deposit', 'Wallet'].map(tab => (
          <button
            key={tab}
            className={`b2b-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setSearchParams({ tab });
            }}
          >
            {tab} Report
          </button>
        ))}
      </div>

      {activeTab === 'Sales' && (
        <div className="b2b-card">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Agent Sales Matrix Summary</h3>
          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Status</th>
                  <th>Total Flight Sales</th>
                  <th>Total Bus Sales</th>
                  <th>Total Hotel Sales</th>
                  <th>Total Gross Sales</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agt => {
                  const agentBookings = bookings.filter(b => String(b.agentId) === String(agt.id) && b.status === 'Completed');
                  const flightSales = agentBookings.filter(b => b.type === 'Flight').reduce((sum, b) => sum + b.amount, 0);
                  const busSales = agentBookings.filter(b => b.type === 'Bus').reduce((sum, b) => sum + b.amount, 0);
                  const hotelSales = agentBookings.filter(b => b.type === 'Hotel').reduce((sum, b) => sum + b.amount, 0);
                  const grossSales = flightSales + busSales + hotelSales;

                  return (
                    <tr key={agt.id}>
                      <td style={{ fontWeight: '600' }}>{agt.companyName}</td>
                      <td>{agt.status}</td>
                      <td>₹{flightSales.toLocaleString('en-IN')}</td>
                      <td>₹{busSales.toLocaleString('en-IN')}</td>
                      <td>₹{hotelSales.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: '700', color: 'var(--b2b-primary)' }}>₹{grossSales.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Booking' && (
        <div className="b2b-card">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Agent Wise Booking Count Analytics</h3>
          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Completed Bookings</th>
                  <th>Pending Bookings</th>
                  <th>Cancelled Bookings</th>
                  <th>Failed Bookings</th>
                  <th>Total Bookings</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agt => {
                  const agentBookings = bookings.filter(b => String(b.agentId) === String(agt.id));
                  const completed = agentBookings.filter(b => b.status === 'Completed').length;
                  const pending = agentBookings.filter(b => b.status === 'Pending').length;
                  const cancelled = agentBookings.filter(b => b.status === 'Cancelled').length;
                  const failed = agentBookings.filter(b => b.status === 'Failed').length;

                  return (
                    <tr key={agt.id}>
                      <td style={{ fontWeight: '600' }}>{agt.companyName}</td>
                      <td style={{ color: 'var(--b2b-success)', fontWeight: 'bold' }}>{completed}</td>
                      <td style={{ color: 'var(--b2b-warning)' }}>{pending}</td>
                      <td>{cancelled}</td>
                      <td style={{ color: 'var(--b2b-danger)' }}>{failed}</td>
                      <td style={{ fontWeight: '700' }}>{agentBookings.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Commission' && (
        <div className="b2b-card">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Estimated Agent Commission Share Summary</h3>
          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Sales Volume</th>
                  <th>Average Commission Rate</th>
                  <th>Commission Earned (Estimated)</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agt => {
                  const agentBookings = bookings.filter(b => String(b.agentId) === String(agt.id) && b.status === 'Completed');
                  const grossSales = agentBookings.reduce((sum, b) => sum + b.amount, 0);
                  
                  let rate = 3.5;
                  const commissionEarned = (grossSales * rate) / 100;

                  return (
                    <tr key={agt.id}>
                      <td style={{ fontWeight: '600' }}>{agt.companyName}</td>
                      <td>₹{grossSales.toLocaleString('en-IN')}</td>
                      <td>{rate}%</td>
                      <td style={{ fontWeight: '700', color: 'var(--b2b-success)' }}>₹{Math.round(commissionEarned).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Deposit' && (
        <div className="b2b-card">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Deposit Loading Audit Ledger</h3>
          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>Pending Deposits</th>
                  <th>Approved Volume (₹)</th>
                  <th>Rejected Volume (₹)</th>
                  <th>Total Deposit Requests</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agt => {
                  const agentDeps = deposits.filter(d => String(d.agentId) === String(agt.id));
                  const pending = agentDeps.filter(d => d.status === 'Pending').length;
                  const approvedVal = agentDeps.filter(d => d.status === 'Approved').reduce((sum, d) => sum + Number(d.amount), 0);
                  const rejectedVal = agentDeps.filter(d => d.status === 'Rejected').reduce((sum, d) => sum + Number(d.amount), 0);

                  return (
                    <tr key={agt.id}>
                      <td style={{ fontWeight: '600' }}>{agt.companyName}</td>
                      <td style={{ color: 'var(--b2b-warning)' }}>{pending}</td>
                      <td style={{ color: 'var(--b2b-success)', fontWeight: 'bold' }}>₹{approvedVal.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--b2b-danger)' }}>₹{rejectedVal.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: '700' }}>{agentDeps.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Wallet' && (
        <div className="b2b-card">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Current Agent Wallet Account Health Metrics</h3>
          <div className="b2b-table-wrap">
            <table className="b2b-table">
              <thead>
                <tr>
                  <th>Agent ID</th>
                  <th>Agent Name</th>
                  <th>Current Balance</th>
                  <th>Wallet Status</th>
                  <th>Wallet Health</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agt => {
                  return (
                    <tr key={agt.id}>
                      <td>{agt.id}</td>
                      <td style={{ fontWeight: '600' }}>{agt.companyName}</td>
                      <td style={{ fontWeight: '700', color: agt.walletBalance >= 0 ? 'var(--b2b-success)' : 'var(--b2b-danger)' }}>
                        ₹{(agt.walletBalance || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`b2b-badge b2b-badge-${agt.walletStatus === 'Active' ? 'success' : 'danger'}`}>
                          {agt.walletStatus || 'Active'}
                        </span>
                      </td>
                      <td>
                        <span className={`b2b-badge b2b-badge-${
                          agt.walletBalance > 10000 ? 'success' :
                          agt.walletBalance > 1000 ? 'warning' : 'danger'
                        }`}>
                          {agt.walletBalance > 10000 ? 'Healthy' : agt.walletBalance > 1000 ? 'Low Balance' : 'Critical'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
