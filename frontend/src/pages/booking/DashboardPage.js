/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  IndianRupee,
  Clock4,
  Route,
  TicketX,
  WalletCards,
} from "lucide-react";
import { listBusBookings } from "../../services/busBookingService";
import { getDashboardSummary } from "../../services/dashboardService";
import { listFlightBookings } from "../../services/flightBookingService";
import { getMyHotelBookings } from "../../services/hotelBookingService";
import { getWalletSummary } from "../../services/walletService";
import { RefreshCw } from "lucide-react";

const RECENT_LIMIT = 10;
const TRAVELER_PENDING_DAYS = 7;
const TRAVELER_STORAGE_KEY = "my_traveler_data";
const DEPOSIT_STORAGE_KEY = "my_deposit_request_data";

const BOOKING_COLORS = {
  Completed: "#1d8f5f",
  Upcoming: "#dc8a14",
  Cancelled: "#d35454",
};

const QUICK_LINKS = [
  { id: "quick-1", label: "Bus Bookings", to: "/dashboard/bus-bookings" },
  { id: "quick-2", label: "Print Ticket", to: "/fetch-ticket" },
  { id: "quick-3", label: "Web Check-in", to: "/dashboard/web-checkin" },
];

const OFFER_MESSAGES = [
  "Save up to 20% on selected intercity bus routes.",
  "Instant cashback on eligible UPI and card transactions.",
];

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

