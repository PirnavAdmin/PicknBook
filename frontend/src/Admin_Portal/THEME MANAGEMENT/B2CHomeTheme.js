import React, { useEffect, useState } from "react";
import { FaGripVertical, FaPlus, FaCheck, FaTimes, FaSpinner, FaEye, FaEdit, FaTrashAlt } from "react-icons/fa";
import { getHomeTheme, updateHomeTheme } from "../../services/themeService";
import "./B2CHomeTheme.css";

// Premium Homepage theme templates starts empty to allow manual entries
const INITIAL_THEME_TEMPLATES = [];

const INITIAL_SECTIONS = [
  { id: "hero", title: "Hero Banner", desc: "Main slider banner with search form", icon: "🌅", enabled: true },
  { id: "why-us", title: "Why Choose Us", desc: "Why choose us section with features", icon: "⭐", enabled: true },
  { id: "destinations", title: "Top Destinations", desc: "Popular destinations grid", icon: "📍", enabled: true },
  { id: "packages", title: "Popular Packages", desc: "Best selling packages", icon: "🎁", enabled: true },
  { id: "offers", title: "Exclusive Offers", desc: "Top special offers catalog", icon: "🏷️", enabled: false },
  { id: "testimonials", title: "Testimonials", desc: "Customer reviews and testimonials", icon: "💬", enabled: true },
  { id: "newsletter", title: "Newsletter", desc: "Newsletter subscription section", icon: "✉️", enabled: true },
  { id: "blog", title: "Blog", desc: "Latest travel news and articles", icon: "📰", enabled: false },
];

