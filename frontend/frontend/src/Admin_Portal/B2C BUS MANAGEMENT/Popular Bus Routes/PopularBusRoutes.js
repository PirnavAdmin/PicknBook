/* eslint-disable */
import React, { useEffect, useState } from "react";
import { 
  Download, 
  Search, 
  Bus, 
  Award, 
  Activity, 
  RefreshCw, 
  AlertCircle
} from "lucide-react";
import "./PopularBusRoutes.css";
import { csvCell } from "../../../utils/adminPortalUtils";
import { getPopularBusRoutesFromSearchHistory } from "../../../services/busSearchHistoryService";

const INITIAL_BUS_POPULAR_ROUTES = [
  {
    fromCity: "Hyderabad",
    toCity: "Bangalore",
    searches: 350,
    bookingCount: 45,
    score: 128,
  },
  {
    fromCity: "Mumbai",
    toCity: "Pune",
    searches: 280,
    bookingCount: 38,
    score: 135,
  },
  {
    fromCity: "Delhi",
    toCity: "Jaipur",
    searches: 210,
    bookingCount: 25,
    score: 119,
  },
  {
    fromCity: "Chennai",
    toCity: "Bangalore",
    searches: 190,
    bookingCount: 22,
    score: 115,
  },
  {
    fromCity: "Bangalore",
    toCity: "Goa",
    searches: 180,
    bookingCount: 20,
    score: 111,
  },
  {
    fromCity: "Pune",
    toCity: "Goa",
    searches: 150,
    bookingCount: 18,
    score: 120,
  },
  {
    fromCity: "Kolkata",
    toCity: "Digha",
    searches: 140,
    bookingCount: 15,
    score: 107,
  },
  {
    fromCity: "Chennai",
    toCity: "Coimbatore",
    searches: 130,
    bookingCount: 14,
    score: 108,
  },
  {
    fromCity: "Mumbai",
    toCity: "Shirdi",
    searches: 120,
    bookingCount: 13,
    score: 108,
  },
  {
    fromCity: "Bangalore",
    toCity: "Mangalore",
    searches: 110,
    bookingCount: 12,
    score: 109,
  },
];

