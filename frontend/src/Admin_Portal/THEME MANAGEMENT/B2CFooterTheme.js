import React, { useEffect, useState } from "react";
import { FaTrashAlt, FaEdit, FaPlus, FaCheck, FaTimes, FaSpinner, FaEye } from "react-icons/fa";
import { Search, Heart } from "lucide-react";
import { getActiveLayout, updateFooterConfig } from "../../services/themeService";

// Default template styles and items
const INITIAL_FOOTER_TEMPLATES = [
  {
    id: "modern-dark",
    name: "Modern Dark Footer",
    status: "Active",
    layout: "4 Columns",
    width: "Full Width",
    columns: [
      { id: "col-1", title: "Company", items: ["About Us", "Careers", "Blog", "Press", "Contact Us"] },
      { id: "col-2", title: "Quick Links", items: ["Home", "Packages", "Destinations", "Hotels", "Flights"] },
      { id: "col-3", title: "Support", items: ["Help Center", "Terms & Conditions", "Privacy Policy", "Refund Policy", "FAQ"] },
      { id: "col-4", title: "Newsletter", desc: "Subscribe to get updates and exclusive offers" }
    ],
    columnAlignment: "left",
    bottomBar: {
      enable: true,
      copyrightText: "© 2024 PickNBook. All Rights Reserved.",
      paymentIcons: true,
      textAlignment: "center"
    },
    socialLinks: [
      { id: "s-1", platform: "Facebook", url: "https://facebook.com/picknbook" },
      { id: "s-2", platform: "Twitter", url: "https://twitter.com/picknbook" },
      { id: "s-3", platform: "Instagram", url: "https://instagram.com/picknbook" },
      { id: "s-4", platform: "YouTube", url: "https://youtube.com/picknbook" },
      { id: "s-5", platform: "LinkedIn", url: "https://linkedin.com/company/picknbook" }
    ],
    styles: {
      bgColor: "#1A1A1A",
      textColor: "#FFFFFF",
      headingColor: "#FFC107",
      linkHoverColor: "#FF4081",
      borderColor: "#333333",
      dividerStyle: "Solid"
    }
  },
  {
    id: "light-minimal",
    name: "Light Footer",
    status: "Inactive",
    layout: "3 Columns",
    width: "Full Width",
    columns: [
      { id: "col-1", title: "About Us", items: ["Our Story", "Careers", "Press"] },
      { id: "col-2", title: "Quick Links", items: ["Flights", "Hotels", "Buses", "Offers"] },
      { id: "col-3", title: "Contact", items: ["support@picknbook.com", "+1 (800) 123-4567"] }
    ],
    columnAlignment: "left",
    bottomBar: {
      enable: true,
      copyrightText: "© 2024 PickNBook. All Rights Reserved.",
      paymentIcons: true,
      textAlignment: "left"
    },
    socialLinks: [
      { id: "s-1", platform: "Facebook", url: "https://facebook.com/picknbook" },
      { id: "s-2", platform: "Twitter", url: "https://twitter.com/picknbook" }
    ],
    styles: {
      bgColor: "#F8FAFC",
      textColor: "#475569",
      headingColor: "#0F172A",
      linkHoverColor: "#c2105b",
      borderColor: "#E2E8F0",
      dividerStyle: "Solid"
    }
  },
  {
    id: "transparent",
    name: "Transparent Footer",
    status: "Inactive",
    layout: "4 Columns",
    width: "Boxed",
    columns: [
      { id: "col-1", title: "Company", items: ["About", "Careers", "Contact"] },
      { id: "col-2", title: "Legal", items: ["Privacy", "Terms", "Refunds"] },
      { id: "col-3", title: "Support", items: ["Help Desk", "FAQs"] },
      { id: "col-4", title: "Newsletter", desc: "Get special promo offers" }
    ],
    columnAlignment: "center",
    bottomBar: {
      enable: true,
      copyrightText: "© 2024 PickNBook. All Rights Reserved.",
      paymentIcons: false,
      textAlignment: "center"
    },
    socialLinks: [
      { id: "s-1", platform: "Instagram", url: "https://instagram.com/picknbook" }
    ],
    styles: {
      bgColor: "transparent",
      textColor: "#64748B",
      headingColor: "#0F172A",
      linkHoverColor: "#c2105b",
      borderColor: "#F1F5F9",
      dividerStyle: "None"
    }
  },
  {
    id: "classic-red",
    name: "Red Footer",
    status: "Inactive",
    layout: "4 Columns",
    width: "Full Width",
    columns: [
      { id: "col-1", title: "Company", items: ["About Us", "Careers", "Blog", "Contact Us"] },
      { id: "col-2", title: "Quick Links", items: ["Home", "Packages", "Destinations", "Hotels"] },
      { id: "col-3", title: "Support", items: ["Help Center", "Privacy Policy", "Refund Policy", "FAQ"] },
      { id: "col-4", title: "Newsletter", desc: "Subscribe to get updates and exclusive offers" }
    ],
    columnAlignment: "left",
    bottomBar: {
      enable: true,
      copyrightText: "© 2024 PickNBook. All Rights Reserved.",
      paymentIcons: true,
      textAlignment: "center"
    },
    socialLinks: [
      { id: "s-1", platform: "Facebook", url: "https://facebook.com/picknbook" },
      { id: "s-2", platform: "Twitter", url: "https://twitter.com/picknbook" },
      { id: "s-3", platform: "Instagram", url: "https://instagram.com/picknbook" }
    ],
    styles: {
      bgColor: "#A20D45",
      textColor: "#FAD4D8",
      headingColor: "#FFFFFF",
      linkHoverColor: "#FFC107",
      borderColor: "#800530",
      dividerStyle: "Solid"
    }
  }
];