export default function B2CHomeTheme() {
  const [themes, setThemes] = useState([]);
  const [activeThemeId, setActiveThemeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  // Custom Home Sections state
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  
  // Sidebar tab state
  const [activeTab, setActiveTab] = useState("General");
  
  // Selected Theme Edit Form State (populates from card selection)
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [formName, setFormName] = useState("");
  const [formLayoutStyle, setFormLayoutStyle] = useState("Modern");
  const [formWidth, setFormWidth] = useState("Full Width");
  const [formPrimaryColor, setFormPrimaryColor] = useState("#c2105b");
  const [formSecondaryColor, setFormSecondaryColor] = useState("#ffc107");
  const [formStatus, setFormStatus] = useState("Active");
  const [showPreviewModal, setShowPreviewModal] = useState(null);

  // SEO settings states
  const [seoTitle, setSeoTitle] = useState("Best Travel Booking Website | PickNBook");
  const [seoDesc, setSeoDesc] = useState("PickNBook offers the best travel packages, hotel bookings, flight tickets and holiday experiences.");
  const [seoKeywords, setSeoKeywords] = useState("travel, booking, hotels, flights, packages, holidays");
  const [seoCanonical, setSeoCanonical] = useState("https://picknbook.com/");
  const [seoRobots, setSeoRobots] = useState("Index, Follow");

  const [heroFile, setHeroFile] = useState(null);
  // Images list states
  const [imagesList, setImagesList] = useState([
    { id: "hero", title: "Hero Banner", size: "1920 x 800 px", imgUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80" },
    { id: "destinations", title: "Top Destinations", size: "800 x 600 px", imgUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=100&q=80" },
    { id: "why-us", title: "Why Choose Us", size: "600 x 600 px", imgUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=100&q=80" },
    { id: "packages", title: "Popular Packages", size: "800 x 600 px", imgUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=100&q=80" },
    { id: "offers", title: "Exclusive Offers", size: "800 x 600 px", imgUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80" },
  ]);

  // Load configs on start
  const loadHomeConfig = async () => {
    setLoading(true);
    try {
      const activeObj = await getHomeTheme();
      if (activeObj && activeObj.id) {
        setActiveThemeId(activeObj.id);
      }
    } catch (err) {
      const activeFallback = JSON.parse(localStorage.getItem("admin_fallback_home") || "null");
      if (activeFallback) {
        setActiveThemeId(activeFallback.id);
      }
    }

    const savedTemplates = localStorage.getItem("admin_b2c_home_catalog_templates");
    let currentTemplates = INITIAL_THEME_TEMPLATES;
    if (savedTemplates) {
      currentTemplates = JSON.parse(savedTemplates);
    }
    setThemes(currentTemplates);

    if (currentTemplates.length > 0) {
      const initialSelect = currentTemplates.find(t => t.id === activeThemeId) || currentTemplates[0];
      populateSidebar(initialSelect);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHomeConfig();
  }, []);

  const populateSidebar = (theme) => {
    setSelectedTheme(theme);
    setFormName(theme.name);
    setFormLayoutStyle(theme.layoutStyle);
    setFormWidth(theme.themeWidth);
    setFormPrimaryColor(theme.primaryColor);
    setFormSecondaryColor(theme.secondaryColor);
    setFormStatus(theme.status || "Active");
  };

  const handleAddNewThemeClick = () => {
    const newThemeId = `theme-${Date.now()}`;
    const newTheme = {
      id: newThemeId,
      name: "New Custom Theme",
      layoutStyle: "Modern",
      themeWidth: "Full Width",
      primaryColor: "#c2105b",
      secondaryColor: "#ffc107",
      status: "Active",
      isNew: true
    };
    populateSidebar(newTheme);
    setActiveTab("General");
  };

  const handleDeleteTheme = (id) => {
    if (id === activeThemeId) {
      alert("Cannot delete the currently applied theme.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this theme?")) {
      const updated = themes.filter(t => t.id !== id);
      localStorage.setItem("admin_b2c_home_catalog_templates", JSON.stringify(updated));
      setThemes(updated);
      if (selectedTheme?.id === id) {
        if (updated.length > 0) {
          populateSidebar(updated[0]);
        } else {
          setSelectedTheme(null);
        }
      }
    }
  };

  // Sidebar controls
  const handleSaveSidebarChanges = (e) => {
    if (e) e.preventDefault();
    if (!selectedTheme) return;

    let updated;
    if (selectedTheme.isNew) {
      const newTheme = {
        id: selectedTheme.id,
        name: formName || "Untitled Theme",
        layoutStyle: formLayoutStyle,
        themeWidth: formWidth,
        primaryColor: formPrimaryColor,
        secondaryColor: formSecondaryColor,
        status: formStatus,
        createdOn: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        lastUpdated: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        version: "1.0",
        heroTitle: "EXPLORE THE WORLD",
        heroSubtitle: "Find Your Next Adventure",
        heroOverlayColor: "rgba(16, 30, 35, 0.65)",
        searchCardStyle: "glassmorphic",
        backgroundImageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
      };
      updated = [...themes, newTheme];
      setSelectedTheme(newTheme);
    } else {
      updated = themes.map((t) =>
        t.id === selectedTheme.id
          ? {
              ...t,
              name: formName,
              layoutStyle: formLayoutStyle,
              themeWidth: formWidth,
              primaryColor: formPrimaryColor,
              secondaryColor: formSecondaryColor,
              status: formStatus,
              lastUpdated: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            }
          : t
      );
      const freshlyUpdated = updated.find(t => t.id === selectedTheme.id);
      setSelectedTheme(freshlyUpdated);

      if (selectedTheme.id === activeThemeId) {
        applyThemeToClient(freshlyUpdated);
      }
    }

    localStorage.setItem("admin_b2c_home_catalog_templates", JSON.stringify(updated));
    setThemes(updated);
    alert("Theme saved successfully!");
  };

  const handleSaveImages = async () => {
    if (!selectedTheme) {
      alert("No theme selected to save images for.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("id", selectedTheme.id);
      formData.append("heroTitle", selectedTheme.heroTitle || "EXPLORE THE WORLD");
      formData.append("heroSubtitle", selectedTheme.heroSubtitle || "Find Your Next Adventure");
      formData.append("heroOverlayColor", selectedTheme.heroOverlayColor || "rgba(16, 30, 35, 0.65)");
      formData.append("searchCardStyle", selectedTheme.searchCardStyle || "glassmorphic");
      formData.append("backgroundImageUrl", selectedTheme.backgroundImageUrl || "");
      formData.append("bgImageUrl", selectedTheme.backgroundImageUrl || "");
      if (heroFile) {
        formData.append("BackgroundImageFile", heroFile);
        formData.append("BgImageFile", heroFile);
      }
      await updateHomeTheme(formData);
      // Also apply locally to sync client side preview/realtime changes
      applyThemeToClient(selectedTheme);
      alert("Images saved to server successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save images to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSidebar = () => {
    if (selectedTheme) {
      populateSidebar(selectedTheme);
    }
  };

  const handleSelectThemeCard = (theme) => {
    populateSidebar(theme);
    setActiveTab("General");
  };

  const handleApplyTheme = async (theme) => {
    if (theme.status === "Inactive") {
      alert("Cannot apply an Inactive theme. Please toggle status to Active first.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("id", theme.id);
      formData.append("heroTitle", theme.heroTitle || "EXPLORE THE WORLD");
      formData.append("heroSubtitle", theme.heroSubtitle || "Find Your Next Adventure");
      formData.append("heroOverlayColor", theme.heroOverlayColor || "rgba(16, 30, 35, 0.65)");
      formData.append("searchCardStyle", theme.searchCardStyle || "glassmorphic");
      formData.append("backgroundImageUrl", theme.backgroundImageUrl || "");
      formData.append("bgImageUrl", theme.backgroundImageUrl || "");
      if (heroFile) {
        formData.append("BackgroundImageFile", heroFile);
        formData.append("BgImageFile", heroFile);
      }
      await updateHomeTheme(formData);
    } catch (e) {
      console.warn("Backend theme save offline. Selecting on client-side fallback.");
    }
    setActiveThemeId(theme.id);
    applyThemeToClient(theme);
  };

  const applyThemeToClient = (theme) => {
    localStorage.setItem("admin_fallback_home", JSON.stringify(theme));
    
    window.dispatchEvent(new Event("storage"));
  };

  const handleSectionToggle = (id) => {
    setSections(sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleMoveSection = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    setSections(updated);
  };

  // Filters logic
  const filteredThemes = themes.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="b2c-home-dashboard">
      
      {/* Left Column */}
      <div className="b2c-home-main">
        
        {/* Available Themes Catalog */}
        <div className="home-panel-card">
          <div className="panel-header-row">
            <h2 className="panel-title-large">Available Home Page Themes</h2>
            <button
              type="button"
              className="primary-btn"
              onClick={handleAddNewThemeClick}
              style={{ padding: "8px 16px", fontSize: "12px", border: "none", borderRadius: "6px", fontWeight: "700" }}
            >
              <FaPlus style={{ marginRight: "6px" }} /> Add New Theme
            </button>
          </div>

          <div className="filter-bar">
            <input
              type="text"
              placeholder="Search home themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-field"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-select-dropdown"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <FaSpinner className="spinner" style={{ fontSize: "28px", color: "#c2105b" }} />
            </div>
          ) : filteredThemes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: "#64748b", fontSize: "14px", border: "2px dashed #e2e8f0", borderRadius: "8px", background: "#f8fafc" }}>
              No themes found. Click <strong>"Add New Theme"</strong> in the top right to build one manually!
            </div>
          ) : (
            <div className="themes-catalog-grid">
              {filteredThemes.map((theme) => {
                const isActive = theme.id === activeThemeId;
                const isStatusActive = theme.status === "Active";
                return (
                  <div
                    key={theme.id}
                    className="catalog-card"
                    style={{ border: selectedTheme?.id === theme.id ? "2px solid #c2105b" : "1px solid #e2e8f0" }}
                    onClick={() => handleSelectThemeCard(theme)}
                  >
                    <span className={`card-status-badge ${isStatusActive ? "active" : "inactive"}`}>
                      {theme.status}
                    </span>
                    
                    <div className="card-preview-block">
                      <img src={theme.backgroundImageUrl} alt={theme.name} className="card-preview-img" />
                    </div>

                    <div className="card-info-wrap">
                      <div>
                        <h3 className="card-title-text">{theme.name}</h3>
                        <p className="card-layout-label">Layout Style: {theme.layoutStyle}</p>
                      </div>

                      <div className="card-actions-row" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="action-btn-small" onClick={() => setShowPreviewModal(theme)}>
                          Preview
                        </button>
                        <button type="button" className="action-btn-small" onClick={() => handleSelectThemeCard(theme)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="action-btn-small"
                          onClick={() => handleDeleteTheme(theme.id)}
                          style={{ color: "#ef4444", borderColor: "#fecaca" }}
                        >
                          Delete
                        </button>
                        {isActive ? (
                          <button type="button" className="action-btn-small applied-badge">
                            Applied
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="action-btn-small apply-btn"
                            onClick={() => handleApplyTheme(theme)}
                            disabled={!isStatusActive}
                            style={{ opacity: isStatusActive ? 1 : 0.6 }}
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Home Sections Customizer */}
        <div className="home-panel-card">
          <div className="panel-header-row" style={{ marginBottom: "8px" }}>
            <div>
              <h2 className="panel-title-large">Customize Home Sections</h2>
              <p className="panel-subtitle-light">Enable, disable and reorder sections on homepage</p>
            </div>
            <button type="button" className="primary-btn" style={{ padding: "8px 16px", fontSize: "12px", border: "none", borderRadius: "6px", fontWeight: "700" }}>
              Reorder Sections
            </button>
          </div>

          <div className="sections-list-group">
            {sections.map((section, index) => (
              <div key={section.id} className="section-item-row">
                <div className="section-item-left">
                  <FaGripVertical className="drag-handle-icon" />
                  <div className="section-icon-wrap">
                    <span style={{ fontSize: "18px" }}>{section.icon}</span>
                  </div>
                  <div className="section-details">
                    <span className="section-title">{section.title}</span>
                    <span className="section-desc">{section.desc}</span>
                  </div>
                </div>

                <div className="section-item-right">
                  <button
                    type="button"
                    onClick={() => handleMoveSection(index, -1)}
                    disabled={index === 0}
                    className="reorder-arrow-btn"
                    style={{ marginRight: "4px" }}
                    title="Move Up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveSection(index, 1)}
                    disabled={index === sections.length - 1}
                    className="reorder-arrow-btn"
                    style={{ marginRight: "12px" }}
                    title="Move Down"
                  >
                    ▼
                  </button>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={section.enabled}
                      onChange={() => handleSectionToggle(section.id)}
                    />
                    <span className="slider-knob"></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Column / Sidebar */}
      <div className="b2c-home-sidebar">
        
        {/* Theme Settings Sidebar Panel */}
        <div className="home-panel-card" style={{ padding: "16px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700" }}>Theme Settings</h3>
          
          <div className="sidebar-tabs">
            {["General", "Sections", "Images", "SEO"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab-btn-item ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "General" && selectedTheme && (
            <form onSubmit={handleSaveSidebarChanges} className="form-input-container">
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="form-label-bold">Theme Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="form-input-text"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="form-label-bold">Layout Style</label>
                <select
                  value={formLayoutStyle}
                  onChange={(e) => setFormLayoutStyle(e.target.value)}
                  className="form-input-select"
                >
                  <option value="Modern">Modern</option>
                  <option value="Classic">Classic</option>
                  <option value="Package Focused">Package Focused</option>
                  <option value="Luxury">Luxury</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="form-label-bold">Theme Width</label>
                <div className="radio-group-wrap">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="themeWidth"
                      value="Full Width"
                      checked={formWidth === "Full Width"}
                      onChange={() => setFormWidth("Full Width")}
                    />
                    Full Width
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="themeWidth"
                      value="Boxed"
                      checked={formWidth === "Boxed"}
                      onChange={() => setFormWidth("Boxed")}
                    />
                    Boxed
                  </label>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="form-label-bold">Primary Color</label>
                  <div className="color-input-block">
                    <input
                      type="color"
                      value={formPrimaryColor}
                      onChange={(e) => setFormPrimaryColor(e.target.value)}
                      className="color-indicator-square"
                    />
                    <input
                      type="text"
                      value={formPrimaryColor}
                      onChange={(e) => setFormPrimaryColor(e.target.value)}
                      className="form-input-text"
                      style={{ width: "100px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="form-label-bold">Secondary Color</label>
                  <div className="color-input-block">
                    <input
                      type="color"
                      value={formSecondaryColor}
                      onChange={(e) => setFormSecondaryColor(e.target.value)}
                      className="color-indicator-square"
                    />
                    <input
                      type="text"
                      value={formSecondaryColor}
                      onChange={(e) => setFormSecondaryColor(e.target.value)}
                      className="form-input-text"
                      style={{ width: "100px" }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
                <label className="form-label-bold">Status</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "600" }}>{formStatus}</span>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={formStatus === "Active"}
                      onChange={() => setFormStatus(formStatus === "Active" ? "Inactive" : "Active")}
                    />
                    <span className="slider-knob"></span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button type="submit" className="primary-btn" style={{ flex: 1, border: "none", padding: "10px", borderRadius: "6px", fontWeight: "700" }}>
                  Save Changes
                </button>
                <button type="button" className="action-btn-small" style={{ flex: 1 }} onClick={handleResetSidebar}>
                  Reset
                </button>
              </div>

            </form>
          )}

          {activeTab === "Sections" && (
            <div>
              <div style={{ marginBottom: "12px" }}>
                <h4 style={{ margin: "0", fontSize: "14px", fontWeight: "700", color: "#c2105b" }}>Sections</h4>
                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#64748b" }}>Enable, disable and reorder sections on homepage</p>
              </div>
              <div className="sidebar-section-list">
                {sections.map((section) => (
                  <div key={section.id} className="sidebar-section-item">
                    <div className="sidebar-section-item-left">
                      <span style={{ fontSize: "16px" }}>{section.icon}</span>
                      <span className="sidebar-section-name">{section.title}</span>
                    </div>
                    <div className="sidebar-section-item-right">
                      <label className="switch-control">
                        <input
                          type="checkbox"
                          checked={section.enabled}
                          onChange={() => handleSectionToggle(section.id)}
                        />
                        <span className="slider-knob"></span>
                      </label>
                      <span className="chevron-down-icon">▼</span>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="reorder-btn-outline" onClick={() => alert("Reorder sections using the up/down arrows in the main list!")}>
                Reorder Sections
              </button>
            </div>
          )}

          {activeTab === "Images" && (
            <div>
              <div style={{ marginBottom: "12px" }}>
                <h4 style={{ margin: "0", fontSize: "14px", fontWeight: "700", color: "#c2105b" }}>Images</h4>
                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#64748b" }}>Manage all homepage images and content</p>
              </div>
              <div className="sidebar-images-list">
                {imagesList.map((item) => (
                  <div key={item.id} className="sidebar-image-item">
                    <div className="sidebar-img-preview-wrap">
                      {item.imgUrl ? (
                        <img src={item.imgUrl} alt={item.title} className="sidebar-img-preview" />
                      ) : (
                        <div style={{ fontSize: "10px", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>Empty</div>
                      )}
                    </div>
                    <div className="sidebar-img-info">
                      <span className="sidebar-img-title">{item.title}</span>
                      <span className="sidebar-img-size">{item.size}</span>
                    </div>
                    <div className="sidebar-image-actions" style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        type="button"
                        className="change-img-btn"
                        style={{ fontSize: "10px", padding: "4px 8px" }}
                        onClick={() => {
                          const newUrl = prompt("Enter new image URL:", item.imgUrl);
                          if (newUrl !== null) {
                            setImagesList(imagesList.map(img => img.id === item.id ? { ...img, imgUrl: newUrl } : img));
                            if (item.id === "hero" && selectedTheme) {
                              const updatedTheme = { ...selectedTheme, backgroundImageUrl: newUrl };
                              setSelectedTheme(updatedTheme);
                              setThemes(themes.map(t => t.id === selectedTheme.id ? updatedTheme : t));
                            }
                          }
                        }}
                      >
                        URL
                      </button>
                      
                      <label className="change-img-btn" style={{ fontSize: "10px", padding: "4px 8px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", display: "inline-block", textAlign: "center" }}>
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              if (item.id === "hero") {
                                setHeroFile(file);
                              }
                              const localUrl = URL.createObjectURL(file);
                              setImagesList(imagesList.map(img => img.id === item.id ? { ...img, imgUrl: localUrl } : img));
                              if (item.id === "hero" && selectedTheme) {
                                const updatedTheme = { ...selectedTheme, backgroundImageUrl: localUrl };
                                setSelectedTheme(updatedTheme);
                                setThemes(themes.map(t => t.id === selectedTheme.id ? updatedTheme : t));
                              }
                            }
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        className="delete-img-btn"
                        style={{ padding: "4px 8px" }}
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the image for ${item.title}?`)) {
                            setImagesList(imagesList.map(img => img.id === item.id ? { ...img, imgUrl: "" } : img));
                            if (item.id === "hero") {
                              setHeroFile(null);
                            }
                          }
                        }}
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="upload-btn-solid"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const title = prompt("Enter image section title:");
                    if (title) {
                      const imgUrl = prompt("Enter image URL:") || "";
                      const newImg = {
                        id: `custom-${Date.now()}`,
                        title,
                        size: "800 x 600 px",
                        imgUrl
                      };
                      setImagesList([...imagesList, newImg]);
                    }
                  }}
                >
                  Upload New Image
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ flex: 1, border: "none", padding: "10px", borderRadius: "6px", fontWeight: "700" }}
                  onClick={handleSaveImages}
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === "SEO" && (
            <div className="seo-form-container">
              <div style={{ marginBottom: "4px" }}>
                <h4 style={{ margin: "0", fontSize: "14px", fontWeight: "700", color: "#c2105b" }}>SEO Settings</h4>
                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#64748b" }}>Optimize homepage for search engines</p>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label className="form-label-bold">Meta Title</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="form-input-text"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label className="form-label-bold">Meta Description</label>
                <textarea
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  className="seo-textarea"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label className="form-label-bold">Meta Keywords</label>
                <input
                  type="text"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  className="form-input-text"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label className="form-label-bold">Canonical URL</label>
                <input
                  type="text"
                  value={seoCanonical}
                  onChange={(e) => setSeoCanonical(e.target.value)}
                  className="form-input-text"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label className="form-label-bold">Robots Meta</label>
                <select
                  value={seoRobots}
                  onChange={(e) => setSeoRobots(e.target.value)}
                  className="form-input-select"
                >
                  <option value="Index, Follow">Index, Follow</option>
                  <option value="Noindex, Nofollow">Noindex, Nofollow</option>
                  <option value="Index, Nofollow">Index, Nofollow</option>
                  <option value="Noindex, Follow">Noindex, Follow</option>
                </select>
              </div>

              <button
                type="button"
                className="save-seo-btn"
                onClick={() => {
                  alert("SEO Settings saved successfully!");
                }}
              >
                Save SEO Settings
              </button>
            </div>
          )}

        </div>

        {/* Live Preview Sidebar Panel */}
        <div className="home-panel-card" style={{ padding: "16px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700" }}>Live Preview</h3>
          
          <div className="live-preview-box">
            {selectedTheme ? (
              <div className="mock-homepage-preview" style={{ backgroundImage: `url(${selectedTheme.backgroundImageUrl})` }}>
                <div className="mock-preview-overlay" style={{ background: selectedTheme.heroOverlayColor }}></div>
                <div className="mock-preview-content">
                  <h4 className="mock-preview-title" style={{ color: formSecondaryColor }}>{selectedTheme.heroTitle}</h4>
                  <p className="mock-preview-subtitle">{selectedTheme.heroSubtitle}</p>
                  
                  <div
                    className="mock-preview-search-card"
                    style={{
                      backgroundColor: formPrimaryColor,
                      color: "#ffffff"
                    }}
                  >
                    Mock Search Widget (Width: {formWidth})
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>
                Select a theme to preview
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", margin: "16px 0 8px 0" }}>
            <button
              type="button"
              onClick={() => setShowPreviewModal(selectedTheme)}
              style={{ background: "none", border: "none", color: "#c2105b", fontSize: "13px", fontWeight: "700", cursor: "pointer", textDecoration: "underline" }}
            >
              View Full Preview
            </button>
          </div>

          {selectedTheme && (
            <table className="info-details-table">
              <tbody>
                <tr>
                  <td className="label-col">Created On</td>
                  <td className="val-col">{selectedTheme.createdOn}</td>
                </tr>
                <tr>
                  <td className="label-col">Last Updated</td>
                  <td className="val-col">{selectedTheme.lastUpdated}</td>
                </tr>
                <tr>
                  <td className="label-col">Applied On</td>
                  <td className="val-col">
                    <a href="https://picknbook.com" target="_blank" rel="noreferrer" style={{ color: "#c2105b" }}>
                      https://picknbook.com
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="label-col">Version</td>
                  <td className="val-col">{selectedTheme.version}</td>
                </tr>
              </tbody>
            </table>
          )}

        </div>

      </div>

      {/* Full Preview Modal */}
      {showPreviewModal && (
        <div className="theme-modal-overlay" onClick={() => setShowPreviewModal(null)}>
          <div className="theme-modal" style={{ maxWidth: "750px" }} onClick={(e) => e.stopPropagation()}>
            <div className="theme-modal-header">
              <span>Preview details: {showPreviewModal.name}</span>
              <button type="button" onClick={() => setShowPreviewModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}><FaTimes /></button>
            </div>
            <div className="theme-modal-body" style={{ padding: "20px" }}>
              <div style={{
                position: "relative",
                height: "280px",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundImage: `url(${showPreviewModal.backgroundImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "24px",
                color: "#ffffff"
              }}>
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: showPreviewModal.heroOverlayColor,
                  zIndex: 1
                }}></div>

                <div style={{ position: "relative", zIndex: 2, maxWidth: "85%" }}>
                  <span style={{ fontSize: "11px", background: showPreviewModal.status === "Active" ? "#16a34a" : "#64748b", padding: "4px 8px", borderRadius: "4px", textTransform: "uppercase", fontWeight: "700" }}>
                    {showPreviewModal.status}
                  </span>
                  <h1 style={{ margin: "12px 0 6px 0", fontSize: "28px", fontWeight: "800", color: formSecondaryColor }}>{showPreviewModal.heroTitle}</h1>
                  <p style={{ margin: 0, fontSize: "14px", opacity: 0.95 }}>{showPreviewModal.heroSubtitle}</p>
                  
                  <div style={{
                    marginTop: "24px",
                    padding: "12px 20px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "700",
                    width: "fit-content",
                    backgroundColor: formPrimaryColor,
                    color: "#ffffff"
                  }}>
                    Mock Search Widget (Style: {showPreviewModal.searchCardStyle})
                  </div>
                </div>
              </div>
            </div>
            <div className="theme-modal-footer">
              <button type="button" onClick={() => setShowPreviewModal(null)} className="primary-btn" style={{ padding: "8px 20px", border: "none", borderRadius: "4px" }}>Close Preview</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
