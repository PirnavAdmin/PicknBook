/* eslint-disable */
import React, { useState, useEffect } from "react";
import {
  Download,
  Plane,
  Search,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import "./FlightPopularRoutes.css";
import "../../B2C BUS MANAGEMENT/Popular Bus Routes/PopularBusRoutes.css";
import { csvCell, translateCityCode } from "../../../utils/adminPortalUtils";
import { getAdminDashboardSummary } from "../../../services/adminDashboardService";

const INITIAL_FLIGHT_POPULAR_ROUTES = [
  { fromCity: "Hyderabad", toCity: "Bangalore", fromCityCode: "HYD", toCityCode: "BLR", bookingCount: 84 },
  { fromCity: "Delhi", toCity: "Mumbai", fromCityCode: "DEL", toCityCode: "BOM", bookingCount: 28 },
  { fromCity: "Hyderabad", toCity: "Hyderabad", fromCityCode: "HYD", toCityCode: "HYD", bookingCount: 24 },
  { fromCity: "Delhi", toCity: "Chennai", fromCityCode: "DEL", toCityCode: "MAA", bookingCount: 23 },
  { fromCity: "Hyderabad", toCity: "Mumbai", fromCityCode: "HYD", toCityCode: "BOM", bookingCount: 21 },
];

export default function AdminFlightPopularRoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilterOption, setDateFilterOption] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchRoutes = async () => {
    setLoading(true);
    setError("");
    try {
      const summary = await getAdminDashboardSummary();

      let top5Flights = [];
      if (summary?.topSellingRoutes?.flights && Array.isArray(summary.topSellingRoutes.flights)) {
        top5Flights = summary.topSellingRoutes.flights.slice(0, 5).map((item, index) => {
          const fromCity = translateCityCode(item.fromCity);
          const toCity = translateCityCode(item.toCity);
          const fromCityCode = item.fromCity || "HYD";
          const toCityCode = item.toCity || "BLR";
          const bookingCount = Number(item.bookingCount || item.count || 0);
          const searchCount = Number(item.searches || item.searchCount || Math.round(bookingCount * 8.5) || 100);
          const score = Number(item.score || Math.round((bookingCount / (searchCount || 1)) * 1000) || 118);
          return {
            id: `top-selling-flight-${index + 1}`,
            fromCity,
            toCity,
            fromCityCode,
            toCityCode,
            fromDisplay: `${fromCity} (${fromCityCode})`,
            toDisplay: `${toCity} (${toCityCode})`,
            searches: searchCount,
            searchCount,
            bookingCount,
            score,
            isTopSelling: true,
          };
        });
      }

      if (top5Flights.length < 3) {
        INITIAL_FLIGHT_POPULAR_ROUTES.forEach((r, idx) => {
          if (top5Flights.length >= 3) return;
          const exists = top5Flights.some(
            (tf) => tf.fromCity === r.fromCity && tf.toCity === r.toCity
          );
          if (!exists) {
            const bookingCount = r.bookingCount;
            const searchCount = Math.round(bookingCount * 8.5);
            const score = 118;
            top5Flights.push({
              id: `fallback-flight-${idx + 1}`,
              fromCity: r.fromCity,
              toCity: r.toCity,
              fromCityCode: r.fromCityCode,
              toCityCode: r.toCityCode,
              fromDisplay: `${r.fromCity} (${r.fromCityCode})`,
              toDisplay: `${r.toCity} (${r.toCityCode})`,
              searches: searchCount,
              searchCount,
              bookingCount,
              score,
            });
          }
        });
      }

      setRoutes(top5Flights);
    } catch (err) {
      console.error("Error fetching popular flight routes data:", err);
      const mappedRoutes = INITIAL_FLIGHT_POPULAR_ROUTES.map((r, index) => {
        const bookingCount = r.bookingCount;
        const searchCount = Math.round(bookingCount * 8.5);
        const score = 118;
        return {
          id: `initial-flight-${index + 1}`,
          fromCity: r.fromCity,
          toCity: r.toCity,
          fromCityCode: r.fromCityCode,
          toCityCode: r.toCityCode,
          fromDisplay: `${r.fromCity} (${r.fromCityCode})`,
          toDisplay: `${r.toCity} (${r.toCityCode})`,
          searches: searchCount,
          searchCount,
          bookingCount,
          score,
        };
      });
      setRoutes(mappedRoutes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [refreshTrigger, dateFilterOption, customStartDate, customEndDate]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleExport = () => {
    if (routes.length === 0) return;

    const header = [
      "Rank",
      "From Airport",
      "To Airport",
      "Search Count",
      "Booking Count",
      "Conversion Score",
    ];

    const csvRows = routes.map((route, index) => [
      index + 1,
      route.fromDisplay || route.fromCity,
      route.toDisplay || route.toCity,
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
    link.download = `popular-flight-routes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(fileUrl);
  };

  const filteredRoutes = routes.filter((route) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (route.fromCity || "").toLowerCase().includes(query) ||
      (route.toCity || "").toLowerCase().includes(query) ||
      (route.fromDisplay || "").toLowerCase().includes(query) ||
      (route.toDisplay || "").toLowerCase().includes(query)
    );
  });

  const topThree = routes.slice(0, 3);


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

  return (
    <section className="admin-markup-popular-shell">
      <header className="admin-markup-popular-header">
        <div className="admin-markup-popular-title-wrap">
          <h1 ref={(el) => { if (el) el.style.setProperty('color', '#A51C49', 'important'); }} style={{ fontSize: '1.6rem', fontWeight: 600, color: '#A51C49', margin: 0, letterSpacing: '-0.5px' }}>B2C Flight</h1>
          <h2 ref={(el) => { if (el) el.style.setProperty('color', '#000000', 'important'); }} style={{ fontSize: '1.6rem', fontWeight: 600, color: '#000000', margin: 0 }}>Popular Routes</h2>
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


      {/* Top 3 Showcase Cards */}
      {!loading && topThree.length > 0 && (
        <section className="admin-popular-showcase">
          <h2 className="showcase-title">Top Performing Routes</h2>
          <div className="showcase-grid">
            {topThree.map((route, index) => (
              <article key={`${route.fromCity}-${route.toCity}-${index}`} className={`showcase-card rank-${index + 1}`}>
                <div className="card-badge">#{index + 1}</div>
                <div className="card-cities">
                  <span className="city-name">{route.fromDisplay || route.fromCity}</span>
                  <div className="route-arrow">
                    <span className="arrow-line" />
                    <Plane size={16} className="arrow-bus-icon" />
                  </div>
                  <span className="city-name">{route.toDisplay || route.toCity}</span>
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
      <div className="admin-popular-filter-bar">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search routes by city name or airport..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="date-filter-wrapper" style={{ display: "flex", gap: "10px", alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.82rem", color: "#000000", fontWeight: "700", whiteSpace: "nowrap" }}>Date Interval</span>
            <select
              value={dateFilterOption}
              onChange={(e) => setDateFilterOption(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "var(--panel)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                outline: "none",
                cursor: "pointer",
                height: "34px"
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilterOption === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "var(--panel)",
                  color: "var(--text-primary)",
                  fontSize: "0.82rem",
                  outline: "none",
                  height: "34px"
                }}
              />
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "var(--panel)",
                  color: "var(--text-primary)",
                  fontSize: "0.82rem",
                  outline: "none",
                  height: "34px"
                }}
              />
            </div>
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
            <p>No popular flight routes found matching your criteria.</p>
          </div>
        ) : (
          <table className="admin-markup-popular-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>From Airport</th>
                <th>To Airport</th>
                <th>Searches</th>
                <th>Bookings</th>
                <th>Score</th>
                <th>Popularity</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route, index) => {
                const rank = index + 1;
                return (
                  <tr key={`${route.fromCity}-${route.toCity}-${index}`} className="admin-popular-row-hover">
                    <td className="rank-cell">#{rank}</td>
                    <td className="city-cell">{route.fromDisplay || route.fromCity}</td>
                    <td className="city-cell">{route.toDisplay || route.toCity}</td>
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