export default function B2CFooterTheme() {
  const [themes, setThemes] = useState([]);
  const [activeThemeId, setActiveThemeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Selection states
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [activeTab, setActiveTab] = useState("General");

  // Form Field States (Populated from selectedTheme)
  const [formName, setFormName] = useState("");
  const [formLayout, setFormLayout] = useState("4 Columns");
  const [formWidth, setFormWidth] = useState("Full Width");
  const [formStatus, setFormStatus] = useState("Inactive");

  // Columns Tab States
  const [columnsList, setColumnsList] = useState([]);
  const [columnAlignment, setColumnAlignment] = useState("left");

  // Bottom Bar Tab States
  const [enableBottomBar, setEnableBottomBar] = useState(true);
  const [copyrightText, setCopyrightText] = useState("");
  const [paymentIcons, setPaymentIcons] = useState(true);
  const [bottomBarAlignment, setBottomBarAlignment] = useState("center");

  // Social Links Tab States
  const [socialLinks, setSocialLinks] = useState([]);

  // Style Tab States
  const [styleBgColor, setStyleBgColor] = useState("#1A1A1A");
  const [styleTextColor, setStyleTextColor] = useState("#FFFFFF");
  const [styleHeadingColor, setStyleHeadingColor] = useState("#FFC107");
  const [styleLinkHoverColor, setStyleLinkHoverColor] = useState("#FF4081");
  const [styleBorderColor, setStyleBorderColor] = useState("#333333");
  const [styleDividerStyle, setStyleDividerStyle] = useState("Solid");

  // Fetch / Load themes catalog
  const loadThemesCatalog = async () => {
    setLoading(true);
    try {
      // Fetch layout config from backend
      const layout = await getActiveLayout();
      let activeId = "modern-dark";
      if (layout && layout.footer && layout.footer.activeThemeId) {
        activeId = layout.footer.activeThemeId;
      }
      setActiveThemeId(activeId);

      // Load templates from local storage or default
      const savedTemplates = localStorage.getItem("admin_b2c_footer_templates");
      let list = INITIAL_FOOTER_TEMPLATES;
      if (savedTemplates) {
        list = JSON.parse(savedTemplates);
      }
      
      // Ensure one theme is active status
      const updatedList = list.map(t => ({
        ...t,
        status: t.id === activeId ? "Active" : "Inactive"
      }));
      setThemes(updatedList);
      localStorage.setItem("admin_b2c_footer_templates", JSON.stringify(updatedList));

      // Populate form editor with active or first theme
      const initialTheme = updatedList.find(t => t.id === activeId) || updatedList[0];
      populateForm(initialTheme);

    } catch (err) {
      console.error("Failed to load footer themes catalog:", err);
      // Fallback
      setThemes(INITIAL_FOOTER_TEMPLATES);
      populateForm(INITIAL_FOOTER_TEMPLATES[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThemesCatalog();
  }, []);

  // Populate editor form state
  const populateForm = (theme) => {
    if (!theme) return;
    setSelectedTheme(theme);
    setFormName(theme.name);
    setFormLayout(theme.layout);
    setFormWidth(theme.width);
    setFormStatus(theme.status || "Inactive");

    setColumnsList(theme.columns || []);
    setColumnAlignment(theme.columnAlignment || "left");

    setEnableBottomBar(theme.bottomBar?.enable ?? true);
    setCopyrightText(theme.bottomBar?.copyrightText || "");
    setPaymentIcons(theme.bottomBar?.paymentIcons ?? true);
    setBottomBarAlignment(theme.bottomBar?.textAlignment || "center");

    setSocialLinks(theme.socialLinks || []);

    setStyleBgColor(theme.styles?.bgColor || "#1A1A1A");
    setStyleTextColor(theme.styles?.textColor || "#FFFFFF");
    setStyleHeadingColor(theme.styles?.headingColor || "#FFC107");
    setStyleLinkHoverColor(theme.styles?.linkHoverColor || "#FF4081");
    setStyleBorderColor(theme.styles?.borderColor || "#333333");
    setStyleDividerStyle(theme.styles?.dividerStyle || "Solid");
  };

  const handleSelectTheme = (theme) => {
    populateForm(theme);
  };

  const handleAddNewTheme = () => {
    const newThemeId = `footer-${Date.now()}`;
    const newTheme = {
      id: newThemeId,
      name: "New Custom Footer",
      status: "Inactive",
      layout: "4 Columns",
      width: "Full Width",
      columns: [
        { id: "col-1", title: "Quick Links", items: ["Home", "Services", "Contact"] }
      ],
      columnAlignment: "left",
      bottomBar: {
        enable: true,
        copyrightText: "© 2024 PickNBook. All Rights Reserved.",
        paymentIcons: true,
        textAlignment: "center"
      },
      socialLinks: [
        { id: "s-1", platform: "Facebook", url: "https://facebook.com" }
      ],
      styles: {
        bgColor: "#1E293B",
        textColor: "#E2E8F0",
        headingColor: "#38BDF8",
        linkHoverColor: "#F43F5E",
        borderColor: "#334155",
        dividerStyle: "Solid"
      },
      isNew: true
    };

    setThemes([...themes, newTheme]);
    populateForm(newTheme);
  };

  const handleDeleteTheme = (id, e) => {
    e.stopPropagation();
    if (id === activeThemeId) {
      alert("Cannot delete the currently applied footer theme.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this footer template?")) {
      const updated = themes.filter(t => t.id !== id);
      setThemes(updated);
      localStorage.setItem("admin_b2c_footer_templates", JSON.stringify(updated));
      if (selectedTheme?.id === id) {
        populateForm(updated[0]);
      }
    }
  };

  const handleStatusToggle = (checked) => {
    setFormStatus(checked ? "Active" : "Inactive");
  };

  // Sync state back to current editing theme preview block
  const getUpdatedThemeObject = () => {
    if (!selectedTheme) return null;
    return {
      ...selectedTheme,
      name: formName,
      layout: formLayout,
      width: formWidth,
      status: formStatus,
      columns: columnsList,
      columnAlignment,
      bottomBar: {
        enable: enableBottomBar,
        copyrightText,
        paymentIcons,
        textAlignment: bottomBarAlignment
      },
      socialLinks,
      styles: {
        bgColor: styleBgColor,
        textColor: styleTextColor,
        headingColor: styleHeadingColor,
        linkHoverColor: styleLinkHoverColor,
        borderColor: styleBorderColor,
        dividerStyle: styleDividerStyle
      }
    };
  };

  const handleSaveChanges = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTheme) return;

    setSaving(true);
    const updatedTheme = getUpdatedThemeObject();

    try {
      // Save theme list state in local storage
      const updatedList = themes.map(t => {
        if (t.id === selectedTheme.id) {
          return updatedTheme;
        }
        // If this one is set to active, make all other themes inactive status
        if (formStatus === "Active" && t.id !== selectedTheme.id) {
          return { ...t, status: "Inactive" };
        }
        return t;
      });

      setThemes(updatedList);
      localStorage.setItem("admin_b2c_footer_templates", JSON.stringify(updatedList));
      setSelectedTheme(updatedTheme);

      if (formStatus === "Active") {
        setActiveThemeId(selectedTheme.id);
        
        // Save to backend database via existing API config update call
        const formData = new FormData();
        formData.append("BgColor", styleBgColor);
        formData.append("GradientCss", styleBgColor);
        formData.append("TextColor", styleTextColor);
        formData.append("SocialIconColor", styleHeadingColor);
        formData.append("CopyrightText", copyrightText);
        formData.append("activeThemeId", selectedTheme.id);
        await updateFooterConfig(formData);

        // Sync local storage client layouts
        const cached = localStorage.getItem("b2c_layout_config");
        const parsed = cached ? JSON.parse(cached) : {};
        parsed.footer = {
          ...parsed.footer,
          bgColor: styleBgColor,
          gradientCss: styleBgColor,
          textColor: styleTextColor,
          socialIconColor: styleHeadingColor,
          copyrightText: copyrightText,
          activeThemeId: selectedTheme.id,
          themeObject: updatedTheme
        };
        localStorage.setItem("b2c_layout_config", JSON.stringify(parsed));
      }

      alert("Footer configuration saved successfully!");
    } catch (err) {
      console.error("Error saving footer config:", err);
      alert("Failed to save changes to the backend. Saved locally.");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTheme = async (theme) => {
    setSaving(true);
    try {
      const updatedList = themes.map(t => ({
        ...t,
        status: t.id === theme.id ? "Active" : "Inactive"
      }));
      setThemes(updatedList);
      localStorage.setItem("admin_b2c_footer_templates", JSON.stringify(updatedList));
      setActiveThemeId(theme.id);

      // Save to backend database via existing API config update call
      const formData = new FormData();
      formData.append("BgColor", theme.styles.bgColor);
      formData.append("GradientCss", theme.styles.bgColor);
      formData.append("TextColor", theme.styles.textColor);
      formData.append("SocialIconColor", theme.styles.headingColor);
      formData.append("CopyrightText", theme.bottomBar.copyrightText);
      formData.append("activeThemeId", theme.id);
      await updateFooterConfig(formData);

      // Sync local storage client layouts
      const cached = localStorage.getItem("b2c_layout_config");
      const parsed = cached ? JSON.parse(cached) : {};
      parsed.footer = {
        bgColor: theme.styles.bgColor,
        gradientCss: theme.styles.bgColor,
        textColor: theme.styles.textColor,
        socialIconColor: theme.styles.headingColor,
        copyrightText: theme.bottomBar.copyrightText,
        activeThemeId: theme.id,
        themeObject: theme
      };
      localStorage.setItem("b2c_layout_config", JSON.stringify(parsed));

      if (selectedTheme?.id === theme.id) {
        setFormStatus("Active");
      }

      alert("Footer theme applied successfully!");
    } catch (err) {
      console.error(err);
      alert("Applied locally, but failed to sync backend.");
    } finally {
      setSaving(false);
    }
  };

  // Helper actions inside tabs
  const handleAddColumn = () => {
    const newColId = `col-${Date.now()}`;
    const newCol = { id: newColId, title: "New Column", items: ["Link 1", "Link 2"] };
    setColumnsList([...columnsList, newCol]);
  };

  const handleRemoveColumn = (id) => {
    setColumnsList(columnsList.filter(c => c.id !== id));
  };

  const handleEditColumnTitle = (id, newTitle) => {
    setColumnsList(columnsList.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const handleEditColumnItems = (id, itemsString) => {
    const items = itemsString.split(",").map(i => i.trim()).filter(Boolean);
    setColumnsList(columnsList.map(c => c.id === id ? { ...c, items } : c));
  };

  const handleAddSocialLink = () => {
    const newSocId = `s-${Date.now()}`;
    const newSoc = { id: newSocId, platform: "Facebook", url: "https://facebook.com" };
    setSocialLinks([...socialLinks, newSoc]);
  };

  const handleRemoveSocialLink = (id) => {
    setSocialLinks(socialLinks.filter(s => s.id !== id));
  };

  const handleEditSocialLink = (id, key, val) => {
    setSocialLinks(socialLinks.map(s => s.id === id ? { ...s, [key]: val } : s));
  };

  const livePreviewTheme = getUpdatedThemeObject();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "100px 0" }}>
        <FaSpinner className="spinner" style={{ fontSize: "38px", color: "#c2105b" }} />
      </div>
    );
  }

  // Filter logic
  const filteredThemes = themes.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="b2c-footer-dashboard">
      <style>{`
        .b2c-footer-dashboard {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          font-family: 'Inter', sans-serif;
          background-color: #f8fafc;
          min-height: 100vh;
        }
        .dashboard-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-title-section h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
        }
        .header-title-section p {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: #64748b;
        }
        .dashboard-grid-layout {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 1200px) {
          .dashboard-grid-layout {
            grid-template-columns: 1fr;
          }
        }
        .panel-card-box {
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .catalog-themes-row-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }
        .footer-theme-catalog-card {
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .footer-theme-catalog-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .status-badge-top {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .status-badge-top.active {
          background-color: #dcfce7;
          color: #15803d;
        }
        .status-badge-top.inactive {
          background-color: #f1f5f9;
          color: #64748b;
        }
        .card-visual-img {
          height: 100px;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 24px;
          font-weight: 800;
        }
        .card-details-info {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .card-title-lbl {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .card-desc-lbl {
          font-size: 11px;
          color: #64748b;
          margin: 0;
        }
        .card-action-btns {
          display: flex;
          gap: 6px;
          margin-top: auto;
        }
        .btn-theme-card-small {
          flex: 1;
          font-size: 11px;
          padding: 6px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          background: #ffffff;
          cursor: pointer;
          font-weight: 600;
          text-align: center;
        }
        .btn-theme-card-small.apply {
          background: #c2105b;
          color: #ffffff;
          border-color: transparent;
        }
        .btn-theme-card-small.applied {
          background: #dcfce7;
          color: #15803d;
          border-color: transparent;
          cursor: default;
        }
        /* Live Preview Styles */
        .live-preview-box-container {
          background-color: #ffffff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          padding: 24px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
        }
        .preview-footer-view {
          padding: 30px;
          border-radius: 8px;
          text-align: left;
        }
        .preview-footer-columns-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 20px;
          padding-bottom: 20px;
        }
        .preview-footer-col-title {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 12px;
          text-transform: uppercase;
        }
        .preview-footer-col-links {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .preview-footer-col-link {
          font-size: 12px;
          text-decoration: none;
          opacity: 0.85;
          transition: opacity 0.2s;
        }
        .preview-footer-bottom-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          font-size: 11px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .preview-socials-list {
          display: flex;
          gap: 10px;
        }
        .preview-soc-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          background: rgba(255,255,255,0.08);
          font-weight: 700;
        }
        /* Sidebar Styles */
        .settings-tab-headers {
          display: flex;
          background-color: #f1f5f9;
          border-radius: 8px;
          padding: 4px;
          gap: 4px;
        }
        .settings-tab-btn {
          flex: 1;
          padding: 8px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          background: none;
          border-radius: 6px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }
        .settings-tab-btn.active {
          background-color: #c2105b;
          color: #ffffff;
        }
        .settings-form-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 8px;
        }
        .settings-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .settings-input-label {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
        }
        .settings-textbox {
          width: 100%;
          padding: 10px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 13px;
          outline: none;
          background: #ffffff;
        }
        .settings-select {
          width: 100%;
          padding: 10px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 13px;
          outline: none;
          background: #ffffff;
          cursor: pointer;
        }
        .switch-container-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
        }
        .color-selector-block {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .color-square-picker {
          width: 38px;
          height: 38px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 0;
          cursor: pointer;
        }
        .columns-manager-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .column-edit-item-row {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background-color: #f8fafc;
        }
        .alignment-selectors {
          display: flex;
          gap: 8px;
        }
        .alignment-btn {
          flex: 1;
          padding: 6px;
          font-size: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          background: #ffffff;
          cursor: pointer;
          text-align: center;
        }
        .alignment-btn.active {
          background: #c2105b;
          color: #ffffff;
          border-color: transparent;
        }
        /* Buttons */
        .btn-theme-action-primary {
          background-color: #c2105b;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          padding: 10px 18px;
          font-size: 13px;
          cursor: pointer;
          flex: 1;
        }
        .btn-theme-action-outline {
          background: #ffffff;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-weight: 700;
          padding: 10px 18px;
          font-size: 13px;
          cursor: pointer;
          flex: 1;
        }
        /* Custom styled upload file element */
        .upload-btn-solid {
          background-color: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .upload-btn-solid:hover {
          background-color: #e2e8f0;
        }
        .delete-img-btn {
          background: none;
          border: 1px solid #fee2e2;
          color: #ef4444;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .delete-img-btn:hover {
          background: #fef2f2;
        }
        /* Toggle Switch styling */
        .switch-control {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 22px;
        }
        .switch-control input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider-knob {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: .3s;
          border-radius: 22px;
        }
        .slider-knob:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }
        input:checked + .slider-knob {
          background-color: #c2105b;
        }
        input:checked + .slider-knob:before {
          transform: translateX(22px);
        }
      `}</style>

      {/* Header Row */}
      <div className="dashboard-header-row">
        <div className="header-title-section">
          <h1>Footer Theme Management</h1>
          <p>Theme Management &gt; Footer Management</p>
        </div>
        <button
          type="button"
          className="btn-theme-action-primary"
          style={{ maxWidth: "200px" }}
          onClick={handleAddNewTheme}
        >
          <FaPlus style={{ marginRight: 6 }} /> Add New Footer
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="dashboard-grid-layout">
        
        {/* Left Column: catalog & preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Available templates */}
          <div className="panel-card-box">
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>Available Footer Themes</h3>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="Search footer themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="settings-textbox"
                style={{ flex: 1 }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="settings-select"
                style={{ width: "130px" }}
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="catalog-themes-row-grid">
              {filteredThemes.map((theme) => {
                const isActive = theme.id === activeThemeId;
                return (
                  <div
                    key={theme.id}
                    className="footer-theme-catalog-card"
                    style={{
                      borderColor: selectedTheme?.id === theme.id ? "#c2105b" : "#e2e8f0",
                      borderWidth: selectedTheme?.id === theme.id ? "2px" : "1px"
                    }}
                    onClick={() => handleSelectTheme(theme)}
                  >
                    <span className={`status-badge-top ${theme.status === "Active" ? "active" : "inactive"}`}>
                      {theme.status}
                    </span>

                    <div className="card-visual-img" style={{ background: theme.styles?.bgColor === "transparent" ? "#0f172a" : (theme.styles?.bgColor || "#1A1A1A") }}>
                      <span style={{ color: theme.styles?.headingColor || "#FFFFFF" }}>N</span>
                    </div>

                    <div className="card-details-info">
                      <h4 className="card-title-lbl">{theme.name}</h4>
                      <p className="card-desc-lbl">Style: {theme.styles?.dividerStyle || "Classic"}</p>
                      
                      <div className="card-action-btns" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="btn-theme-card-small" onClick={() => handleSelectTheme(theme)}>
                          Edit
                        </button>
                        {isActive ? (
                          <button type="button" className="btn-theme-card-small applied">
                            Applied
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-theme-card-small apply"
                            onClick={() => handleApplyTheme(theme)}
                          >
                            Apply
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-theme-card-small"
                          style={{ color: "#ef4444", borderColor: "#fecaca" }}
                          onClick={(e) => handleDeleteTheme(theme.id, e)}
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Live Preview */}
          <div className="panel-card-box">
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>Footer Live Preview</h3>
            
            {livePreviewTheme ? (
              <div className="live-preview-box-container">
                <div
                  className="preview-footer-view"
                  style={{
                    backgroundColor: livePreviewTheme.styles?.bgColor || "#1A1A1A",
                    color: livePreviewTheme.styles?.textColor || "#FFFFFF",
                    borderTop: livePreviewTheme.styles?.dividerStyle === "Solid" ? `3px solid ${livePreviewTheme.styles?.borderColor || "#333333"}` : "none"
                  }}
                >
                  <div className="preview-footer-columns-row" style={{ textAlign: columnAlignment }}>
                    {columnsList.map((col) => (
                      <div key={col.id} className="preview-footer-column-item">
                        <h5
                          className="preview-footer-col-title"
                          style={{ color: livePreviewTheme.styles?.headingColor || "#FFC107" }}
                        >
                          {col.title}
                        </h5>
                        {col.desc ? (
                          <div style={{ fontSize: "12px", opacity: 0.9 }}>
                            <p style={{ margin: "0 0 10px 0" }}>{col.desc}</p>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <input
                                type="text"
                                placeholder="Enter your email"
                                disabled
                                style={{ padding: "6px", fontSize: "11px", border: "1px solid #ccc", borderRadius: "4px", width: "100%", outline: "none", color: "#333" }}
                              />
                              <button type="button" style={{ padding: "6px 10px", background: livePreviewTheme.styles?.headingColor || "#FFC107", color: livePreviewTheme.styles?.bgColor || "#000", border: "none", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
                                &gt;
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="preview-footer-col-links">
                            {col.items?.map((item, idx) => (
                              <a
                                href="#"
                                key={idx}
                                className="preview-footer-col-link"
                                style={{
                                  color: livePreviewTheme.styles?.textColor || "#FFFFFF",
                                  alignSelf: columnAlignment === "center" ? "center" : columnAlignment === "right" ? "flex-end" : "flex-start"
                                }}
                                onClick={e => e.preventDefault()}
                              >
                                {item}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {enableBottomBar && (
                    <div
                      className="preview-footer-bottom-bar"
                      style={{
                        borderTop: `1px solid ${livePreviewTheme.styles?.borderColor || "rgba(255,255,255,0.08)"}`,
                        justifyContent: bottomBarAlignment === "left" ? "flex-start" : bottomBarAlignment === "right" ? "flex-end" : "space-between"
                      }}
                    >
                      <span>{copyrightText}</span>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        {socialLinks.length > 0 && (
                          <div className="preview-socials-list">
                            {socialLinks.map((soc) => (
                              <span
                                key={soc.id}
                                className="preview-soc-circle"
                                style={{ color: livePreviewTheme.styles?.headingColor || "#FFFFFF" }}
                              >
                                {soc.platform.charAt(0)}
                              </span>
                            ))}
                          </div>
                        )}
                        {paymentIcons && (
                          <div style={{ display: "flex", gap: "4px", fontSize: "9px", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "4px" }}>
                            <span>VISA</span> | <span>MC</span> | <span>UPI</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>
                Select a template card to show Live Preview.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings Tabs Panel */}
        <div className="panel-card-box" style={{ gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>Footer Settings</h3>
            <span style={{ fontSize: "11px", color: "#64748b" }}>Customize and style footer theme elements</span>
          </div>

          <div className="settings-tab-headers">
            {["General", "Columns", "Bottom Bar", "Social Links", "Style"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`settings-tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {selectedTheme ? (
            <div className="settings-form-wrapper">
              
              {/* GENERAL TAB */}
              {activeTab === "General" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="settings-input-group">
                    <label className="settings-input-label">Footer Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="settings-textbox"
                    />
                  </div>

                  <div className="settings-input-group">
                    <label className="settings-input-label">Footer Layout</label>
                    <select
                      value={formLayout}
                      onChange={(e) => setFormLayout(e.target.value)}
                      className="settings-select"
                    >
                      <option value="4 Columns">4 Columns</option>
                      <option value="3 Columns">3 Columns</option>
                      <option value="Minimal">Minimal</option>
                    </select>
                  </div>

                  <div className="settings-input-group">
                    <label className="settings-input-label">Footer Width</label>
                    <div style={{ display: "flex", gap: "20px", marginTop: "4px" }}>
                      <label className="settings-input-label" style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="radio"
                          name="footerWidth"
                          checked={formWidth === "Full Width"}
                          onChange={() => setFormWidth("Full Width")}
                        />
                        Full Width
                      </label>
                      <label className="settings-input-label" style={{ fontWeight: "normal", display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="radio"
                          name="footerWidth"
                          checked={formWidth === "Boxed"}
                          onChange={() => setFormWidth("Boxed")}
                        />
                        Boxed
                      </label>
                    </div>
                  </div>

                  <div className="switch-container-row">
                    <span className="settings-input-label">Status (Active)</span>
                    <label className="switch-control">
                      <input
                        type="checkbox"
                        checked={formStatus === "Active"}
                        onChange={(e) => handleStatusToggle(e.target.checked)}
                      />
                      <span className="slider-knob"></span>
                    </label>
                  </div>
                </div>
              )}

              {/* COLUMNS TAB */}
              {activeTab === "Columns" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="settings-input-group">
                    <label className="settings-input-label">Column Alignment</label>
                    <div className="alignment-selectors">
                      {["left", "center", "right"].map((align) => (
                        <button
                          key={align}
                          type="button"
                          className={`alignment-btn ${columnAlignment === align ? "active" : ""}`}
                          onClick={() => setColumnAlignment(align)}
                        >
                          {align.charAt(0).toUpperCase() + align.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="columns-manager-list">
                    <span className="settings-input-label">Footer Columns</span>
                    {columnsList.map((col) => (
                      <div key={col.id} className="column-edit-item-row">
                        <div style={{ display: "flex", gap: "10px" }}>
                          <input
                            type="text"
                            placeholder="Column Title"
                            value={col.title}
                            onChange={(e) => handleEditColumnTitle(col.id, e.target.value)}
                            className="settings-textbox"
                            style={{ fontWeight: "bold" }}
                          />
                          <button
                            type="button"
                            className="delete-img-btn"
                            style={{ color: "#ef4444", padding: "6px" }}
                            onClick={() => handleRemoveColumn(col.id)}
                          >
                            <FaTrashAlt />
                          </button>
                        </div>

                        {col.hasOwnProperty("desc") ? (
                          <input
                            type="text"
                            placeholder="Column Description text"
                            value={col.desc}
                            onChange={(e) => {
                              setColumnsList(columnsList.map(c => c.id === col.id ? { ...c, desc: e.target.value } : c));
                            }}
                            className="settings-textbox"
                          />
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "10px", color: "#64748b" }}>Links (comma-separated):</span>
                            <input
                              type="text"
                              placeholder="e.g. About Us, Careers, Contact Us"
                              value={col.items?.join(", ") || ""}
                              onChange={(e) => handleEditColumnItems(col.id, e.target.value)}
                              className="settings-textbox"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      className="upload-btn-solid"
                      onClick={handleAddColumn}
                      style={{ fontSize: "12px", padding: "8px" }}
                    >
                      <FaPlus style={{ marginRight: 6 }} /> Add New Column
                    </button>
                  </div>
                </div>
              )}

              {/* BOTTOM BAR TAB */}
              {activeTab === "Bottom Bar" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="switch-container-row">
                    <span className="settings-input-label">Enable Bottom Bar</span>
                    <label className="switch-control">
                      <input
                        type="checkbox"
                        checked={enableBottomBar}
                        onChange={(e) => setEnableBottomBar(e.target.checked)}
                      />
                      <span className="slider-knob"></span>
                    </label>
                  </div>

                  <div className="settings-input-group">
                    <label className="settings-input-label">Copyright Text</label>
                    <input
                      type="text"
                      value={copyrightText}
                      onChange={(e) => setCopyrightText(e.target.value)}
                      className="settings-textbox"
                    />
                  </div>

                  <div className="switch-container-row">
                    <span className="settings-input-label">Show Payment Gateways Icons</span>
                    <label className="switch-control">
                      <input
                        type="checkbox"
                        checked={paymentIcons}
                        onChange={(e) => setPaymentIcons(e.target.checked)}
                      />
                      <span className="slider-knob"></span>
                    </label>
                  </div>

                  <div className="settings-input-group">
                    <label className="settings-input-label">Bottom Bar Alignment</label>
                    <div className="alignment-selectors">
                      {["left", "center", "right"].map((align) => (
                        <button
                          key={align}
                          type="button"
                          className={`alignment-btn ${bottomBarAlignment === align ? "active" : ""}`}
                          onClick={() => setBottomBarAlignment(align)}
                        >
                          {align.charAt(0).toUpperCase() + align.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SOCIAL LINKS TAB */}
              {activeTab === "Social Links" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <span className="settings-input-label">Social Media Handles</span>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {socialLinks.map((soc) => (
                      <div key={soc.id} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <select
                          value={soc.platform}
                          onChange={(e) => handleEditSocialLink(soc.id, "platform", e.target.value)}
                          className="settings-select"
                          style={{ width: "120px", padding: "8px" }}
                        >
                          <option value="Facebook">Facebook</option>
                          <option value="Twitter">Twitter</option>
                          <option value="Instagram">Instagram</option>
                          <option value="YouTube">YouTube</option>
                          <option value="LinkedIn">LinkedIn</option>
                        </select>

                        <input
                          type="text"
                          value={soc.url}
                          onChange={(e) => handleEditSocialLink(soc.id, "url", e.target.value)}
                          className="settings-textbox"
                          style={{ padding: "8px" }}
                          placeholder="Profile Link URL"
                        />

                        <button
                          type="button"
                          className="delete-img-btn"
                          style={{ color: "#ef4444", padding: "8px" }}
                          onClick={() => handleRemoveSocialLink(soc.id)}
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="upload-btn-solid"
                    onClick={handleAddSocialLink}
                    style={{ fontSize: "12px", padding: "8px", marginTop: "6px" }}
                  >
                    <FaPlus style={{ marginRight: 6 }} /> Add Social Link
                  </button>
                </div>
              )}

              {/* STYLE TAB */}
              {activeTab === "Style" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="settings-input-group">
                      <label className="settings-input-label">Background Color</label>
                      <div className="color-selector-block">
                        <input
                          type="color"
                          value={styleBgColor === "transparent" ? "#ffffff" : styleBgColor}
                          onChange={(e) => setStyleBgColor(e.target.value)}
                          className="color-square-picker"
                        />
                        <input
                          type="text"
                          value={styleBgColor}
                          onChange={(e) => setStyleBgColor(e.target.value)}
                          className="settings-textbox"
                          style={{ fontSize: "11px", padding: "8px" }}
                        />
                      </div>
                    </div>

                    <div className="settings-input-group">
                      <label className="settings-input-label">Text Color</label>
                      <div className="color-selector-block">
                        <input
                          type="color"
                          value={styleTextColor}
                          onChange={(e) => setStyleTextColor(e.target.value)}
                          className="color-square-picker"
                        />
                        <input
                          type="text"
                          value={styleTextColor}
                          onChange={(e) => setStyleTextColor(e.target.value)}
                          className="settings-textbox"
                          style={{ fontSize: "11px", padding: "8px" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="settings-input-group">
                      <label className="settings-input-label">Heading Color</label>
                      <div className="color-selector-block">
                        <input
                          type="color"
                          value={styleHeadingColor}
                          onChange={(e) => setStyleHeadingColor(e.target.value)}
                          className="color-square-picker"
                        />
                        <input
                          type="text"
                          value={styleHeadingColor}
                          onChange={(e) => setStyleHeadingColor(e.target.value)}
                          className="settings-textbox"
                          style={{ fontSize: "11px", padding: "8px" }}
                        />
                      </div>
                    </div>

                    <div className="settings-input-group">
                      <label className="settings-input-label">Link Hover Color</label>
                      <div className="color-selector-block">
                        <input
                          type="color"
                          value={styleLinkHoverColor}
                          onChange={(e) => setStyleLinkHoverColor(e.target.value)}
                          className="color-square-picker"
                        />
                        <input
                          type="text"
                          value={styleLinkHoverColor}
                          onChange={(e) => setStyleLinkHoverColor(e.target.value)}
                          className="settings-textbox"
                          style={{ fontSize: "11px", padding: "8px" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="settings-input-group">
                      <label className="settings-input-label">Border Color</label>
                      <div className="color-selector-block">
                        <input
                          type="color"
                          value={styleBorderColor}
                          onChange={(e) => setStyleBorderColor(e.target.value)}
                          className="color-square-picker"
                        />
                        <input
                          type="text"
                          value={styleBorderColor}
                          onChange={(e) => setStyleBorderColor(e.target.value)}
                          className="settings-textbox"
                          style={{ fontSize: "11px", padding: "8px" }}
                        />
                      </div>
                    </div>

                    <div className="settings-input-group">
                      <label className="settings-input-label">Divider Style</label>
                      <select
                        value={styleDividerStyle}
                        onChange={(e) => setStyleDividerStyle(e.target.value)}
                        className="settings-select"
                      >
                        <option value="Solid">Solid Line</option>
                        <option value="Dashed">Dashed Line</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                  </div>

                </div>
              )}

              {/* ACTION FOOTER BUTTONS */}
              <div style={{ display: "flex", gap: "10px", marginTop: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                <button
                  type="submit"
                  className="btn-theme-action-primary"
                  onClick={handleSaveChanges}
                  disabled={saving}
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="btn-theme-action-outline"
                  onClick={() => populateForm(selectedTheme)}
                >
                  Reset
                </button>
              </div>

            </div>
          ) : (
            <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
              Select a footer theme catalog template to edit settings.
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
