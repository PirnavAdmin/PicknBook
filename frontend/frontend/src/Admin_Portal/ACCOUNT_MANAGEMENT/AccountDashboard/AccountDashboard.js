/* eslint-disable */
// Updated AccountDashboard Component - Clean Syntax
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Wallet,
  Building2,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  ChevronRight,
  TrendingUp,
  ChevronDown,
  Plus,
  FileText,
  Scale,
  BarChart3,
  Plane,
  Bus,
  Hotel,
  AlertTriangle,
} from 'lucide-react';

const collectionChartData = [
  { date: '01 Sep', Collection: 145000, Refunds: 12000, NetCollection: 133000 },
  { date: '02 Sep', Collection: 180000, Refunds: 25000, NetCollection: 155000 },
  { date: '03 Sep', Collection: 210000, Refunds: 18000, NetCollection: 192000 },
  { date: '04 Sep', Collection: 245000, Refunds: 42500, NetCollection: 202500 },
  { date: '05 Sep', Collection: 195000, Refunds: 15000, NetCollection: 180000 },
  { date: '06 Sep', Collection: 260000, Refunds: 30000, NetCollection: 230000 },
  { date: '07 Sep', Collection: 290000, Refunds: 35000, NetCollection: 255000 },
  { date: '08 Sep', Collection: 310000, Refunds: 40000, NetCollection: 270000 },
  { date: '09 Sep', Collection: 340000, Refunds: 48000, NetCollection: 292000 },
  { date: '10 Sep', Collection: 310620, Refunds: 49700, NetCollection: 260920 },
];

const paymentMethodData = [
  { name: 'UPI', value: 1118529, percentage: '45%', color: '#A51C49' },
  { name: 'Credit Card', value: 621405, percentage: '25%', color: '#e11d48' },
  { name: 'Net Banking', value: 372843, percentage: '15%', color: '#f59e0b' },
  { name: 'Wallet', value: 248562, percentage: '10%', color: '#8b5cf6' },
  { name: 'Other', value: 124281, percentage: '5%', color: '#06b6d4' },
];

const reconciliationPieData = [
  { name: 'Matched', value: 1820, color: '#10b981' },
  { name: 'Unmatched', value: 24, color: '#f97316' },
  { name: 'Exception', value: 7, color: '#ef4444' },
  { name: 'Pending', value: 17, color: '#eab308' },
];

const recentAdjustments = [
  { id: 'ADJ-1201', date: '08 Sep 2026', type: 'Credit', amount: '₹ 25,000', reason: 'Correction', status: 'Approved', statusColor: '#10b981' },
  { id: 'ADJ-1202', date: '07 Sep 2026', type: 'Debit', amount: '₹ 8,500', reason: 'Gateway Fee', status: 'Pending', statusColor: '#f59e0b' },
  { id: 'ADJ-1203', date: '06 Sep 2026', type: 'Credit', amount: '₹ 12,000', reason: 'Refund Adj', status: 'Approved', statusColor: '#10b981' },
  { id: 'ADJ-1204', date: '05 Sep 2026', type: 'Debit', amount: '₹ 15,000', reason: 'User Request', status: 'Rejected', statusColor: '#ef4444' },
];

const recentTransactions = [
  { id: 'TXN-10892', ref: 'BOOK-77821', type: 'Payment', module: 'Flight', amount: '₹ 12,500', status: 'Success', statusColor: '#10b981' },
  { id: 'TXN-10893', ref: 'BOOK-77822', type: 'Payment', module: 'Hotel', amount: '₹ 18,200', status: 'Success', statusColor: '#10b981' },
  { id: 'TXN-10894', ref: 'BOOK-77819', type: 'Refund', module: 'Bus', amount: '₹ 3,500', status: 'Refunded', statusColor: '#ef4444' },
  { id: 'TXN-10895', ref: 'BOOK-77818', type: 'Payment', module: 'Flight', amount: '₹ 9,200', status: 'Success', statusColor: '#10b981' },
  { id: 'TXN-10896', ref: 'BOOK-77817', type: 'Payment', module: 'Hotel', amount: '₹ 14,800', status: 'Pending', statusColor: '#f59e0b' },
];

