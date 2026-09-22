/* eslint-disable */
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
          setDestinations([]);
          setIsFallback(false);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("[HotelPopularDestinations] fetch error:", err);
        setDestinations([]);
        setIsFallback(false);
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
      <style>{`
        .hpd-shell-btn, .hpd-add-btn {
          transition: all 0.2s ease !important;
        }
        .hpd-shell-btn:hover, .hpd-add-btn:hover {
          opacity: 0.9 !important;
          transform: translateY(-1px) !important;
        }
        .hpd-table tbody tr {
          transition: background-color 0.2s ease !important;
        }
        .hpd-table tbody tr:hover {
          background-color: rgba(165, 28, 73, 0.03) !important;
        }

        /* Small page design overrides */
        .hpd-stat-card {
          padding: 10px 14px !important;
          border-radius: 8px !important;
        }
        .hpd-stat-info .hpd-stat-label {
          font-size: 11px !important;
        }
        .hpd-stat-info .hpd-stat-value {
          font-size: 16px !important;
        }
        .hpd-stat-icon {
          width: 32px !important;
          height: 32px !important;
          border-radius: 6px !important;
        }
        .hpd-stat-icon svg {
          width: 16px !important;
          height: 16px !important;
        }
        .hpd-showcase-title {
          font-size: 13px !important;
          margin-bottom: 8px !important;
        }
        .hpd-showcase-card {
          padding: 10px 14px !important;
          border-radius: 8px !important;
        }
        .hpd-card-metrics {
          margin-top: 8px !important;
        }
        .hpd-metric-val {
          font-size: 14px !important;
        }
        .hpd-dest-name {
          font-size: 13px !important;
        }
        
        /* Table data vertical padding and professional look */
        .hpd-table th {
          padding: 8px 12px !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }
        .hpd-table td {
          padding: 12px 16px !important; /* Added space above and below in table data */
          font-size: 12px !important;
          font-family: 'Inter', sans-serif !important;
          color: #334155 !important;
        }
        .hpd-rank-cell {
          font-weight: 600 !important;
        }
        .hpd-city-row {
          font-weight: 500 !important;
        }
      `}</style>
      {/* Page Header */}
      <header className="hpd-shell-header" style={{ paddingTop: '24px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <div className="hpd-shell-title-wrap" style={{ margin: 0 }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0, lineHeight: '28px' }}>
            <span style={{ color: '#A51C49' }}>B2C Hotel</span> Popular Destinations
          </h2>
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
            <span>Export</span>
          </button>
        </div>
      </header>



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
      <div className="hpd-filter-bar" style={{ marginTop: '24px', marginBottom: '24px' }}>
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
            {loading ? (
              <tr>
                <td colSpan="5">
                  <div className="hpd-page-state" style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <RefreshCw size={24} className="hpd-spin" />
                    <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Fetching hotel search history...</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="5">
                  <div className="hpd-page-state error" style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#b91c1c' }}>
                    <AlertCircle size={24} />
                    <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: '500' }}>{error}</p>
                  </div>
                </td>
              </tr>
            ) : filteredDestinations.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className="hpd-page-state" style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <MapPin size={24} style={{ color: '#64748b' }} />
                    <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#64748b' }}>No destinations found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedDestinations.map((dest) => {
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
              })
            )}
          </tbody>
        </table>
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

