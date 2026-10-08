/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { BadgeCheck, CalendarClock, IndianRupee } from "lucide-react";
import { getDashboardSummary } from "../../services/dashboardService";
import { getMyHotelBookings } from "../../services/hotelBookingService";
import { getWalletSummary } from "../../services/walletService";

const RECENT_LIMIT = 10;
const TRAVELER_PENDING_DAYS = 7;

const BOOKING_COLORS = {
  Completed: "#1d8f5f",
  Upcoming: "#dc8a14",
  Cancelled: "#d35454",
};

function getColor(statusName) {
  return BOOKING_COLORS[statusName] || "#5f7399";
}

function formatCurrencyCompact(value) {
  const amount = Number(value) || 0;

  if (amount >= 1000000) {
    return `INR ${(amount / 1000000).toFixed(2)}M`;
  }

  if (amount >= 1000) {
    return `INR ${(amount / 1000).toFixed(1)}K`;
  }

  return `INR ${Math.round(amount)}`;
}

function formatPercent(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "0%";
  const fixed = amount.toFixed(2);
  return `${fixed.replace(/\.00$/, "")}%`;
}

function classifyBookingStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized.includes("cancel")) {
    return "cancelled";
  }

  if (
    normalized.includes("complete") ||
    normalized.includes("success") ||
    normalized.includes("confirmed") ||
    normalized.includes("ticketed")
  ) {
    return "completed";
  }

  return "upcoming";
}

function countBookingStatuses(bookings) {
  return (Array.isArray(bookings) ? bookings : []).reduce(
    (accumulator, booking) => {
      accumulator[classifyBookingStatus(booking?.status)] += 1;
      return accumulator;
    },
    { completed: 0, upcoming: 0, cancelled: 0 }
  );
}