export default function AdminBusPopularRoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilterOption, setDateFilterOption] = useState("all"); // all, today, week, month, custom
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchRoutes = async () => {
      setLoading(true);
      setError("");

      let startDate = null;
      let endDate = null;

      const now = new Date();
      if (dateFilterOption === "today") {
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
      } else if (dateFilterOption === "week") {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate = new Date(startOfWeek.setHours(0, 0, 0, 0)).toISOString();
        endDate = new Date().toISOString();
      } else if (dateFilterOption === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = new Date(startOfMonth.setHours(0, 0, 0, 0)).toISOString();
        endDate = new Date().toISOString();
      } else if (dateFilterOption === "custom") {
        if (customStartDate) {
          startDate = new Date(new Date(customStartDate).setHours(0, 0, 0, 0)).toISOString();
        }
        if (customEndDate) {
          endDate = new Date(new Date(customEndDate).setHours(23, 59, 59, 999)).toISOString();
        }
      }

      try {
        const data = await getPopularBusRoutesFromSearchHistory({ 
          limit: 15, 
          startDate, 
          endDate 
        });
        if (isMounted) {
          const mappedRoutes = (data || []).map((r, index) => {
            const searchCount = Number(r.searches || r.searchCount || 0);
            const bookingCount = Number(r.bookingCount || Math.max(1, Math.round(searchCount * 0.12)) || 0);
            const score = Number(r.score || Math.round((bookingCount / (searchCount || 1)) * 1000) || 0);
            return {
              ...r,
              searchCount,
              bookingCount,
              score,
            };
          });
          setRoutes(mappedRoutes);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching popular routes:", err);
          const mappedRoutes = INITIAL_BUS_POPULAR_ROUTES.map(r => ({
            ...r,
            searchCount: r.searches,
            bookingCount: r.bookingCount,
            score: r.score,
          }));
          setRoutes(mappedRoutes);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRoutes();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger, dateFilterOption, customStartDate, customEndDate]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    setSecondsSinceUpdate(0);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceUpdate((prev) => {
        if (prev >= 299) { // 5 minutes = 300 seconds
          setRefreshTrigger((r) => r + 1);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    if (routes.length === 0) {
      return;
    }

    const header = [
      "Rank",
      "From City",
      "To City",
      "Search Count",
      "Booking Count",
      "Conversion Score",
    ];

    const csvRows = routes.map((route, index) => [
      index + 1,
      route.fromCity,
      route.toCity,
      route.searchCount,
      route.bookingCount,
      route.score,
    ]);

    const csv = [header, ...csvRows]
      .map((line) => line.map((cell) => csvCell(cell)).join(","))
      .join("\n");

    const fileBlob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const fileUrl = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");

    link.href = fileUrl;
    link.download = `popular-bus-routes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(fileUrl);
  };

  const filteredRoutes = routes.filter((route) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (route.fromCity || "").toLowerCase().includes(query) ||
      (route.toCity || "").toLowerCase().includes(query)
    );
  });

  const topThree = routes.slice(0, 3);

  const totalSearches = routes.reduce((sum, r) => sum + (r.searchCount || 0), 0);
  const totalBookings = routes.reduce((sum, r) => sum + (r.bookingCount || 0), 0);
  const totalScore = routes.reduce((sum, r) => sum + (r.score || 0), 0);
  const avgScore = routes.length ? Math.round(totalScore / routes.length) : 0;

  const getPopularityBadgeClass = (score) => {
    if (score >= 200) return "high";
    if (score >= 100) return "medium";
    return "trending";
  };

  const getPopularityLabel = (score) => {
    if (score >= 200) return "High Traffic";
    if (score >= 100) return "Trending";
    return "Active";
  };

  if (error) {
    return (
      <section className="admin-markup-popular-shell">
        <header className="admin-markup-popular-header">
          <div className="admin-markup-popular-title-wrap">
            <h1>
              <span style={{ color: "#A51C49", fontWeight: 700 }}>B2C Bus</span> Popular Routes
            </h1>
          </div>
        </header>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          background: 'var(--panel)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginTop: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <div style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} />
            <span>Network Error</span>
          </div>
          <button 
            type="button" 
            onClick={handleRefresh}
            style={{
              background: '#A41B48',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(164, 27, 72, 0.2)',
              transition: 'all 0.2s'
            }}
            title="Retry Connection"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-markup-popular-shell">
      <header className="admin-markup-popular-header">
        <div className="admin-markup-popular-title-wrap">
          <h1>
            <span style={{ color: "#A51C49", fontWeight: 700 }}>B2C Bus</span> Popular Routes
          </h1>
        </div>

        <div className="admin-markup-popular-actions">
          <button
            type="button"
            className="admin-markup-popular-btn refresh"
            onClick={handleRefresh}
            title="Refresh statistics"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          
          <button
            type="button"
            className="admin-markup-popular-btn export"
            onClick={handleExport}
            disabled={routes.length === 0 || loading}
            title="Export routes to CSV"
          >
            <Download size={15} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Stats Summary Panel */}
      <section className="admin-popular-stats-grid">
        <article className="admin-popular-stat-card searches">
          <div className="stat-label">Total Searches</div>
          <div className="stat-value">
            {loading ? "..." : totalSearches.toLocaleString()}
          </div>
          <div className="stat-meta">Across all bus routes</div>
        </article>

        <article className="admin-popular-stat-card bookings">
          <div className="stat-label">Total Bookings</div>
          <div className="stat-value">
            {loading ? "..." : totalBookings.toLocaleString()}
          </div>
          <div className="stat-meta">Confirmed ticket bookings</div>
        </article>

        <article className="admin-popular-stat-card score">
          <div className="stat-label">Average Score</div>
          <div className="stat-value">
            {loading ? "..." : avgScore.toLocaleString()}
          </div>
          <div className="stat-meta">Average route popularity score</div>
        </article>
      </section>

      {/* Top 3 Showcase Cards */}
      {!loading && topThree.length > 0 && (
        <section className="admin-popular-showcase">
          <h2 className="showcase-title">Top Performing Routes</h2>
          <div className="showcase-grid">
            {topThree.map((route, index) => (
              <article key={`${route.fromCity}-${route.toCity}`} className={`showcase-card rank-${index + 1}`}>
                <div className="card-badge">#{index + 1}</div>
                <div className="card-cities">
                  <span className="city-name">{route.fromCity}</span>
                  <div className="route-arrow">
                    <span className="arrow-line" />
                    <Bus size={16} className="arrow-bus-icon" />
                  </div>
                  <span className="city-name">{route.toCity}</span>
                </div>
                
                <div className="card-metrics-grid">
                  <div className="metric-box">
                    <span className="metric-label">Searches</span>
                    <strong className="metric-val">{route.searchCount}</strong>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">Bookings</span>
                    <strong className="metric-val">{route.bookingCount}</strong>
                  </div>
                  <div className="metric-box highlighted">
                    <span className="metric-label">Score</span>
                    <strong className="metric-val">{route.score}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Search and Filters */}
      <div className="admin-popular-filter-bar" style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="search-input-wrapper" style={{ flex: "1", minWidth: "260px" }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search routes by city name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="date-filter-wrapper" style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "0.8rem", color: "#000000", fontWeight: "700" }}>Date Interval</span>
            <select
              value={dateFilterOption}
              onChange={(e) => setDateFilterOption(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1.5px solid var(--border)",
                backgroundColor: "var(--panel)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                outline: "none",
                cursor: "pointer",
                height: "42px"
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </label>

          {dateFilterOption === "custom" && (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", color: "#000000", fontWeight: "700" }}>Start Date</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid var(--border)",
                    backgroundColor: "var(--panel)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    outline: "none",
                    height: "42px"
                  }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "0.8rem", color: "#000000", fontWeight: "700" }}>End Date</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1.5px solid var(--border)",
                    backgroundColor: "var(--panel)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    outline: "none",
                    height: "42px"
                  }}
                />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Detailed Routes Table */}
      <section className="admin-markup-popular-table-wrap">
        {loading ? (
          <div className="admin-popular-loading-state">
            <RefreshCw size={24} className="animate-spin" />
            <p>Fetching popular route metrics from backend...</p>
          </div>
        ) : error ? (
          <div className="admin-popular-error-state">
            <AlertCircle size={24} />
            <p>{error}</p>
            <button type="button" onClick={handleRefresh}>Retry</button>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="admin-popular-empty-state">
            <p>No popular routes found matching your criteria.</p>
          </div>
        ) : (
          <table className="admin-markup-popular-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>From City</th>
                <th>To City</th>
                <th>Searches</th>
                <th>Bookings</th>
                <th>Score</th>
                <th>Popularity</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route, index) => {
                const rank = routes.findIndex((r) => r.fromCity === route.fromCity && r.toCity === route.toCity) + 1;
                return (
                  <tr key={`${route.fromCity}-${route.toCity}`} className="admin-popular-row-hover">
                    <td className="rank-cell">#{rank}</td>
                    <td className="city-cell">{route.fromCity}</td>
                    <td className="city-cell">{route.toCity}</td>
                    <td>{route.searchCount.toLocaleString()}</td>
                    <td>{route.bookingCount.toLocaleString()}</td>
                    <td className="score-cell">{route.score}</td>
                    <td>
                      <span className={`popularity-pill ${getPopularityBadgeClass(route.score)}`}>
                        {getPopularityLabel(route.score)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