export default function AccountDashboard() {
  const navigate = useNavigate();
  const [bookingFilter, setBookingFilter] = useState('All Booking Types');
  const [gatewayFilter, setGatewayFilter] = useState('All Gateways');
  const [methodFilter, setMethodFilter] = useState('All Payment Methods');
  const [timeframe, setTimeframe] = useState('Daily');

  return (
    <div style={{
      padding: '20px 24px',
      background: '#f8fafc',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#1e293b'
    }}>
      
      {/* Top Header & Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
          Account Management <span style={{ color: '#cbd5e1' }}>/</span> <span style={{ color: '#A51C49', fontWeight: 600 }}>Account Dashboard</span>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Account Dashboard
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 400 }}>
              Monitor your overall account liquidity, collections, settlements and reconciliation status.
            </p>
          </div>

          {/* Controls & Action Buttons in One Single Line */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            width: '100%',
            paddingBottom: '4px'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flex: '0 0 auto',
              height: '34px',
              boxSizing: 'border-box'
            }}>
              <span>📅 01 Sep 2026 - 10 Sep 2026</span>
              <ChevronDown size={14} color="#64748b" />
            </div>

            <select
              value={bookingFilter}
              onChange={(e) => setBookingFilter(e.target.value)}
              style={{
                width: 'auto',
                flex: '0 0 auto',
                padding: '6px 10px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                height: '34px',
                boxSizing: 'border-box'
              }}
            >
              <option value="All Booking Types">All Booking Types</option>
              <option value="Flight">Flight</option>
              <option value="Bus">Bus</option>
              <option value="Hotel">Hotel</option>
            </select>

            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              style={{
                width: 'auto',
                flex: '0 0 auto',
                padding: '6px 10px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                height: '34px',
                boxSizing: 'border-box'
              }}
            >
              <option value="All Gateways">All Gateways</option>
              <option value="Cashfree">Cashfree</option>
              <option value="Razorpay">Razorpay</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{
                width: 'auto',
                flex: '0 0 auto',
                padding: '6px 10px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                height: '34px',
                boxSizing: 'border-box'
              }}
            >
              <option value="All Payment Methods">All Payment Methods</option>
              <option value="UPI">UPI</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Net Banking">Net Banking</option>
            </select>

            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#A51C49',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flex: '0 0 auto',
                height: '34px',
                boxSizing: 'border-box'
              }}
            >
              <RefreshCw size={13} />
              Refresh
            </button>

            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                background: '#A51C49',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(165, 28, 73, 0.2)',
                whiteSpace: 'nowrap',
                flex: '0 0 auto',
                height: '34px',
                boxSizing: 'border-box'
              }}
            >
              <Download size={13} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#fff1f2',
        border: '1px solid #fecdd3',
        borderRadius: '8px',
        marginBottom: '16px',
        color: '#9f1239'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 500 }}>
          <AlertTriangle size={15} color="#e11d48" />
          <span>7 transactions are unmatched in reconciliation.</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/account-management/reconciliation')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#A51C49',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}
        >
          Resolve Now <ChevronRight size={13} />
        </button>
      </div>

      {/* 6 KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {/* Card 1: Total Collection */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fce7f3', display: 'grid', placeItems: 'center', color: '#A51C49' }}>
              <Wallet size={18} />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Total Collection</span>
              <h3 style={{ margin: '1px 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>₹ 24,85,620</h3>
              <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 500, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <TrendingUp size={11} /> 12.4% <span style={{ color: '#94a3b8', fontWeight: 400 }}>· 2,925 Transactions</span>
              </div>
            </div>
          </div>
          <ChevronRight size={15} color="#cbd5e1" />
        </div>

        {/* Card 2: Available Balance */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f3e8ff', display: 'grid', placeItems: 'center', color: '#7c3aed' }}>
              <Building2 size={18} />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Available Balance</span>
              <h3 style={{ margin: '1px 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>₹ 18,42,300</h3>
              <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 500, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <TrendingUp size={11} /> 8.2%
              </div>
            </div>
          </div>
          <ChevronRight size={15} color="#cbd5e1" />
        </div>

        {/* Card 3: Pending Amount */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#ffedd5', display: 'grid', placeItems: 'center', color: '#ea580c' }}>
              <Clock size={18} />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Pending Amount</span>
              <h3 style={{ margin: '1px 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>₹ 2,35,400</h3>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>
                24 Transactions
              </div>
            </div>
          </div>
          <ChevronRight size={15} color="#cbd5e1" />
        </div>

        {/* Card 4: Total Refunds */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#ffe4e6', display: 'grid', placeItems: 'center', color: '#e11d48' }}>
              <RotateCcw size={18} />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Total Refunds</span>
              <h3 style={{ margin: '1px 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>₹ 3,15,200</h3>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>
                85 Transactions
              </div>
            </div>
          </div>
          <ChevronRight size={15} color="#cbd5e1" />
        </div>

        {/* Card 5: Gateway Settlement */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fce7f3', display: 'grid', placeItems: 'center', color: '#A51C49' }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Gateway Settlement</span>
              <h3 style={{ margin: '1px 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>₹ 20,80,400</h3>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>
                18 Settlements
              </div>
            </div>
          </div>
          <ChevronRight size={15} color="#cbd5e1" />
        </div>

        {/* Card 6: Reconciliation */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#ccfbf1', display: 'grid', placeItems: 'center', color: '#0d9488' }}>
              <AlertCircle size={18} />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Reconciliation</span>
              <h3 style={{ margin: '1px 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>₹ 1,25,600</h3>
              <div style={{ fontSize: '10px', color: '#e11d48', fontWeight: 500, marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                📍 7 Pending
              </div>
            </div>
          </div>
          <ChevronRight size={15} color="#cbd5e1" />
        </div>
      </div>

      {/* Collection Overview Chart Box */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', marginBottom: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Collection Overview</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', fontWeight: 500 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#e11d48' }}></span> Collection
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f43f5e' }}></span> Refunds
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#A51C49' }}></span> Net Collection
              </span>
            </div>

            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              style={{
                padding: '3px 8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#334155',
                outline: 'none'
              }}
            >
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
        </div>

        <div style={{ width: '100%', height: '240px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={collectionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCollection" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A51C49" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#A51C49" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(val) => `₹ ${(val / 100000).toFixed(1)} L`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', borderRadius: '6px', color: '#ffffff', fontSize: '11px', border: 'none' }}
                formatter={(val) => [`₹ ${val.toLocaleString()}`, '']}
              />
              <Area type="monotone" dataKey="Collection" stroke="#A51C49" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCollection)" dot={{ r: 3, fill: '#A51C49' }} />
              <Area type="monotone" dataKey="NetCollection" stroke="#e11d48" strokeWidth={1.8} fillOpacity={0} dot={{ r: 2.5, fill: '#e11d48' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2-Column Section: Booking Revenue & Payment Method Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px', marginBottom: '20px' }}>
        
        {/* Booking Revenue Table Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Booking Revenue</h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#fff1f2', color: '#9f1239', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px', fontWeight: 500 }}>Module</th>
                <th style={{ padding: '8px 10px', fontWeight: 500, textAlign: 'center' }}>Transactions</th>
                <th style={{ padding: '8px 10px', fontWeight: 500, textAlign: 'right' }}>Collection</th>
                <th style={{ padding: '8px 10px', fontWeight: 500, textAlign: 'right' }}>Refund</th>
                <th style={{ padding: '8px 10px', fontWeight: 500, textAlign: 'right' }}>Net Collection</th>
                <th style={{ padding: '8px 10px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}></th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plane size={14} color="#e11d48" /> Flight
                </td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>1,545</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 500 }}>₹ 13,35,000</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#e11d48' }}>₹ 1,20,000</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>₹ 12,15,000</td>
                <td style={{ padding: '10px', textAlign: 'right' }}><ChevronRight size={13} color="#A51C49" /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bus size={14} color="#A51C49" /> Bus
                </td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>720</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 500 }}>₹ 4,20,000</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#e11d48' }}>₹ 65,000</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>₹ 3,55,000</td>
                <td style={{ padding: '10px', textAlign: 'right' }}><ChevronRight size={13} color="#A51C49" /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Hotel size={14} color="#7c3aed" /> Hotel
                </td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>660</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 500 }}>₹ 7,30,620</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#e11d48' }}>₹ 1,30,200</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>₹ 6,00,420</td>
                <td style={{ padding: '10px', textAlign: 'right' }}><ChevronRight size={13} color="#A51C49" /></td>
              </tr>
              <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                <td style={{ padding: '10px', color: '#0f172a' }}>Total</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#0f172a' }}>2,925</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#0f172a' }}>₹ 24,85,620</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#e11d48' }}>₹ 3,15,200</td>
                <td style={{ padding: '10px', textAlign: 'right', color: '#A51C49' }}>₹ 21,70,420</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Method Summary Donut Chart Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Payment Method Summary</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '115px', height: '115px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={52}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>₹ 24.8L</span>
                  <span style={{ fontSize: '8px', color: '#64748b' }}>Total</span>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {paymentMethodData.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontWeight: 500 }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color }}></span>
                      {item.name}
                    </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>₹ {item.value.toLocaleString()} <span style={{ fontWeight: 400, color: '#64748b' }}>({item.percentage})</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/payment-management/payment-transactions')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A51C49',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '3px',
              marginTop: '12px'
            }}
          >
            View Payment Transactions <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Gateway Settlement Section */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Gateway Settlement</h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#fff1f2', color: '#9f1239', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px', fontWeight: 500 }}>Gateway</th>
              <th style={{ padding: '8px 10px', fontWeight: 500, textAlign: 'right' }}>Expected Amount</th>
              <th style={{ padding: '8px 10px', fontWeight: 500, textAlign: 'right' }}>Settled Amount</th>
              <th style={{ padding: '8px 10px', fontWeight: 500, textAlign: 'right' }}>Pending Amount</th>
              <th style={{ padding: '8px 10px', fontWeight: 500, textAlign: 'center' }}>Last Settlement</th>
              <th style={{ padding: '8px 10px', fontWeight: 500, textAlign: 'center' }}>Status</th>
              <th style={{ padding: '8px 10px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '9px', fontWeight: 700 }}>C</span> Cashfree
              </td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 500 }}>₹ 20,50,400</td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 500, color: '#16a34a' }}>₹ 19,18,800</td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: '#e11d48' }}>₹ 1,31,600</td>
              <td style={{ padding: '10px', textAlign: 'center', color: '#64748b' }}>08 Sep 2026</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>
                <span style={{ padding: '2px 8px', background: '#fef3c7', color: '#d97706', borderRadius: '10px', fontWeight: 600, fontSize: '10px' }}>
                  Pending
                </span>
              </td>
              <td style={{ padding: '10px', textAlign: 'center' }}>
                <button type="button" style={{ padding: '3px 10px', background: '#fff1f2', border: '1px solid #fbcfe8', color: '#A51C49', borderRadius: '5px', fontSize: '10px', fontWeight: 500, cursor: 'pointer' }}>View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3-Column Section: Account Balance, Reconciliation Status, Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        
        {/* Account Balance Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Account Balance</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Opening Balance</span>
                <span style={{ fontWeight: 500, color: '#0f172a' }}>₹ 11,52,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>+ Collections</span>
                <span style={{ fontWeight: 500 }}>₹ 24,85,620</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>+ Account Credits</span>
                <span style={{ fontWeight: 500 }}>₹ 1,25,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e11d48' }}>
                <span>- Refunds</span>
                <span style={{ fontWeight: 500 }}>₹ 4,15,160</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e11d48' }}>
                <span>- Account Debits</span>
                <span style={{ fontWeight: 500 }}>₹ 3,10,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e11d48' }}>
                <span>- Gateway Fees</span>
                <span style={{ fontWeight: 500 }}>₹ 1,15,480</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#fff1f2', borderRadius: '6px', marginTop: '4px', fontWeight: 700, color: '#A51C49', fontSize: '12px' }}>
                <span>Closing Balance</span>
                <span>₹ 29,21,980</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/account-management/balance-sheet')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A51C49',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              marginTop: '12px'
            }}
          >
            View Balance Sheet
          </button>
        </div>

        {/* Reconciliation Status Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Reconciliation Status</h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '100px', height: '100px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reconciliationPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={45}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {reconciliationPieData.map((entry, index) => (
                        <Cell key={`reconcil-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>1,868</span>
                  <span style={{ fontSize: '8px', color: '#64748b' }}>Total</span>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }}></span> Matched</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>1,820</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f97316' }}></span> Unmatched</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>24</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444' }}></span> Exception</span>
                  <span style={{ fontWeight: 600, color: '#ef4444' }}>7</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#eab308' }}></span> Pending</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>17</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/account-management/reconciliation')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A51C49',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              marginTop: '12px'
            }}
          >
            View Reconciliation <ChevronRight size={13} />
          </button>
        </div>

        {/* Quick Actions Card */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Quick Actions</h3>

          <button
            type="button"
            onClick={() => navigate('/admin/account-management/account-adjustment')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              background: '#A51C49',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(165, 28, 73, 0.2)'
            }}
          >
            <Plus size={14} /> Account Adjustment
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/account-management/transaction-log')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              background: '#ffffff',
              color: '#A51C49',
              border: '1px solid #fbcfe8',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <FileText size={14} /> View Transactions
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/account-management/reconciliation')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              background: '#ffffff',
              color: '#A51C49',
              border: '1px solid #fbcfe8',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Scale size={14} /> Reconcile
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/account-management/balance-sheet')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              background: '#ffffff',
              color: '#A51C49',
              border: '1px solid #fbcfe8',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <BarChart3 size={14} /> View Balance Sheet
          </button>

          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Bottom Row: Recent Account Adjustments & Recent Transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        
        {/* Recent Account Adjustments Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Recent Account Adjustments</h3>
            <button
              type="button"
              onClick={() => navigate('/admin/account-management/account-adjustment')}
              style={{ background: 'transparent', border: 'none', color: '#A51C49', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              View All Adjustments <ChevronRight size={13} />
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ background: '#fff1f2', color: '#9f1239', textAlign: 'left' }}>
                <th style={{ padding: '7px 8px', fontWeight: 500 }}>ID</th>
                <th style={{ padding: '7px 8px', fontWeight: 500 }}>Date</th>
                <th style={{ padding: '7px 8px', fontWeight: 500 }}>Type</th>
                <th style={{ padding: '7px 8px', fontWeight: 500, textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '7px 8px', fontWeight: 500 }}>Reason</th>
                <th style={{ padding: '7px 8px', fontWeight: 500, textAlign: 'center' }}>Status</th>
                <th style={{ padding: '7px 8px', fontWeight: 500, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentAdjustments.map((adj) => (
                <tr key={adj.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>{adj.id}</td>
                  <td style={{ padding: '8px', color: '#64748b' }}>{adj.date}</td>
                  <td style={{ padding: '8px', fontWeight: 500, color: adj.type === 'Credit' ? '#16a34a' : '#e11d48' }}>{adj.type}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{adj.amount}</td>
                  <td style={{ padding: '8px', color: '#475569' }}>{adj.reason}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '8px', background: `${adj.statusColor}15`, color: adj.statusColor, fontWeight: 600, fontSize: '9px' }}>
                      {adj.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button type="button" style={{ padding: '2px 6px', background: '#fff1f2', border: '1px solid #fbcfe8', color: '#A51C49', borderRadius: '4px', fontSize: '9px', fontWeight: 500, cursor: 'pointer' }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Transactions Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Recent Transactions</h3>
            <button
              type="button"
              onClick={() => navigate('/admin/account-management/transaction-log')}
              style={{ background: 'transparent', border: 'none', color: '#A51C49', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              View All <ChevronRight size={13} />
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ background: '#fff1f2', color: '#9f1239', textAlign: 'left' }}>
                <th style={{ padding: '7px 8px', fontWeight: 500 }}>Transaction ID</th>
                <th style={{ padding: '7px 8px', fontWeight: 500 }}>Reference</th>
                <th style={{ padding: '7px 8px', fontWeight: 500 }}>Type</th>
                <th style={{ padding: '7px 8px', fontWeight: 500 }}>Module</th>
                <th style={{ padding: '7px 8px', fontWeight: 500, textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '7px 8px', fontWeight: 500, textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>{tx.id}</td>
                  <td style={{ padding: '8px', color: '#64748b' }}>{tx.ref}</td>
                  <td style={{ padding: '8px', color: '#475569' }}>{tx.type}</td>
                  <td style={{ padding: '8px', fontWeight: 500, color: '#0f172a' }}>{tx.module}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{tx.amount}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '8px', background: `${tx.statusColor}15`, color: tx.statusColor, fontWeight: 700, fontSize: '9px' }}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8' }}>
        <span>© 2026 PickNBook. All rights reserved.</span>
        <div style={{ display: 'flex', gap: '14px' }}>
          <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
          <span>|</span>
          <span style={{ cursor: 'pointer' }}>Terms of Service</span>
          <span>|</span>
          <span style={{ cursor: 'pointer' }}>Support</span>
        </div>
      </div>

    </div>
  );
}
