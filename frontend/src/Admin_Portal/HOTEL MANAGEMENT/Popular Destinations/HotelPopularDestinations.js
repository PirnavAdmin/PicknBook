import React, { useEffect, useState } from "react";
import {
  Download,
  Search,
  Hotel,
  Award,
  Activity,
  RefreshCw,
  AlertCircle,
  MapPin,
} from "lucide-react";
import "./HotelPopularDestinations.css";
import { getPopularHotelDestinationsFromSearchHistory } from "../../../services/adminHotelService";
import AdminPagination from "../../../components/AdminPagination";

const FALLBACK_DESTINATIONS = [
  { id: "f1", city: "Goa", searches: 420 },
  { id: "f2", city: "Mumbai", searches: 310 },
  { id: "f3", city: "Delhi", searches: 280 },
  { id: "f4", city: "Jaipur", searches: 245 },
  { id: "f5", city: "Bangalore", searches: 210 },
  { id: "f6", city: "Chennai", searches: 190 },
  { id: "f7", city: "Hyderabad", searches: 175 },
  { id: "f8", city: "Kolkata", searches: 155 },
  { id: "f9", city: "Agra", searches: 140 },
  { id: "f10", city: "Udaipur", searches: 120 },
];

const csvCell = (val) => {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export default function HotelPopularDestinations() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFallback, setIsFallback] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    let isMounted = true;
    const fetchDestinations = async () => {
      setLoading(true);
      setError("");
      setIsFallback(false);
      try {
        const data = await getPopularHotelDestinationsFromSearchHistory({ limit: 10 });
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          setDestinations(data);
          setIsFallback(false);
        } else {
          // API returned empty — show sample data with a notice
          setDestinations(FALLBACK_DESTINATIONS);
          setIsFallback(true);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("[HotelPopularDestinations] fetch error:", err);
        setDestinations(FALLBACK_DESTINATIONS);
        setIsFallback(true);
        setError(err?.message || "Could not load live data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDestinations();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const handleRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleExport = () => {
    if (destinations.length === 0) return;

    const header = ["Rank", "City / Destination", "Search Count", "Popularity"];

    const csvRows = destinations.map((dest, index) => [
      index + 1,
      dest.city,
      dest.searches,
      getPopularityLabel(dest.searches, destinations[0]?.searches || 1),
    ]);

    const csv = [header, ...csvRows]
      .map((line) => line.map((cell) => csvCell(cell)).join(","))
      .join("\n");

    const fileBlob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const fileUrl = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `hotel-popular-destinations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(fileUrl);
  };

  const filteredDestinations = destinations.filter((dest) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (dest.city || "").toLowerCase().includes(query);
  });

  const paginatedDestinations = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDestinations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDestinations, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const topThree = destinations.slice(0, 3);
  const totalSearches = destinations.reduce((sum, d) => sum + (d.searches || 0), 0);
  const maxSearches = destinations[0]?.searches || 1;

  const getPopularityBadgeClass = (searches, max) => {
    const ratio = searches / max;
    if (ratio >= 0.7) return "high";
    if (ratio >= 0.4) return "medium";
    return "trending";
  };

  const getPopularityLabel = (searches, max) => {
    const ratio = searches / max;
    if (ratio >= 0.7) return "High Demand";
    if (ratio >= 0.4) return "Trending";
    return "Active";
  };

  return (
    <section className="hpd-shell admin-b2c-hotel-page">
      {/* Page Header */}
      <header className="hpd-shell-header">
        <div className="hpd-shell-title-wrap">
          <h2 style={{ fontWeight: 500, margin: 0, fontSize: "1.6rem" }}>
            <span style={{ color: '#A51C49', fontWeight: 500 }}>Hotel</span> <span style={{ color: '#000000', fontWeight: 500 }}>Popular Destinations</span>
          </h2>
          <p className="hpd-shell-subtitle">
            Top 10 most-searched hotel destinations — derived from live search history
          </p>
        </div>

        <div className="hpd-shell-actions">
          <button
            type="button"
            className="hpd-shell-btn refresh"
            onClick={handleRefresh}
            title="Refresh statistics"
          >
            <RefreshCw size={15} className={loading ? "hpd-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="hpd-shell-btn export"
            onClick={handleExport}
            disabled={destinations.length === 0 || loading}
            title="Export destinations to CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Fallback Notice */}
      {!loading && isFallback && (
        <div className="hpd-fallback-notice">
          <AlertCircle size={15} />
          <span>
            No live search history found — showing <strong>sample destinations</strong>.
            Data will appear here once guests start searching for hotels.
          </span>
          {error && <span className="hpd-fallback-err">({error})</span>}
        </div>
      )}

      {/* Stats Summary Panel */}
      <section className="hpd-stats-grid">
        <article className="hpd-stat-card">
          <div className="hpd-stat-icon searches">
            <Activity size={20} />
          </div>
          <div className="hpd-stat-info">
            <span className="hpd-stat-label">Total Searches</span>
            <strong className="hpd-stat-value">
              {loading ? "..." : totalSearches.toLocaleString()}
            </strong>
          </div>
        </article>

        <article className="hpd-stat-card">
          <div className="hpd-stat-icon hotels">
            <Hotel size={20} />
          </div>
          <div className="hpd-stat-info">
            <span className="hpd-stat-label">Top Destinations</span>
            <strong className="hpd-stat-value">
              {loading ? "..." : destinations.length}
            </strong>
          </div>
        </article>

        <article className="hpd-stat-card">
          <div className="hpd-stat-icon top">
            <Award size={20} />
          </div>
          <div className="hpd-stat-info">
            <span className="hpd-stat-label">#1 Destination</span>
            <strong className="hpd-stat-value hpd-stat-city">
              {loading ? "..." : (destinations[0]?.city || "—")}
            </strong>
          </div>
        </article>
      </section>

      {/* Top 3 Showcase */}
      {!loading && topThree.length > 0 && (
        <section className="hpd-showcase">
          <h2 className="hpd-showcase-title">Top Searched Destinations</h2>
          <div className="hpd-showcase-grid">
            {topThree.map((dest, index) => (
              <article
                key={dest.id}
                className={`hpd-showcase-card rank-${index + 1}`}
              >
                <div className="hpd-card-badge">#{index + 1}</div>
                <div className="hpd-card-body">
                  <div className="hpd-card-pin">
                    <MapPin size={18} className="hpd-pin-icon" />
                    <span className="hpd-dest-name">{dest.city}</span>
                  </div>
                  <div className="hpd-card-metrics">
                    <div className="hpd-metric-box highlighted">
                      <span className="hpd-metric-label">Searches</span>
                      <strong className="hpd-metric-val">{dest.searches.toLocaleString()}</strong>
                    </div>
                    <div className="hpd-metric-box">
                      <span className="hpd-metric-label">Popularity</span>
                      <span className={`hpd-pop-pill ${getPopularityBadgeClass(dest.searches, maxSearches)}`}>
                        {getPopularityLabel(dest.searches, maxSearches)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Search Filter */}
      <div className="hpd-filter-bar">
        <div className="hpd-search-wrapper">
          <Search size={16} className="hpd-search-icon" />
          <input
            type="text"
            placeholder="Search destinations by city name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="hpd-result-chip">
          {filteredDestinations.length} of {destinations.length} destinations
        </span>
      </div>

      {/* Detailed Table */}
      <section className="hpd-table-wrap">
        {loading ? (
          <div className="hpd-page-state">
            <RefreshCw size={24} className="hpd-spin" />
            <p>Fetching hotel search history...</p>
          </div>
        ) : error ? (
          <div className="hpd-page-state error">
            <AlertCircle size={24} />
            <p>{error}</p>
            <button type="button" onClick={handleRefresh}>Retry</button>
          </div>
        ) : filteredDestinations.length === 0 ? (
          <div className="hpd-page-state">
            <MapPin size={24} />
            <p>No destinations found matching your search.</p>
          </div>
        ) : (
          <table className="hpd-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>City / Destination</th>
                <th>Search Count</th>
                <th>Share of Searches</th>
                <th>Popularity</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDestinations.map((dest) => {
                const rank =
                  destinations.findIndex((d) => d.id === dest.id) + 1;
                const sharePercent = totalSearches
                  ? Math.round((dest.searches / totalSearches) * 100)
                  : 0;
                return (
                  <tr key={dest.id} className="hpd-row-hover">
                    <td className="hpd-rank-cell">#{rank}</td>
                    <td className="hpd-city-cell">
                      <div className="hpd-city-row">
                        <MapPin size={14} className="hpd-pin-sm" />
                        {dest.city}
                      </div>
                    </td>
                    <td className="hpd-searches-cell">
                      {dest.searches.toLocaleString()}
                    </td>
                    <td className="hpd-bar-cell">
                      <div className="hpd-bar-wrap">
                        <div
                          className="hpd-bar-fill"
                          style={{ width: `${sharePercent}%` }}
                        />
                        <span className="hpd-bar-label">{sharePercent}%</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`hpd-pop-pill ${getPopularityBadgeClass(
                          dest.searches,
                          maxSearches
                        )}`}
                      >
                        {getPopularityLabel(dest.searches, maxSearches)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <AdminPagination
            currentPage={currentPage}
            totalItems={filteredDestinations.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            itemName="destinations"
          />
        </div>
      </section>
    </section>
  );
}

