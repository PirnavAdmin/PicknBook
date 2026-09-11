/* eslint-disable */
import React, { useEffect, useState } from "react";
import { getThemes, createTheme, activateTheme, deleteTheme } from "../../services/themeService";

export default function ThemesList() {
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#be185d");
  const [primaryStrongColor, setPrimaryStrongColor] = useState("#851237");
  const [pageBgColor, setPageBgColor] = useState("#F3F4F6");
  const [surfaceColor, setSurfaceColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#162126");
  const [borderColor, setBorderColor] = useState("#E5E7EB");

  const [saving, setSaving] = useState(false);
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedName, setSelectedName] = useState("");

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!selectedModule && !selectedName) {
      fetchThemes();
      return;
    }
    setThemes(prev => prev.filter(t => {
      const matchName = !selectedName || t.name.toLowerCase().includes(selectedName.toLowerCase());
      return matchName;
    }));
  };

  const handleClearFilter = () => {
    setSelectedModule("");
    setSelectedName("");
    fetchThemes();
  };

  const fetchThemes = async () => {
    setLoading(true);
    try {
      const data = await getThemes();
      // Handle backend arrays wrapping (e.g. $values or simple array)
      const list = Array.isArray(data) ? data : data?.$values || [];
      setThemes(list);
      setError(null);
    } catch (err) {
      console.error("Error loading themes:", err);
      setError("Failed to fetch theme palette list.");
      // Fallback fallback list for mock presentation
      setThemes([
        {
          id: 1,
          name: "Default Crimson",
          primaryColor: "#be185d",
          primaryStrongColor: "#851237",
          pageBgColor: "#F3F4F6",
          surfaceColor: "#ffffff",
          textColor: "#162126",
          borderColor: "#E5E7EB",
          isActive: true
        },
        {
          id: 2,
          name: "Ocean breeze",
          primaryColor: "#0284c7",
          primaryStrongColor: "#0369a1",
          pageBgColor: "#f0f9ff",
          surfaceColor: "#ffffff",
          textColor: "#0f172a",
          borderColor: "#e2e8f0",
          isActive: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const handleCreateTheme = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await createTheme({
        name,
        primaryColor,
        primaryStrongColor,
        pageBgColor,
        surfaceColor,
        textColor,
        borderColor
      });
      setName("");
      fetchThemes();
    } catch (err) {
      console.error("Error creating theme:", err);
      alert("Failed to create theme palette.");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await activateTheme(id);
      fetchThemes();
    } catch (err) {
      console.error("Error activating theme:", err);
      // Fallback for visual mock mode
      setThemes(prev => prev.map(t => ({ ...t, isActive: t.id === id })));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this theme?")) return;
    try {
      await deleteTheme(id);
      fetchThemes();
    } catch (err) {
      console.error("Error deleting theme:", err);
      // Fallback for visual mock mode
      setThemes(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="theme-builder-panel">
      <style>{`
        .theme-builder-panel {
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .theme-builder-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 30px;
          align-items: start;
        }
        .theme-card-box {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .theme-card-box h3 {
          margin: 0 0 20px 0;
          font-size: 1.15rem;
          color: #1e293b;
          font-weight: 700;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-size: 0.82rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
        }
        .form-group input[type="text"] {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
          font-size: 0.88rem;
        }
        .color-picker-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .color-picker-row input[type="color"] {
          width: 44px;
          height: 38px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          cursor: pointer;
          background: none;
          padding: 0;
        }
        .color-picker-row input[type="text"] {
          flex: 1;
        }
        .btn-theme-submit {
          width: 100%;
          background: #be185d;
          color: #white;
          border: none;
          padding: 12px;
          font-weight: 700;
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        .btn-theme-submit:hover {
          opacity: 0.9;
        }
        .theme-palette-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .palette-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          position: relative;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: transform 0.2s ease;
        }
        .palette-card:hover {
          transform: translateY(-2px);
        }
        .palette-card.active {
          border-color: #be185d;
          box-shadow: 0 0 0 2px rgba(220, 30, 38, 0.15);
        }
        .palette-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .palette-title {
          font-weight: 700;
          font-size: 0.95rem;
          color: #1e293b;
        }
        .status-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
        }
        .status-badge.active {
          background: #fee2e2;
          color: #be185d;
        }
        .status-badge.inactive {
          background: #f1f5f9;
          color: #64748b;
        }
        .swatch-group {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          height: 36px;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .swatch-item {
          height: 100%;
          position: relative;
        }
        .swatch-item:hover::after {
          content: attr(data-color);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: #fff;
          font-size: 0.65rem;
          padding: 4px 6px;
          border-radius: 4px;
          white-space: nowrap;
          z-index: 10;
        }
        .palette-actions {
          display: flex;
          gap: 10px;
        }
        .btn-activate {
          flex: 1;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 8px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-activate:hover {
          background: #e2e8f0;
        }
        .palette-card.active .btn-activate {
          background: #be185d;
          color: #fff;
          border-color: #be185d;
        }
        .btn-delete-palette {
          background: #fff;
          border: 1px solid #fee2e2;
          color: #ef4444;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-delete-palette:hover {
          background: #fee2e2;
        }
        
        .theme-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #cbd5e1;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .theme-list-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          position: relative;
        }
        .btn-clear-filter {
          background-color: #0284c7;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
        }
        .btn-clear-filter:hover {
          background-color: #0369a1;
        }
        .search-by-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          position: relative;
        }
        .search-badge {
          position: absolute;
          top: -12px;
          left: 20px;
          background-color: #be185d;
          color: #ffffff;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .search-form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .search-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 300px;
        }
        .search-form-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: #334155;
        }
        .search-select-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
          background-color: #e0f2fe;
          font-size: 0.88rem;
          color: #0f172a;
          cursor: pointer;
        }
        .btn-search-theme {
          background: #ffffff;
          color: #0f172a;
          border: 2px solid #f59e0b;
          padding: 8px 30px;
          font-weight: 800;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          margin: 0 auto;
          display: block;
          transition: all 0.2s;
        }
        .btn-search-theme:hover {
          background: #be185d;
          border-color: #be185d;
          color: #ffffff;
        }
        body .admin-skyline-bg {
          display: none !important;
        }
      `}</style>

      
      <div className="theme-list-header">
        <span className="theme-list-title">Theme List</span>
        <button type="button" className="btn-clear-filter" onClick={handleClearFilter}>
          &times; Clear Filter
        </button>
      </div>

      <div className="search-by-panel">
        <span className="search-badge">Search By</span>
        <form onSubmit={handleSearch}>
          <div className="search-form-row">
            <div className="search-form-group">
              <label className="search-form-label">Module</label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="search-select-input"
              >
                <option value="">--Select--</option>
                <option value="B2C">B2C</option>
              </select>
            </div>

            <div className="search-form-group">
              <label className="search-form-label">Name</label>
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                className="search-select-input"
              >
                <option value="">--Select--</option>
                <option value="FlightSearchLoader">FlightSearchLoader</option>
                <option value="HotelSearchLoader">HotelSearchLoader</option>
                <option value="BusSearchLoader">BusSearchLoader</option>
                <option value="FlightResult">FlightResult</option>
                <option value="HolidayDetail">HolidayDetail</option>
                <option value="FlightPaxEntry">FlightPaxEntry</option>
                <option value="HolidayList">HolidayList</option>
                <option value="HotelVoucher">HotelVoucher</option>
                <option value="Authentication">Authentication</option>
                <option value="OfferDetail">OfferDetail</option>
                <option value="OfferList">OfferList</option>
                <option value="HotelResult">HotelResult</option>
                <option value="HotelDetail">HotelDetail</option>
                <option value="TestimonialList">TestimonialList</option>
                <option value="ContactUs">ContactUs</option>
                <option value="InsuranceSearchLoader">InsuranceSearchLoader</option>
                <option value="FlightTicket">FlightTicket</option>
                <option value="UserProfile">UserProfile</option>
                <option value="InsuranceResult">InsuranceResult</option>
                <option value="BlogList">BlogList</option>
                <option value="BlogDetail">BlogDetail</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-search-theme">
            SEARCH
          </button>
        </form>
      </div>

      <div className="theme-builder-grid">
        {/* Left Column: Form */}
        <div className="theme-card-box">
          <h3>Create Branding Palette</h3>
          <form onSubmit={handleCreateTheme}>
            <div className="form-group">
              <label>Palette Name</label>
              <input
                type="text"
                placeholder="e.g. Cobalt Sky, Retro Gold"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Primary Brand Color</label>
              <div className="color-picker-row">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Primary Hover Color</label>
              <div className="color-picker-row">
                <input type="color" value={primaryStrongColor} onChange={(e) => setPrimaryStrongColor(e.target.value)} />
                <input type="text" value={primaryStrongColor} onChange={(e) => setPrimaryStrongColor(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Global Page Background</label>
              <div className="color-picker-row">
                <input type="color" value={pageBgColor} onChange={(e) => setPageBgColor(e.target.value)} />
                <input type="text" value={pageBgColor} onChange={(e) => setPageBgColor(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Surface/Card Background</label>
              <div className="color-picker-row">
                <input type="color" value={surfaceColor} onChange={(e) => setSurfaceColor(e.target.value)} />
                <input type="text" value={surfaceColor} onChange={(e) => setSurfaceColor(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Text Color</label>
              <div className="color-picker-row">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                <input type="text" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Border Color</label>
              <div className="color-picker-row">
                <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} />
                <input type="text" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="btn-theme-submit" disabled={saving}>
              {saving ? "Saving Palette..." : "Add Theme Palette"}
            </button>
          </form>
        </div>

        {/* Right Column: List */}
        <div className="theme-card-box" style={{ minHeight: "400px" }}>
          <h3>Existing Brand Palettes</h3>
          {loading ? (
            <p>Loading palettes...</p>
          ) : error && themes.length === 0 ? (
            <p className="text-danger">{error}</p>
          ) : (
            <div className="theme-palette-list">
              {themes.map((t) => (
                <div key={t.id} className={`palette-card ${t.isActive ? "active" : ""}`}>
                  <div className="palette-header">
                    <span className="palette-title">{t.name}</span>
                    <span className={`status-badge ${t.isActive ? "active" : "inactive"}`}>
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="swatch-group">
                    <div className="swatch-item" style={{ background: t.primaryColor }} data-color={t.primaryColor} />
                    <div className="swatch-item" style={{ background: t.primaryStrongColor }} data-color={t.primaryStrongColor} />
                    <div className="swatch-item" style={{ background: t.pageBgColor }} data-color={t.pageBgColor} />
                    <div className="swatch-item" style={{ background: t.surfaceColor }} data-color={t.surfaceColor} />
                    <div className="swatch-item" style={{ background: t.textColor }} data-color={t.textColor} />
                    <div className="swatch-item" style={{ background: t.borderColor }} data-color={t.borderColor} />
                  </div>

                  <div className="palette-actions">
                    <button
                      className="btn-activate"
                      disabled={t.isActive}
                      onClick={() => handleActivate(t.id)}
                    >
                      {t.isActive ? "Selected" : "Activate Theme"}
                    </button>
                    {!t.isActive && (
                      <button className="btn-delete-palette" onClick={() => handleDelete(t.id)}>
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