function formatUpdateMeta(type, occurredAtUtc) {
  const safeType = String(type || "Update").replace(/([a-z])([A-Z])/g, "$1 $2");
  const date = new Date(occurredAtUtc);

  if (Number.isNaN(date.getTime())) {
    return safeType;
  }

  return `${safeType} | ${date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function mapUpdateState(type) {
  const normalized = String(type || "").toLowerCase();

  if (normalized.includes("cancel")) return "Pending";
  if (normalized.includes("traveler")) return "Review";
  if (normalized.includes("payment")) return "Approved";
  return "Updated";
}

function readStoredArray(storageKey) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

function buildDynamicDashboardSummary({
  busBookings,
  flightBookings,
  travelerData,
  depositData,
}) {
  const allBookings = Array.isArray(busBookings) ? busBookings : [];
  const busStatus = countBookingStatuses(busBookings);
  const flightStatus = countBookingStatuses(flightBookings);
  const totalBookings = allBookings.length;
  const completedJourneys = busStatus.completed;
  const activeRevenue = allBookings.reduce((sum, booking) => {
    if (classifyBookingStatus(booking?.status) === "cancelled") {
      return sum;
    }

    return sum + (Number(booking?.totalPriceInr) || 0);
  }, 0);
  const cancelledValue = allBookings.reduce((sum, booking) => {
    if (classifyBookingStatus(booking?.status) !== "cancelled") {
      return sum;
    }

    return sum + (Number(booking?.totalPriceInr) || 0);
  }, 0);
  const pendingDeposits = (Array.isArray(depositData) ? depositData : []).filter((item) =>
    String(item?.status || "").trim().toLowerCase().includes("pending")
  );

  const routeMap = allBookings.reduce((map, booking) => {
    const fromCity = String(booking?.fromCity || "--").trim() || "--";
    const toCity = String(booking?.toCity || "--").trim() || "--";
    const tripType =
      booking?.travelClass || booking?.providerName || booking?.tripNumber ? "Booking" : "Route";
    const key = `${fromCity}__${toCity}`;
    const next = map.get(key) || {
      fromCity,
      toCity,
      tripType,
      bookingCount: 0,
      score: 0,
    };

    next.bookingCount += 1;
    next.score += 1;
    map.set(key, next);
    return map;
  }, new Map());

  const recentUpdates = allBookings
    .slice()
    .sort(
      (left, right) =>
        new Date(right?.bookedAtUtc || right?.cancelledAtUtc || 0).getTime() -
        new Date(left?.bookedAtUtc || left?.cancelledAtUtc || 0).getTime()
    )
    .slice(0, RECENT_LIMIT)
    .map((booking) => {
      const bookingState = classifyBookingStatus(booking?.status);
      return {
        type: bookingState === "cancelled" ? "bookingCancelled" : "bookingCreated",
        message:
          bookingState === "cancelled"
            ? `${booking?.bookingReference || booking?.bookingId || "Booking"} cancelled for ${booking?.fromCity || "--"} to ${booking?.toCity || "--"}`
            : `${booking?.bookingReference || booking?.bookingId || "Booking"} booked for ${booking?.fromCity || "--"} to ${booking?.toCity || "--"}`,
        occurredAtUtc: booking?.cancelledAtUtc || booking?.bookedAtUtc || null,
      };
    });

  return {
    totalBookings,
    completionRatePercent:
      totalBookings > 0 ? (completedJourneys / totalBookings) * 100 : 0,
    pendingActions: {
      cancellations: busStatus.cancelled,
      deposits: pendingDeposits.length,
      travelerUpdates: Array.isArray(travelerData) ? travelerData.length : 0,
      total:
        busStatus.cancelled +
        pendingDeposits.length +
        (Array.isArray(travelerData) ? travelerData.length : 0),
    },
    revenueSnapshot: {
      totalRevenueInr: activeRevenue,
      totalSavingsInr: 0,
      cancelledValueInr: cancelledValue,
    },
    busBookings: {
      ...busStatus,
      total: Array.isArray(busBookings) ? busBookings.length : 0,
    },
    flightBookings: {
      ...flightStatus,
      total: Array.isArray(flightBookings) ? flightBookings.length : 0,
    },
    recentUpdates,
    recentUpdateCounters: {
      bookingUpdates: totalBookings,
      cancellationUpdates: busStatus.cancelled,
      travelerUpdates: Array.isArray(travelerData) ? travelerData.length : 0,
      walletPaymentUpdates: pendingDeposits.length,
    },
    topRoutes: Array.from(routeMap.values())
      .sort((left, right) => right.bookingCount - left.bookingCount)
      .slice(0, 5),
  };
}

function ChartCard({ title, subtitle, data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

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
            <strong>{total}</strong>
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
              <b>{item.value}</b>
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

  const [currentOffer, setCurrentOffer] = useState(0);
  const [summary, setSummary] = useState(null);
  const [busBookings, setBusBookings] = useState([]);
  const [flightBookings, setFlightBookings] = useState([]);
  const [hotelBookings, setHotelBookings] = useState([]);
  const [walletSummary, setWalletSummary] = useState(null);
  const [travelerData, setTravelerData] = useState([]);
  const [depositData, setDepositData] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [summaryNotice, setSummaryNotice] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const slider = setInterval(() => {
      setCurrentOffer((previous) => (previous + 1) % OFFER_MESSAGES.length);
    }, 3500);

    return () => clearInterval(slider);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function fetchDashboardSummary() {
      setLoadingSummary(true);
      setSummaryError("");
      setSummaryNotice("");

      try {
        const [summaryResult, busBookings, flightBookings, hotelBookings, walletRes] = await Promise.all([
          getDashboardSummary({
            recentLimit: RECENT_LIMIT,
            travelerPendingDays: TRAVELER_PENDING_DAYS,
          }).then(
            (payload) => ({ ok: true, payload }),
            (error) => ({ ok: false, error })
          ),
          listBusBookings().catch(() => []),
          listFlightBookings().catch(() => []),
          getMyHotelBookings().catch(() => []),
          getWalletSummary().catch(() => null),
        ]);
        if (ignore) {
          return;
        }

        setBusBookings(Array.isArray(busBookings) ? busBookings : []);
        setFlightBookings(Array.isArray(flightBookings) ? flightBookings : []);
        setHotelBookings(Array.isArray(hotelBookings) ? hotelBookings : []);
        setWalletSummary(walletRes);
        setTravelerData(readStoredArray(TRAVELER_STORAGE_KEY));
        setDepositData(readStoredArray(DEPOSIT_STORAGE_KEY));

        if (summaryResult.ok) {
          const payload = summaryResult.payload || {};
          setSummary(payload);
          setSummaryNotice("");
        } else {
          setSummary(null);
          if (busBookings.length > 0) {
            setSummaryNotice("");
            setSummaryError("");
          } else {
            setSummaryError(
              summaryResult.error?.message || "Unable to load dashboard summary."
            );
            setSummaryNotice("");
          }
        }

        setLastSyncedAt(
          new Date().toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
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
      setTravelerData(readStoredArray(TRAVELER_STORAGE_KEY));
      setDepositData(readStoredArray(DEPOSIT_STORAGE_KEY));
      setRefreshKey((previous) => previous + 1);
    }

    window.addEventListener("focus", refreshLocalDashboardSources);
    window.addEventListener("storage", refreshLocalDashboardSources);

    return () => {
      window.removeEventListener("focus", refreshLocalDashboardSources);
      window.removeEventListener("storage", refreshLocalDashboardSources);
    };
  }, []);

  const liveSummary = useMemo(
    () =>
      buildDynamicDashboardSummary({
        busBookings,
        flightBookings,
        travelerData,
        depositData,
      }),
    [busBookings, depositData, flightBookings, travelerData]
  );

  const summaryViewLabel = loadingSummary
    ? "Syncing..."
    : summary?.dataSource === "fallback"
      ? "Booking Fallback View"
      : "Live API View";

  const busBookingStatus = useMemo(() => {
    const source = summary?.busBookings || liveSummary?.busBookings || {};
    return [
      { name: "Completed", value: Number(source.completed) || 0 },
      { name: "Upcoming", value: Number(source.upcoming) || 0 },
      { name: "Cancelled", value: Number(source.cancelled) || 0 },
    ];
  }, [liveSummary, summary]);

  const flightBookingStatus = useMemo(() => {
    const source = summary?.flightBookings || liveSummary?.flightBookings || {};
    return [
      { name: "Completed", value: Number(source.completed) || 0 },
      { name: "Upcoming", value: Number(source.upcoming) || 0 },
      { name: "Cancelled", value: Number(source.cancelled) || 0 },
    ];
  }, [liveSummary, summary]);

  const hotelBookingStatus = useMemo(() => {
    const source = summary?.hotelBookings || countBookingStatuses(hotelBookings);
    return [
      { name: "Completed", value: Number(source.completed) || 0 },
      { name: "Upcoming", value: Number(source.upcoming) || 0 },
      { name: "Cancelled", value: Number(source.cancelled) || 0 },
    ];
  }, [hotelBookings, summary]);

  const dashboardStats = useMemo(() => {
    const pending = liveSummary?.pendingActions || summary?.pendingActions || {};
    const revenue = liveSummary?.revenueSnapshot || summary?.revenueSnapshot || {};
    const busCompleted = Number(liveSummary?.busBookings?.completed) || 0;
    const totalBookings =
      Number(liveSummary?.totalBookings) || Number(summary?.totalBookings) || 0;
    const completionRatePercent = Number(liveSummary?.completionRatePercent) || 0;

    return [
      {
        id: "kpi-1",
        label: "Total Bookings",
        value: totalBookings.toLocaleString("en-IN"),
        hint: "Bus bookings in current cycle",
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
        id: "kpi-3",
        label: "Pending Actions",
        value: String(Number(pending.total) || 0),
        hint: "Cancellations, deposits, traveler updates",
        icon: Clock4,
      },
      {
        id: "kpi-4",
        label: "Revenue Snapshot",
        value: formatCurrencyCompact(revenue.totalRevenueInr),
        hint: `Savings ${formatCurrencyCompact(revenue.totalSavingsInr)} | Cancelled ${formatCurrencyCompact(
          revenue.cancelledValueInr
        )}`,
        icon: IndianRupee,
      },
    ];
  }, [liveSummary, summary]);

  const actionItems = useMemo(() => {
    const pending = liveSummary?.pendingActions || summary?.pendingActions || {};
    return [
      {
        id: "action-1",
        title: "Cancellation Queue",
        detail: `${Number(pending.cancellations) || 0} cancellation requests pending approval.`,
        to: "/dashboard/bus-cancel",
        cta: "Review now",
      },
      {
        id: "action-2",
        title: "Deposit Approvals",
        detail: `${Number(pending.deposits) || 0} deposit requests waiting for verification.`,
        to: "/dashboard/deposit-request",
        cta: "Open deposits",
      },
      {
        id: "action-3",
        title: "Traveler Data Updates",
        detail: `${Number(pending.travelerUpdates) || 0} traveler updates pending review.`,
        to: "/dashboard/traveler-list",
        cta: "View travelers",
      },
    ];
  }, [liveSummary, summary]);

  const recentUpdates = useMemo(() => {
    const updates = Array.isArray(liveSummary?.recentUpdates)
      ? liveSummary.recentUpdates
      : Array.isArray(summary?.recentUpdates)
        ? summary.recentUpdates
        : [];
    return updates.map((item, index) => ({
      id: `update-${index + 1}`,
      title: item.message || "Activity update",
      meta: formatUpdateMeta(item.type, item.occurredAtUtc),
      state: mapUpdateState(item.type),
    }));
  }, [liveSummary, summary]);

  const topRoutes = useMemo(() => {
    const routes = Array.isArray(liveSummary?.topRoutes)
      ? liveSummary.topRoutes
      : Array.isArray(summary?.topRoutes)
        ? summary.topRoutes
        : [];
    const maxScore = Math.max(
      1,
      ...routes.map((route) => Number(route.score) || Number(route.bookingCount) || 0)
    );

    return routes.map((route, index) => {
      const score = Number(route.score) || Number(route.bookingCount) || 0;
      const share = Math.max(8, Math.round((score / maxScore) * 100));

      return {
        id: `route-${index + 1}`,
        label: `${route.fromCity || "--"} to ${route.toCity || "--"}`,
        share,
        tripType: route.tripType || "Route",
        bookingCount: Number(route.bookingCount) || 0,
      };
    });
  }, [liveSummary, summary]);

  const recentCounters = liveSummary?.recentUpdateCounters || summary?.recentUpdateCounters || {};

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
        <section className="dashboard-wallet-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px', marginTop: '14px', border: '1px solid #eee' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#5b7494', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 6px 0' }}>Wallet Balance</p>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '28px', color: '#1c385d', letterSpacing: '-0.02em' }}>₹ {walletSummary.availableBalance?.toLocaleString('en-IN', {minimumFractionDigits:2})}</h2>
            <span style={{ fontSize: '11px', background: walletSummary.walletStatus === 'Active' ? '#d4edda' : '#f8d7da', color: walletSummary.walletStatus === 'Active' ? '#155724' : '#721c24', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>Status: {walletSummary.walletStatus}</span>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: '#5b7494', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 6px 0' }}>Pick&Book Coins</p>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '28px', color: '#1c385d', letterSpacing: '-0.02em' }}>{walletSummary.picknbookCoins}</h2>
            <span style={{ fontSize: '11px', color: '#5e7695' }}>Loyalty Rewards</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
            <Link to="/dashboard/wallet" style={{ color: '#007bff', textDecoration: 'none', fontWeight: '600', textAlign: 'center', fontSize: '13px' }}>View Wallet</Link>
          </div>
        </section>
      )}

      <section className="dashboard-kpi-grid">
        {dashboardStats.map((stat) => (
          <article className="metric-card" key={stat.id}>
            <div className="metric-icon">
              <stat.icon size={17} />
            </div>
            <div className="metric-copy">
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
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
            />
            <ChartCard
              title="Flight Bookings"
              data={flightBookingStatus}
            />
            <ChartCard
              title="Hotel Bookings"
              data={hotelBookingStatus}
            />
          </div>
        </div>
      </section>

    </div>
  );
}