function ChartCard({ title, subtitle, data, total: apiTotal, loading }) {
  const total = apiTotal ?? data.reduce((sum, item) => sum + item.value, 0);

  return (
    <article className="chart-card">
      <header className="chart-card-head">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </header>

      <div className="chart-content">
        <div className="chart-visual">
          <ResponsiveContainer width="100%" height={176}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={38}
                outerRadius={56}
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {data.map((item) => (
                  <Cell key={item.name} fill={getColor(item.name)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}`, "Bookings"]}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #d9e2f2",
                  boxShadow: "0 10px 24px rgba(13, 27, 52, 0.14)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="chart-center-copy">
            <strong>{loading ? "..." : total}</strong>
            <span>Total</span>
          </div>
        </div>

        <ul className="chart-legend-list">
          {data.map((item) => (
            <li key={item.name}>
              <span className="legend-left">
                <i style={{ backgroundColor: getColor(item.name) }} />
                {item.name}
              </span>
              <b>{loading ? "..." : item.value}</b>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function formatDashboardDateTime(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0");
  const monthNames = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEPT", "OCT", "NOV", "DEC"
  ];
  const month = monthNames[date.getMonth()];
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? String(hours).padStart(2, "0") : "12";
  return `${day} ${month}, ${hours}:${minutes} ${ampm}`;
}

export default function DashboardPage() {
  const [currentDateTime, setCurrentDateTime] = useState(() => formatDashboardDateTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(formatDashboardDateTime());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const [summary, setSummary] = useState(null);
  const [hotelBookings, setHotelBookings] = useState([]);
  const [walletSummary, setWalletSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function fetchDashboardSummary() {
      setLoadingSummary(true);
      setSummaryError("");

      try {
        const [summaryResult, hotelBookings, walletRes] = await Promise.all([
          getDashboardSummary({
            recentLimit: RECENT_LIMIT,
            travelerPendingDays: TRAVELER_PENDING_DAYS,
          }).then(
            (payload) => ({ ok: true, payload }),
            (error) => ({ ok: false, error })
          ),
          getMyHotelBookings().catch(() => []),
          getWalletSummary().catch(() => null),
        ]);
        if (ignore) {
          return;
        }

        setHotelBookings(Array.isArray(hotelBookings) ? hotelBookings : []);
        setWalletSummary(walletRes);

        if (summaryResult.ok) {
          const payload = summaryResult.payload || {};
          setSummary(payload);
        } else {
          setSummary(null);
          setSummaryError(summaryResult.error?.message || "Unable to load dashboard summary.");
        }

      } finally {
        if (!ignore) {
          setLoadingSummary(false);
        }
      }
    }

    fetchDashboardSummary();
    const intervalId = window.setInterval(() => {
      if (!ignore) {
        setRefreshKey((previous) => previous + 1);
      }
    }, 30000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [refreshKey]);

  useEffect(() => {
    function refreshLocalDashboardSources() {
      setRefreshKey((previous) => previous + 1);
    }

    window.addEventListener("focus", refreshLocalDashboardSources);
    window.addEventListener("storage", refreshLocalDashboardSources);

    return () => {
      window.removeEventListener("focus", refreshLocalDashboardSources);
      window.removeEventListener("storage", refreshLocalDashboardSources);
    };
  }, []);

  const busBookingStatus = useMemo(() => {
    const source = summary?.busBookings || {};
    return [
      { name: "Completed", value: Number(source.completed) || 0 },
      { name: "Upcoming", value: Number(source.upcoming) || 0 },
      { name: "Cancelled", value: Number(source.cancelled) || 0 },
    ];
  }, [summary]);

  const flightBookingStatus = useMemo(() => {
    const source = summary?.flightBookings || {};
    return [
      { name: "Completed", value: Number(source.completed) || 0 },
      { name: "Upcoming", value: Number(source.upcoming) || 0 },
      { name: "Cancelled", value: Number(source.cancelled) || 0 },
    ];
  }, [summary]);

  const hotelBookingStatus = useMemo(() => {
    const source = summary?.hotelBookings || countBookingStatuses(hotelBookings);
    return [
      { name: "Completed", value: Number(source.completed) || 0 },
      { name: "Upcoming", value: Number(source.upcoming) || 0 },
      { name: "Cancelled", value: Number(source.cancelled) || 0 },
    ];
  }, [hotelBookings, summary]);

  const dashboardStats = useMemo(() => {
    const revenue = summary?.revenueSnapshot || {};
    const busCompleted = (Number(summary?.busBookings?.completed) || 0) + (Number(summary?.flightBookings?.completed) || 0);
    const totalBookings =
      Number(summary?.totalBookings) || 0;
    const completionRatePercent = Number(summary?.completionRatePercent) || 0;

    return [
      {
        id: "kpi-1",
        label: "Total Bookings",
        value: totalBookings.toLocaleString("en-IN"),
        hint: "Bookings in current cycle",
        icon: CalendarClock,
      },
      {
        id: "kpi-2",
        label: "Completion Rate",
        value: formatPercent(completionRatePercent),
        hint: `${busCompleted.toLocaleString("en-IN")} completed journeys`,
        icon: BadgeCheck,
      },
      {
        id: "kpi-4",
        label: "Total Revenue",
        value: formatCurrencyCompact(revenue.totalRevenueInr),
        hint: `Total Savings ${formatCurrencyCompact(revenue.totalSavingsInr)} | Cancelled Value ${formatCurrencyCompact(
          revenue.cancelledValueInr
        )}`,
        icon: IndianRupee,
      },
    ];
  }, [summary]);

  return (
    <div className="dashboard-content dashboard-home">
      <header className="dashboard-header">
        <div className="dashboard-header-copy">
          <h1>Travel Booking Dashboard</h1>
        </div>
        <div className="dashboard-time-badge">
          {currentDateTime}
        </div>
      </header>

      {walletSummary && (
        <section className="dashboard-wallet-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px', marginTop: '14px', border: '1px solid #eee' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#5b7494', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 6px 0' }}>Wallet Balance</p>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '28px', color: '#1c385d', letterSpacing: '-0.02em' }}>₹{Number(walletSummary.availableBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            <span style={{ fontSize: '11px', background: walletSummary.walletStatus === 'Active' ? '#d4edda' : '#f8d7da', color: walletSummary.walletStatus === 'Active' ? '#155724' : '#721c24', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>Status: {walletSummary.walletStatus ?? "Inactive"}</span>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#5b7494', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 6px 0' }}>Pick&book Coins</p>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '28px', color: '#1c385d', letterSpacing: '-0.02em' }}>{Number(walletSummary.picknbookCoins ?? 0)}</h2>
            <span style={{ fontSize: '11px', color: '#5e7695' }}>Loyalty Rewards</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
            <Link to="/dashboard/wallet" style={{ color: '#007bff', textDecoration: 'none', fontWeight: '600', textAlign: 'center', fontSize: '13px' }}>View Wallet</Link>
          </div>
        </section>
      )}

      <section className="dashboard-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" }}>
        {dashboardStats.map((stat) => (
          <article className="metric-card" key={stat.id}>
            <div className="metric-icon">
              <stat.icon size={17} />
            </div>
            <div className="metric-copy">
              <p>{stat.label}</p>
              <strong>{loadingSummary ? "..." : stat.value}</strong>
              <span>{stat.hint}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-main-grid">
        <div className="dashboard-panel">
          <header className="panel-head">
            <h2>Booking Status Overview</h2>
          </header>
          <div className="dashboard-chart-grid">
            <ChartCard
              title="Bus Bookings"
              data={busBookingStatus}
              total={summary?.busBookings?.total}
              loading={loadingSummary}
            />
            <ChartCard
              title="Flight Bookings"
              data={flightBookingStatus}
              total={summary?.flightBookings?.total}
              loading={loadingSummary}
            />
            <ChartCard
              title="Hotel Bookings"
              data={hotelBookingStatus}
              loading={loadingSummary}
            />
          </div>
        </div>
      </section>

      {summaryError && <p role="alert">{summaryError}</p>}


    </div>
  );
}
