import React, { useEffect, useState } from "react";
import { getActiveLayout, updateHeaderConfig } from "../../services/themeService";
import { toApiAssetUrl } from "../../services/apiClient";
import { Menu, ArrowRight, Trash2, Heart, Search, ShoppingCart } from "lucide-react";

export default function B2CHeaderTheme() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [isEditing, setIsEditing] = useState(false); // Edit existing mode
  const [isAdding, setIsAdding] = useState(false);   // Add new mode

  // Multi-Header list state
  const [createdHeaders, setCreatedHeaders] = useState([
    {
      id: 1,
      name: "Modern Header",
      type: "Fixed",
      logoUrl: "",
      settings: {
        headerName: "Modern Header",
        headerWidth: "Full Width",
        isActive: true,
        enableTopBar: false,
        phone: "+91 9876543210",
        email: "info@picknbook.com",
        address: "123, Travel Street, New York, USA",
        showSocialIcons: true,
        showSeparator: true,
        openLinksInNewTab: true,
        socialLinks: [
          { id: "fb", platform: "Facebook", url: "https://facebook.com" },
          { id: "ig", platform: "Instagram", url: "https://instagram.com" },
          { id: "tw", platform: "Twitter", url: "https://twitter.com" },
          { id: "ln", platform: "LinkedIn", url: "https://linkedin.com" },
          { id: "yt", platform: "YouTube", url: "https://youtube.com" }
        ],
        enableMenu: true,
        stickyMenu: true,
        showSearch: true,
        showWishlist: true,
        showCart: true,
        showLoginRegister: true,
        showLanguageSwitcher: true,
        showCurrencySwitcher: false,
        menuAlignment: "center",
        menuStyle: "Horizontal",
        menuFont: "Poppins",
        menuFontSize: "14px",
        menuTextTransform: "Normal",
        enableButton: true,
        buttonText: "BOOK NOW",
        buttonLink: "/book-now",
        buttonStyle: "Primary",
        buttonSize: "Medium",
        buttonIcon: "Arrow Right",
        buttonIconPosition: "Right",
        buttonOpenInNewTab: false,
        btnBgColor: "#ffbd00",
        btnTextColor: "#ffffff",
        btnHoverBgColor: "#ff9f00",
        btnHoverTextColor: "#ffffff",
        btnBorderColor: "#ffbd00",
        btnBorderRadius: 8,
        headerShadow: "Small",
        enableTransparentHeader: false,
        enableDarkMode: false,
        enableDivider: true,
        showBottomBorder: true,
        dividerColor: "#dddddd",
        dividerHeight: "1px",
        bgColorType: "Solid",
        bgColor: "#880d4f",
        textColor: "#ffffff",
        hoverColor: "#ffbd00",
        height: 72
      }
    },
    {
      id: 2,
      name: "Classic Center Header",
      type: "Static",
      logoUrl: "",
      settings: {
        headerName: "Classic Center Header",
        headerWidth: "Full Width",
        isActive: false,
        enableTopBar: false,
        phone: "+91 9876543210",
        email: "info@picknbook.com",
        address: "",
        showSocialIcons: true,
        showSeparator: true,
        openLinksInNewTab: true,
        socialLinks: [],
        enableMenu: true,
        stickyMenu: false,
        showSearch: true,
        showWishlist: true,
        showCart: true,
        showLoginRegister: true,
        showLanguageSwitcher: true,
        showCurrencySwitcher: false,
        menuAlignment: "center",
        menuStyle: "Horizontal",
        menuFont: "Poppins",
        menuFontSize: "14px",
        menuTextTransform: "Normal",
        enableButton: false,
        buttonText: "BOOK NOW",
        buttonLink: "/book-now",
        btnBgColor: "#ffbd00",
        btnTextColor: "#ffffff",
        btnBorderColor: "#ffbd00",
        btnBorderRadius: 8,
        headerShadow: "None",
        enableTransparentHeader: false,
        enableDarkMode: false,
        enableDivider: true,
        showBottomBorder: true,
        dividerColor: "#eeeeee",
        dividerHeight: "1px",
        bgColorType: "Solid",
        bgColor: "#ffffff",
        textColor: "#1e293b",
        hoverColor: "#880d4f",
        height: 72
      }
    }
  ]);

  const [activeHeaderId, setActiveHeaderId] = useState(1);
  const [selectedHeaderId, setSelectedHeaderId] = useState(1);

  // Draft profile for adding a new header (not added to list until saved)
  const [newHeaderDraft, setNewHeaderDraft] = useState(null);

  // Dynamic menu list shared across layouts
  const [menuItems, setMenuItems] = useState([
    { id: 1, label: "Home", link: "/", isActive: true },
    { id: 2, label: "Flights", link: "/flights", isActive: true },
    { id: 3, label: "Hotels", link: "/hotels", isActive: true },
    { id: 4, label: "Holidays", link: "/holidays", isActive: true },
    { id: 5, label: "Offers", link: "/offers", isActive: true },
    { id: 6, label: "About Us", link: "/about-us", isActive: true }
  ]);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [newMenuLabel, setNewMenuLabel] = useState("");
  const [newMenuLink, setNewMenuLink] = useState("");
  const [editingMenuId, setEditingMenuId] = useState(null);

  const showEditor = isEditing || isAdding;
  const currentHeader = isAdding ? newHeaderDraft : (createdHeaders.find(h => h.id === selectedHeaderId) || createdHeaders[0]);

  const updateCurrentSettings = (field, value) => {
    if (isAdding) {
      setNewHeaderDraft(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [field]: value
        }
      }));
    } else {
      setCreatedHeaders(prev => prev.map(h => {
        if (h.id === selectedHeaderId) {
          return {
            ...h,
            settings: {
              ...h.settings,
              [field]: value
            }
          };
        }
        return h;
      }));
    }
  };

  const handleStatusToggle = (checked) => {
    const targetId = currentHeader.id;
    if (isAdding) {
      setNewHeaderDraft(prev => ({
        ...prev,
        settings: { ...prev.settings, isActive: checked }
      }));
    } else {
      setCreatedHeaders(prev => prev.map(h => {
        if (h.id === targetId) {
          return {
            ...h,
            settings: {
              ...h.settings,
              isActive: checked
            }
          };
        }
        // If activating this header, set others to inactive
        if (checked) {
          return {
            ...h,
            settings: {
              ...h.settings,
              isActive: false
            }
          };
        }
        return h;
      }));
      if (checked) {
        setActiveHeaderId(targetId);
      } else {
        if (activeHeaderId === targetId) {
          setActiveHeaderId(0); // Deactivate active layout
        }
      }
    }
  };

  const handleAddNewHeader = () => {
    const newId = Date.now();
    const newName = `Custom Header #${createdHeaders.length + 1}`;
    const draft = {
      id: newId,
      name: newName,
      type: "Fixed",
      logoUrl: "",
      settings: {
        headerName: newName,
        headerWidth: "Full Width",
        isActive: false,
        enableTopBar: false,
        phone: "+91 9876543210",
        email: "info@picknbook.com",
        address: "",
        showSocialIcons: true,
        showSeparator: true,
        openLinksInNewTab: true,
        socialLinks: [
          { id: "fb", platform: "Facebook", url: "https://facebook.com" },
          { id: "ig", platform: "Instagram", url: "https://instagram.com" },
          { id: "tw", platform: "Twitter", url: "https://twitter.com" },
          { id: "ln", platform: "LinkedIn", url: "https://linkedin.com" },
          { id: "yt", platform: "YouTube", url: "https://youtube.com" }
        ],
        enableMenu: true,
        stickyMenu: true,
        showSearch: true,
        showWishlist: true,
        showCart: true,
        showLoginRegister: true,
        showLanguageSwitcher: true,
        showCurrencySwitcher: false,
        menuAlignment: "center",
        menuStyle: "Horizontal",
        menuFont: "Poppins",
        menuFontSize: "14px",
        menuTextTransform: "Normal",
        enableButton: true,
        buttonText: "BOOK NOW",
        buttonLink: "/book-now",
        buttonStyle: "Primary",
        buttonSize: "Medium",
        buttonIcon: "Arrow Right",
        buttonIconPosition: "Right",
        buttonOpenInNewTab: false,
        btnBgColor: "#ffbd00",
        btnTextColor: "#ffffff",
        btnHoverBgColor: "#ff9f00",
        btnHoverTextColor: "#ffffff",
        btnBorderColor: "#ffbd00",
        btnBorderRadius: 8,
        headerShadow: "Small",
        enableTransparentHeader: false,
        enableDarkMode: false,
        enableDivider: true,
        showBottomBorder: true,
        dividerColor: "#dddddd",
        dividerHeight: "1px",
        bgColorType: "Solid",
        bgColor: "#880d4f",
        textColor: "#ffffff",
        hoverColor: "#ffbd00",
        height: 72
      }
    };
    setNewHeaderDraft(draft);
    setIsAdding(true);
    setIsEditing(false);
  };

  const handleApplyTheme = async (id) => {
    setSaving(true);
    try {
      const updatedList = createdHeaders.map(h => ({
        ...h,
        settings: {
          ...h.settings,
          isActive: h.id === id
        }
      }));

      const activeHeader = updatedList.find(h => h.id === id) || updatedList[0];
      const activeConfig = activeHeader.settings;
      const finalActiveId = id;

      const formData = new FormData();
      formData.append("BgColorType", activeConfig.bgColorType || "Solid");
      formData.append("BgColor", activeConfig.bgColor || "#880d4f");
      formData.append("GradientCss", "linear-gradient(90deg, #880d4f 0%, #ff6b6b 100%)");
      formData.append("TextColor", activeConfig.textColor || "#ffffff");
      formData.append("HoverColor", activeConfig.hoverColor || "#ffbd00");
      formData.append("LayoutType", activeConfig.enableTransparentHeader ? "Default" : (finalActiveId === 2 ? "Centered" : "Default"));
      formData.append("Height", String(activeConfig.height || 72));
      formData.append("IsSticky", String(activeConfig.stickyMenu));
      formData.append("DropdownBgColor", "#ffffff");
      formData.append("DropdownTextColor", "#212529");
      formData.append("DropdownHoverColor", "#880d4f");
      formData.append("BorderBottomStyle", activeConfig.showBottomBorder ? "1px Solid" : "None");
      formData.append("BorderBottomColor", activeConfig.dividerColor || "#dddddd");
      formData.append("ShowNotificationBar", "false");
      formData.append("NotificationText", "");

      const serializedData = {
        createdHeaders: updatedList,
        activeHeaderId: finalActiveId,
        menuItems: menuItems
      };
      formData.append("MenuItemsJson", JSON.stringify(serializedData));

      await updateHeaderConfig(formData);

      // Sync local storage cache
      try {
        const cached = localStorage.getItem("b2c_layout_config");
        const parsed = cached ? JSON.parse(cached) : {};
        parsed.header = {
          ...parsed.header,
          bgColor: activeConfig.bgColor,
          textColor: activeConfig.textColor,
          hoverColor: activeConfig.hoverColor,
          layoutType: activeConfig.enableTransparentHeader ? "Default" : (finalActiveId === 2 ? "Centered" : "Default"),
          height: activeConfig.height,
          isSticky: activeConfig.stickyMenu,
          menuItemsJson: JSON.stringify(serializedData)
        };
        localStorage.setItem("b2c_layout_config", JSON.stringify(parsed));
      } catch (e) {
        console.error("Failed to sync header config to layout cache:", e);
      }

      setCreatedHeaders(updatedList);
      setActiveHeaderId(id);

      alert("Header theme applied successfully!");
    } catch (err) {
      console.error("Error applying header configuration:", err);
      alert("Failed to apply header configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHeader = async (id, e) => {
    e.stopPropagation();
    if (id === activeHeaderId) {
      alert("Cannot delete the currently active applied header. Please apply another header first.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this header layout?")) {
      return;
    }

    const updatedList = createdHeaders.filter(h => h.id !== id);
    setCreatedHeaders(updatedList);

    if (selectedHeaderId === id) {
      setIsEditing(false);
      setSelectedHeaderId(activeHeaderId);
    }

    // Save deletion state to the backend
    setSaving(true);
    try {
      const formData = new FormData();
      const activeHeader = updatedList.find(h => h.id === activeHeaderId) || updatedList[0];
      const activeConfig = activeHeader.settings;

      formData.append("BgColorType", activeConfig.bgColorType);
      formData.append("BgColor", activeConfig.bgColor);
      formData.append("GradientCss", "linear-gradient(90deg, #880d4f 0%, #ff6b6b 100%)");
      formData.append("TextColor", activeConfig.textColor);
      formData.append("HoverColor", activeConfig.hoverColor);
      formData.append("LayoutType", activeConfig.enableTransparentHeader ? "Default" : (activeHeaderId === 2 ? "Centered" : "Default"));
      formData.append("Height", String(activeConfig.height));
      formData.append("IsSticky", String(activeConfig.stickyMenu));
      formData.append("DropdownBgColor", "#ffffff");
      formData.append("DropdownTextColor", "#212529");
      formData.append("DropdownHoverColor", "#880d4f");
      formData.append("BorderBottomStyle", activeConfig.showBottomBorder ? "1px Solid" : "None");
      formData.append("BorderBottomColor", activeConfig.dividerColor);
      formData.append("ShowNotificationBar", "false");
      formData.append("NotificationText", "");

      const serializedData = {
        createdHeaders: updatedList,
        activeHeaderId: activeHeaderId,
        menuItems: menuItems
      };
      formData.append("MenuItemsJson", JSON.stringify(serializedData));

      await updateHeaderConfig(formData);

      // Sync local storage cache
      try {
        const cached = localStorage.getItem("b2c_layout_config");
        const parsed = cached ? JSON.parse(cached) : {};
        parsed.header = {
          ...parsed.header,
          menuItemsJson: JSON.stringify(serializedData)
        };
        localStorage.setItem("b2c_layout_config", JSON.stringify(parsed));
      } catch (err) {
        console.error("Failed to sync cache deletion:", err);
      }

      alert("Header template deleted successfully!");
    } catch (err) {
      console.error("Error deleting header configuration:", err);
      alert("Failed to delete header configuration.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const layout = await getActiveLayout();
        if (layout && layout.header && layout.header.menuItemsJson) {
          try {
            const parsed = JSON.parse(layout.header.menuItemsJson);
            if (parsed && parsed.createdHeaders && parsed.activeHeaderId) {
              setCreatedHeaders(parsed.createdHeaders);
              setActiveHeaderId(parsed.activeHeaderId);
              setSelectedHeaderId(parsed.activeHeaderId);
            }
          } catch {
            // Fallback
          }
        }
        if (layout && layout.header && layout.header.logoUrl) {
          setLogoPreview(toApiAssetUrl(layout.header.logoUrl));
        }
      } catch (err) {
        console.error("Failed to load header configurations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLayout();
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      let updatedHeadersList = [...createdHeaders];

      if (isAdding && newHeaderDraft) {
        updatedHeadersList.push({
          ...newHeaderDraft,
          name: newHeaderDraft.settings.headerName
        });
        setCreatedHeaders(updatedHeadersList);
      }

      // Identify active header: whichever has isActive: true
      const activeHeader = updatedHeadersList.find(h => h.settings.isActive) || updatedHeadersList[0];
      const activeConfig = activeHeader.settings;
      const finalActiveId = activeHeader.settings.isActive ? activeHeader.id : 0;

      formData.append("BgColorType", activeConfig.bgColorType);
      formData.append("BgColor", activeConfig.bgColor);
      formData.append("GradientCss", "linear-gradient(90deg, #880d4f 0%, #ff6b6b 100%)");
      formData.append("TextColor", activeConfig.textColor);
      formData.append("HoverColor", activeConfig.hoverColor);
      formData.append("LayoutType", activeConfig.enableTransparentHeader ? "Default" : (finalActiveId === 2 ? "Centered" : "Default"));
      formData.append("Height", String(activeConfig.height));
      formData.append("IsSticky", String(activeConfig.stickyMenu));
      formData.append("DropdownBgColor", "#ffffff");
      formData.append("DropdownTextColor", "#212529");
      formData.append("DropdownHoverColor", "#880d4f");
      formData.append("BorderBottomStyle", activeConfig.showBottomBorder ? "1px Solid" : "None");
      formData.append("BorderBottomColor", activeConfig.dividerColor);
      formData.append("ShowNotificationBar", "false");
      formData.append("NotificationText", "");

      const serializedData = {
        createdHeaders: updatedHeadersList,
        activeHeaderId: finalActiveId,
        menuItems: menuItems
      };
      formData.append("MenuItemsJson", JSON.stringify(serializedData));

      if (logoFile) {
        formData.append("LogoFile", logoFile);
      }
      
      await updateHeaderConfig(formData);

      // Sync local storage cache
      try {
        const cached = localStorage.getItem("b2c_layout_config");
        const parsed = cached ? JSON.parse(cached) : {};
        parsed.header = {
          ...parsed.header,
          bgColor: activeConfig.bgColor,
          textColor: activeConfig.textColor,
          hoverColor: activeConfig.hoverColor,
          layoutType: activeConfig.enableTransparentHeader ? "Default" : (finalActiveId === 2 ? "Centered" : "Default"),
          height: activeConfig.height,
          isSticky: activeConfig.stickyMenu,
          menuItemsJson: JSON.stringify(serializedData)
        };
        localStorage.setItem("b2c_layout_config", JSON.stringify(parsed));
      } catch (e) {
        console.error("Failed to sync header config to layout cache:", e);
      }

      alert("Header layout settings saved successfully!");
      setIsEditing(false);
      setIsAdding(false);
      setNewHeaderDraft(null);
    } catch (err) {
      console.error("Error saving header config:", err);
      alert("Failed to save header settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddOrEditMenuItem = (e) => {
    e.preventDefault();
    if (!newMenuLabel.trim() || !newMenuLink.trim()) return;

    if (editingMenuId) {
      setMenuItems(prev => prev.map(m => m.id === editingMenuId ? { ...m, label: newMenuLabel, link: newMenuLink } : m));
      setEditingMenuId(null);
    } else {
      const newItem = {
        id: Date.now(),
        label: newMenuLabel,
        link: newMenuLink,
        isActive: true
      };
      setMenuItems(prev => [...prev, newItem]);
    }
    setNewMenuLabel("");
    setNewMenuLink("");
    setShowAddMenuModal(false);
  };

  const handleSocialLinkChange = (id, val) => {
    const updatedLinks = currentHeader.settings.socialLinks.map(s => s.id === id ? { ...s, url: val } : s);
    updateCurrentSettings("socialLinks", updatedLinks);
  };

  const handleToggleStatus = (id) => {
    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));
  };

  const handleDeleteMenuItem = (id) => {
    if (window.confirm("Delete this menu item?")) {
      setMenuItems(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleEditClick = (item) => {
    setEditingMenuId(item.id);
    setNewMenuLabel(item.label);
    setNewMenuLink(item.link);
    setShowAddMenuModal(true);
  };

  const getHeaderBackground = () => {
    if (currentHeader.settings.enableTransparentHeader) {
      return "transparent";
    }
    return currentHeader.settings.bgColor;
  };

  if (loading) return <div style={{ padding: 24, fontFamily: "Poppins, sans-serif" }}>Loading Header Configurer...</div>;

  return (
    <div className="header-management-container">
      <style>{`
        .header-management-container {
          padding: 28px;
          background: #f8fafc;
          font-family: 'Poppins', -apple-system, sans-serif;
          min-height: 100vh;
          color: #1e293b;
        }
        .header-main-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .header-main-title h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: #0f172a;
        }
        .header-main-title p {
          font-size: 0.8rem;
          color: #64748b;
          margin: 4px 0 0 0;
        }
        .btn-add-new {
          background: #880d4f;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          font-weight: 600;
          font-size: 0.85rem;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(136, 13, 79, 0.15);
          transition: all 0.2s ease;
        }
        .btn-add-new:hover {
          background: #700b41;
          transform: translateY(-1px);
        }
        .layout-flex-wrapper {
          display: grid;
          grid-template-columns: ${showEditor ? "1.2fr 1fr" : "1fr"};
          gap: 28px;
          align-items: start;
          transition: grid-template-columns 0.3s ease;
        }
        @media (max-width: 1200px) {
          .layout-flex-wrapper {
            grid-template-columns: 1fr;
          }
        }
        .available-themes-section h2 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 16px 0;
        }
        .filters-row {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }
        .search-input-field {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.82rem;
          outline: none;
          background: #ffffff;
        }
        .select-filter-field {
          width: 140px;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.82rem;
          outline: none;
          background: #ffffff;
          cursor: pointer;
        }
        .themes-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(${showEditor ? "200px" : "280px"}, 1fr));
          gap: 24px;
          margin-bottom: 28px;
          transition: all 0.3s ease;
        }
        .theme-card-item {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 18px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: all 0.25s ease;
          cursor: pointer;
          position: relative;
        }
        .theme-card-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.04);
        }
        .theme-card-item.selected-card {
          border-color: #880d4f;
          box-shadow: 0 0 0 2px rgba(136, 13, 79, 0.1);
        }
        .mockup-graphic-box {
          height: 120px;
          border-radius: 8px;
          background: #f1f5f9;
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .mockup-header-topbar {
          width: 100%;
          height: 12px;
          background: #880d4f;
          position: absolute;
          top: 0;
        }
        .mockup-logo-line {
          font-weight: 800;
          font-size: 0.85rem;
        }
        .mockup-links-dots {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }
        .mockup-links-dots span {
          width: 16px;
          height: 3px;
          background: #cbd5e1;
          border-radius: 1px;
        }
        .theme-card-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          z-index: 10;
        }
        .theme-card-badge.active {
          background: #d1fae5;
          color: #065f46;
        }
        .theme-card-badge.inactive {
          background: #e2e8f0;
          color: #475569;
        }
        .btn-delete-card {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #fee2e2;
          color: #ef4444;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 20;
        }
        .btn-delete-card:hover {
          background: #fca5a5;
          color: #b91c1c;
          transform: scale(1.1);
        }
        .theme-card-item h3 {
          font-size: 0.95rem;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #0f172a;
        }
        .theme-card-item p.type-lbl {
          font-size: 0.76rem;
          color: #64748b;
          margin: 0 0 16px 0;
        }
        .theme-card-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-top: auto;
        }
        .btn-card-action {
          background: #f1f5f9;
          border: none;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 7px 4px;
          border-radius: 6px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s ease;
        }
        .btn-card-action:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .btn-card-action.apply-btn {
          background: #880d4f;
          color: #ffffff;
        }
        .btn-card-action.apply-btn:hover {
          background: #700b41;
        }
        .btn-card-action.applied-btn {
          background: #ecfdf5;
          color: #059669;
          cursor: pointer;
        }
        .btn-card-action.applied-btn:hover {
          background: #d1fae5;
        }

        /* Tabs settings panel */
        .settings-tabs-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          overflow: hidden;
          margin-bottom: 28px;
          width: 100%;
        }
        .tabs-header-bar {
          display: flex;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 8px 16px 0 16px;
          gap: 4px;
        }
        .tab-btn-item {
          background: none;
          border: none;
          padding: 10px 16px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
          border-radius: 6px 6px 0 0;
        }
        .tab-btn-item:hover {
          color: #0f172a;
          background: #f1f5f9;
        }
        .tab-btn-item.active {
          color: #880d4f;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-bottom-color: #ffffff;
        }
        .tabs-content-body {
          padding: 24px;
        }
        .form-grid-two-col {
          display: grid;
          grid-template-columns: 1.1fr 1.1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .form-grid-two-col {
            grid-template-columns: 1fr;
          }
        }
        .form-column-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .config-input-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
        }
        .config-textbox {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.8rem;
          outline: none;
          box-sizing: border-box;
          background: #ffffff;
        }
        .config-select {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.8rem;
          outline: none;
          background: #ffffff;
          cursor: pointer;
          box-sizing: border-box;
        }
        .flex-row-align {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-action-icon {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }
        .btn-action-icon:hover {
          background: #fee2e2;
        }

        /* Alignment Toggle Group */
        .align-toggle-group {
          display: flex;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
          width: max-content;
        }
        .align-toggle-btn {
          background: #ffffff;
          border: none;
          border-right: 1px solid #cbd5e1;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 600;
          color: #475569;
        }
        .align-toggle-btn:last-child {
          border-right: none;
        }
        .align-toggle-btn.selected {
          background: #880d4f;
          color: #ffffff;
        }

        /* Right Preview panel */
        .preview-header-mockup-wrapper {
          border-radius: 12px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          position: relative;
          width: 100%;
          margin-bottom: 16px;
        }
        .preview-header-mockup-wrapper.transparent-preview {
          background-image: linear-gradient(rgba(15,23,42,0.85), rgba(15,23,42,0.85)), url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600');
          background-size: cover;
          background-position: center;
          color: #ffffff;
        }
        .mock-topbar-strip {
          background: #700b41;
          color: #ffffff;
          padding: 6px 16px;
          font-size: 0.65rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .mock-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          transition: all 0.3s ease;
        }
        .mock-header-content.centered {
          flex-direction: column;
          gap: 12px;
          padding: 14px 20px;
        }
        .mock-logo-image {
          max-height: 28px;
          max-width: 110px;
          object-fit: contain;
        }
        .mock-logo-text-center {
          font-weight: 800;
          font-size: 1.1rem;
        }
        .mock-links-row {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .mock-links-row span {
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
        }
        .mock-right-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .mock-icon-button {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 4px;
        }
        .mock-cta-button {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Action Buttons */
        .bottom-actions-container {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          justify-content: flex-end;
        }
        .btn-save-settings {
          background: #880d4f;
          color: #ffffff;
          border: none;
          padding: 10px 24px;
          font-weight: 700;
          font-size: 0.85rem;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(136, 13, 79, 0.15);
          transition: all 0.2s ease;
        }
        .btn-save-settings:hover {
          background: #700b41;
        }
        .btn-reset-settings {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 10px 24px;
          font-weight: 600;
          font-size: 0.85rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-reset-settings:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* Checkbox slider toggles */
        .switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 20px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider-round {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: #cbd5e1;
          transition: .4s;
          border-radius: 20px;
        }
        .slider-round:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider-round {
          background-color: #880d4f;
        }
        input:checked + .slider-round:before {
          transform: translateX(20px);
        }
        .switch-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .config-group-desc {
          font-size: 0.7rem;
          color: #64748b;
          margin-top: -2px;
          margin-bottom: 6px;
        }
        .live-preview-header-panel {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 16px;
          background: #f8fafc;
          margin-bottom: 24px;
        }
      `}</style>

      {/* Main Header title */}
      <div className="header-main-title">
        <div>
          <h1>Header Theme Management</h1>
          <p>Theme Management &gt; Header Management</p>
        </div>
        <button type="button" className="btn-add-new" onClick={handleAddNewHeader}>
          + Add New Header
        </button>
      </div>

      <div className="layout-flex-wrapper">
        {/* Left Column: Created layouts cards list */}
        <div className="available-themes-section">
          <h2>Available Header Themes</h2>
          
          <div className="filters-row">
            <input type="text" placeholder="Search header themes..." className="search-input-field" />
            <select className="select-filter-field" defaultValue="All Status">
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="themes-cards-grid">
            {createdHeaders.map((t) => {
              const isSelected = selectedHeaderId === t.id && isEditing;
              const isActive = activeHeaderId === t.id;
              return (
                <div 
                  key={t.id} 
                  className={`theme-card-item ${isSelected ? "selected-card" : ""}`}
                  onClick={() => { setSelectedHeaderId(t.id); setIsEditing(true); setIsAdding(false); }}
                >
                  {/* Delete button option inside the card */}
                  {!isActive && (
                    <button 
                      type="button" 
                      className="btn-delete-card" 
                      title="Delete Header Template"
                      onClick={(e) => handleDeleteHeader(t.id, e)}
                    >
                      &times;
                    </button>
                  )}

                  <div className="mockup-graphic-box" style={{ background: t.settings.enableTransparentHeader ? "#0f172a" : "#f1f5f9" }}>
                    <span className={`theme-card-badge ${isActive ? "active" : "inactive"}`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                    {t.settings.enableTopBar && <div className="mockup-header-topbar" style={{ background: t.settings.bgColor }}></div>}
                    
                    {/* Mockup Brand Logo with actual logo colors */}
                    <span className="mockup-logo-line">
                      <span style={{ color: t.settings.enableTransparentHeader ? "#ffffff" : "#880d4f" }}>Pick </span>
                      <span style={{ color: "#ffbd00" }}>N </span>
                      <span style={{ color: t.settings.enableTransparentHeader ? "#ffffff" : "#880d4f" }}>Book</span>
                    </span>
                    
                    <div className="mockup-links-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                  <h3>{t.name}</h3>
                  <p className="type-lbl">Type: {t.settings.stickyMenu ? "Fixed" : "Static"}</p>
                  
                  <div className="theme-card-actions">
                    <button type="button" className="btn-card-action" onClick={(e) => { e.stopPropagation(); alert("Previewing: " + t.name); }}>Preview</button>
                    <button type="button" className="btn-card-action" onClick={(e) => { e.stopPropagation(); setSelectedHeaderId(t.id); setIsEditing(true); setIsAdding(false); }}>Edit</button>
                    {isActive ? (
                      <button 
                        type="button" 
                        className="btn-card-action applied-btn" 
                        onClick={(e) => { e.stopPropagation(); handleApplyTheme(0); }}
                        title="Click to deactivate layout"
                      >
                        Applied
                      </button>
                    ) : (
                      <button type="button" className="btn-card-action apply-btn" onClick={(e) => { e.stopPropagation(); handleApplyTheme(t.id); }}>Apply</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Settings Panel */}
        {showEditor && (
          <div className="settings-tabs-card">
            <div className="tabs-header-bar">
              <button type="button" className={`tab-btn-item ${activeTab === "basic" ? "active" : ""}`} onClick={() => setActiveTab("basic")}>Basic</button>
              <button type="button" className={`tab-btn-item ${activeTab === "topbar" ? "active" : ""}`} onClick={() => setActiveTab("topbar")}>Top Bar</button>
              <button type="button" className={`tab-btn-item ${activeTab === "menu" ? "active" : ""}`} onClick={() => setActiveTab("menu")}>Menu</button>
              <button type="button" className={`tab-btn-item ${activeTab === "button" ? "active" : ""}`} onClick={() => setActiveTab("button")}>Button</button>
              <button type="button" className={`tab-btn-item ${activeTab === "style" ? "active" : ""}`} onClick={() => setActiveTab("style")}>Style</button>
            </div>

            <div className="tabs-content-body">
              
              {/* Dynamic Live Preview with exact Brand colors */}
              <div className="live-preview-header-panel">
                <span className="config-input-label" style={{ marginBottom: 10 }}>Live Preview</span>
                <div className={`preview-header-mockup-wrapper ${currentHeader.settings.enableTransparentHeader ? "transparent-preview" : ""}`} style={{ minHeight: 90 }}>
                  {currentHeader.settings.enableTopBar && (
                    <div className="mock-topbar-strip" style={{ background: currentHeader.settings.bgColor, filter: "brightness(0.9)" }}>
                      <span>{currentHeader.settings.phone}</span>
                      <span>{currentHeader.settings.email}</span>
                    </div>
                  )}
                  <div 
                    className={`mock-header-content ${selectedHeaderId === 2 ? "centered" : ""}`}
                    style={{
                      background: getHeaderBackground(),
                      color: currentHeader.settings.textColor,
                      height: selectedHeaderId === 2 ? "auto" : `${currentHeader.settings.height - 10}px`,
                      borderBottom: currentHeader.settings.enableDivider ? `${currentHeader.settings.dividerHeight} solid ${currentHeader.settings.dividerColor}` : "none"
                    }}
                  >
                    {/* Live Preview Logo with brand colors */}
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" style={{ maxHeight: 30, maxWidth: 120, objectFit: "contain" }} />
                    ) : (
                      <span className="mock-logo-text-center">
                        <span style={{ color: currentHeader.settings.enableTransparentHeader ? "#ffffff" : "#880d4f" }}>Pick </span>
                        <span style={{ color: "#ffbd00" }}>N </span>
                        <span style={{ color: currentHeader.settings.enableTransparentHeader ? "#ffffff" : "#880d4f" }}>Book</span>
                      </span>
                    )}

                    {currentHeader.settings.enableMenu && (
                      <div className="mock-links-row" style={{ order: currentHeader.settings.menuAlignment === "left" ? -1 : 0 }}>
                        {menuItems.filter(m => m.isActive).map(m => (
                          <span key={m.id} style={{ fontFamily: currentHeader.settings.menuFont, fontSize: currentHeader.settings.menuFontSize, textTransform: currentHeader.settings.menuTextTransform.toLowerCase() }}>
                            {m.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mock-right-group">
                      {currentHeader.settings.showSearch && <button type="button" className="mock-icon-button"><Search size={14} /></button>}
                      {currentHeader.settings.showWishlist && <button type="button" className="mock-icon-button"><Heart size={14} /></button>}
                      {currentHeader.settings.enableButton && (
                        <button 
                          type="button" 
                          className="mock-cta-button"
                          style={{
                            background: currentHeader.settings.btnBgColor,
                            color: currentHeader.settings.btnTextColor,
                            border: `1px solid ${currentHeader.settings.btnBorderColor || currentHeader.settings.btnBgColor}`,
                            borderRadius: `${currentHeader.settings.btnBorderRadius || 8}px`
                          }}
                        >
                          {currentHeader.settings.buttonText}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Content forms */}
              {activeTab === "basic" && (
                <div className="tab-inner-flex">
                  <div className="config-group">
                    <label className="config-input-label">Header Name &gt;</label>
                    <input 
                      type="text" 
                      value={currentHeader.settings.headerName} 
                      onChange={(e) => updateCurrentSettings("headerName", e.target.value)} 
                      className="config-textbox" 
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="config-group">
                      <label className="config-input-label">Header Type</label>
                      <select 
                        value={currentHeader.settings.stickyMenu ? "Fixed" : "Static"} 
                        onChange={(e) => updateCurrentSettings("stickyMenu", e.target.value === "Fixed")} 
                        className="config-select"
                      >
                        <option value="Fixed">Fixed</option>
                        <option value="Sticky">Sticky</option>
                        <option value="Static">Static</option>
                      </select>
                    </div>

                    <div className="config-group">
                      <label className="config-input-label">Header Width</label>
                      <div className="flex-row-align" style={{ marginTop: 8 }}>
                        <label className="flex-row-align" style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                          <input 
                            type="radio" 
                            name="headerWidth" 
                            checked={currentHeader.settings.headerWidth === "Full Width"} 
                            onChange={() => updateCurrentSettings("headerWidth", "Full Width")} 
                          />
                          Full Width
                        </label>
                        <label className="flex-row-align" style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                          <input 
                            type="radio" 
                            name="headerWidth" 
                            checked={currentHeader.settings.headerWidth === "Boxed"} 
                            onChange={() => updateCurrentSettings("headerWidth", "Boxed")} 
                          />
                          Boxed
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="config-group">
                      <label className="config-input-label">Logo</label>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {logoPreview ? (
                          <div className="logo-upload-container" style={{ padding: 10, display: "flex", alignItems: "center", position: "relative" }}>
                            <img src={logoPreview} alt="Brand logo" className="logo-preview-image" style={{ maxHeight: 32 }} />
                            <button type="button" className="btn-remove-logo" onClick={handleRemoveLogo}>&times;</button>
                          </div>
                        ) : (
                          <input type="file" accept="image/*" onChange={handleLogoChange} className="config-textbox" />
                        )}
                        <button type="button" className="btn-reset-settings" style={{ padding: "8px 12px" }}>Change Logo</button>
                      </div>
                    </div>

                    <div className="config-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
                      <span className="config-input-label" style={{ margin: 0 }}>Status</span>
                      <div className="flex-row-align">
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={currentHeader.settings.isActive} 
                            onChange={(e) => handleStatusToggle(e.target.checked)} 
                          />
                          <span className="slider-round"></span>
                        </label>
                        <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                          {currentHeader.settings.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Bar Tab */}
              {activeTab === "topbar" && (
                <div className="form-grid-two-col">
                  <div className="form-column-panel">
                    <div className="config-group">
                      <div className="switch-toggle-row">
                        <label className="config-input-label" style={{ margin: 0 }}>Enable Top Bar</label>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={currentHeader.settings.enableTopBar} 
                            onChange={(e) => updateCurrentSettings("enableTopBar", e.target.checked)} 
                          />
                          <span className="slider-round"></span>
                        </label>
                      </div>
                      <p className="config-group-desc">Show or hide the top bar section</p>
                    </div>

                    {currentHeader.settings.enableTopBar && (
                      <>
                        <h4 style={{ margin: "10px 0 6px 0", fontSize: "0.85rem", fontWeight: 700 }}>Top Bar Content</h4>
                        <div className="config-group">
                          <label className="config-input-label">Phone Number</label>
                          <input 
                            type="text" 
                            value={currentHeader.settings.phone} 
                            onChange={(e) => updateCurrentSettings("phone", e.target.value)} 
                            className="config-textbox" 
                          />
                        </div>
                        <div className="config-group">
                          <label className="config-input-label">Email Address</label>
                          <input 
                            type="email" 
                            value={currentHeader.settings.email} 
                            onChange={(e) => updateCurrentSettings("email", e.target.value)} 
                            className="config-textbox" 
                          />
                        </div>
                        <div className="config-group">
                          <label className="config-input-label">Address</label>
                          <input 
                            type="text" 
                            value={currentHeader.settings.address} 
                            onChange={(e) => updateCurrentSettings("address", e.target.value)} 
                            className="config-textbox" 
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="form-column-panel" style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 20 }}>
                    {currentHeader.settings.enableTopBar && (
                      <>
                        <h4 style={{ margin: "0 0 6px 0", fontSize: "0.85rem", fontWeight: 700 }}>Top Bar Options</h4>
                        <div className="config-group switch-toggle-row">
                          <span className="config-input-label" style={{ margin: 0 }}>Show Social Icons</span>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={currentHeader.settings.showSocialIcons} 
                              onChange={(e) => updateCurrentSettings("showSocialIcons", e.target.checked)} 
                            />
                            <span className="slider-round"></span>
                          </label>
                        </div>
                        <div className="config-group switch-toggle-row">
                          <span className="config-input-label" style={{ margin: 0 }}>Show Separator</span>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={currentHeader.settings.showSeparator} 
                              onChange={(e) => updateCurrentSettings("showSeparator", e.target.checked)} 
                            />
                            <span className="slider-round"></span>
                          </label>
                        </div>
                        <div className="config-group switch-toggle-row">
                          <span className="config-input-label" style={{ margin: 0 }}>Open links in new tab</span>
                          <label className="switch">
                            <input 
                              type="checkbox" 
                              checked={currentHeader.settings.openLinksInNewTab} 
                              onChange={(e) => updateCurrentSettings("openLinksInNewTab", e.target.checked)} 
                            />
                            <span className="slider-round"></span>
                          </label>
                        </div>

                        <h4 style={{ margin: "16px 0 6px 0", fontSize: "0.85rem", fontWeight: 700 }}>Social Links</h4>
                        {currentHeader.settings.socialLinks.map((s) => (
                          <div key={s.id} className="flex-row-align" style={{ marginBottom: 10 }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 600, width: 80, color: "#64748b" }}>{s.platform}</span>
                            <input 
                              type="text" 
                              value={s.url} 
                              onChange={(e) => handleSocialLinkChange(s.id, e.target.value)} 
                              className="config-textbox" 
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Menu Tab */}
              {activeTab === "menu" && (
                <div className="form-grid-two-col">
                  <div className="form-column-panel">
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "0.85rem", fontWeight: 700 }}>Menu Settings</h4>
                    <div className="config-group switch-toggle-row">
                      <span className="config-input-label" style={{ margin: 0 }}>Enable Menu</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={currentHeader.settings.enableMenu} 
                          onChange={(e) => updateCurrentSettings("enableMenu", e.target.checked)} 
                        />
                        <span className="slider-round"></span>
                      </label>
                    </div>
                    <div className="config-group">
                      <div className="switch-toggle-row">
                        <span className="config-input-label" style={{ margin: 0 }}>Sticky Menu</span>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={currentHeader.settings.stickyMenu} 
                            onChange={(e) => updateCurrentSettings("stickyMenu", e.target.checked)} 
                          />
                          <span className="slider-round"></span>
                        </label>
                      </div>
                      <p className="config-group-desc">Keep menu visible on scroll</p>
                    </div>
                    <div className="config-group switch-toggle-row">
                      <span className="config-input-label" style={{ margin: 0 }}>Show Search</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={currentHeader.settings.showSearch} 
                          onChange={(e) => updateCurrentSettings("showSearch", e.target.checked)} 
                        />
                        <span className="slider-round"></span>
                      </label>
                    </div>
                    <div className="config-group switch-toggle-row">
                      <span className="config-input-label" style={{ margin: 0 }}>Show Wishlist</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={currentHeader.settings.showWishlist} 
                          onChange={(e) => updateCurrentSettings("showWishlist", e.target.checked)} 
                        />
                        <span className="slider-round"></span>
                      </label>
                    </div>
                    <div className="config-group switch-toggle-row">
                      <span className="config-input-label" style={{ margin: 0 }}>Show Cart</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={currentHeader.settings.showCart} 
                          onChange={(e) => updateCurrentSettings("showCart", e.target.checked)} 
                        />
                        <span className="slider-round"></span>
                      </label>
                    </div>
                  </div>

                  <div className="form-column-panel" style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 20 }}>
                    <div className="config-group">
                      <label className="config-input-label">Menu Alignment</label>
                      <div className="align-toggle-group">
                        <button 
                          type="button" 
                          className={`align-toggle-btn ${currentHeader.settings.menuAlignment === "left" ? "selected" : ""}`}
                          onClick={() => updateCurrentSettings("menuAlignment", "left")}
                        >Left</button>
                        <button 
                          type="button" 
                          className={`align-toggle-btn ${currentHeader.settings.menuAlignment === "center" ? "selected" : ""}`}
                          onClick={() => updateCurrentSettings("menuAlignment", "center")}
                        >Center</button>
                        <button 
                          type="button" 
                          className={`align-toggle-btn ${currentHeader.settings.menuAlignment === "right" ? "selected" : ""}`}
                          onClick={() => updateCurrentSettings("menuAlignment", "right")}
                        >Right</button>
                      </div>
                    </div>

                    <div className="form-grid-2" style={{ marginTop: 12 }}>
                      <div className="config-group">
                        <label className="config-input-label">Menu Font</label>
                        <select value={currentHeader.settings.menuFont} onChange={(e) => updateCurrentSettings("menuFont", e.target.value)} className="config-select">
                          <option value="Poppins">Poppins</option>
                          <option value="Inter">Inter</option>
                          <option value="Roboto">Roboto</option>
                        </select>
                      </div>
                      <div className="config-group">
                        <label className="config-input-label">Menu Font Size</label>
                        <select value={currentHeader.settings.menuFontSize} onChange={(e) => updateCurrentSettings("menuFontSize", e.target.value)} className="config-select">
                          <option value="12px">12px</option>
                          <option value="14px">14px</option>
                          <option value="16px">16px</option>
                        </select>
                      </div>
                    </div>

                    <div className="config-group">
                      <label className="config-input-label">Menu Text Transform</label>
                      <div className="flex-row-align" style={{ marginTop: 8 }}>
                        <label className="flex-row-align" style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                          <input 
                            type="radio" 
                            name="menuTextTransform" 
                            checked={currentHeader.settings.menuTextTransform === "Normal"} 
                            onChange={() => updateCurrentSettings("menuTextTransform", "Normal")} 
                          />
                          Normal
                        </label>
                        <label className="flex-row-align" style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                          <input 
                            type="radio" 
                            name="menuTextTransform" 
                            checked={currentHeader.settings.menuTextTransform === "Uppercase"} 
                            onChange={() => updateCurrentSettings("menuTextTransform", "Uppercase")} 
                          />
                          Uppercase
                        </label>
                        <label className="flex-row-align" style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                          <input 
                            type="radio" 
                            name="menuTextTransform" 
                            checked={currentHeader.settings.menuTextTransform === "Capitalize"} 
                            onChange={() => updateCurrentSettings("menuTextTransform", "Capitalize")} 
                          />
                          Capitalize
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Button Tab */}
              {activeTab === "button" && (
                <div className="form-grid-two-col">
                  <div className="form-column-panel">
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "0.85rem", fontWeight: 700 }}>Header Button Settings</h4>
                    <div className="config-group switch-toggle-row" style={{ marginBottom: 20 }}>
                      <label className="config-input-label" style={{ margin: 0 }}>Enable Button</label>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={currentHeader.settings.enableButton} 
                          onChange={(e) => updateCurrentSettings("enableButton", e.target.checked)} 
                        />
                        <span className="slider-round"></span>
                      </label>
                    </div>

                    {currentHeader.settings.enableButton && (
                      <>
                        <div className="config-group">
                          <label className="config-input-label">Button Text</label>
                          <input 
                            type="text" 
                            value={currentHeader.settings.buttonText} 
                            onChange={(e) => updateCurrentSettings("buttonText", e.target.value)} 
                            className="config-textbox" 
                          />
                        </div>
                        <div className="config-group">
                          <label className="config-input-label">Button Link</label>
                          <input 
                            type="text" 
                            value={currentHeader.settings.buttonLink} 
                            onChange={(e) => updateCurrentSettings("buttonLink", e.target.value)} 
                            className="config-textbox" 
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="form-column-panel" style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 20 }}>
                    {currentHeader.settings.enableButton && (
                      <>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: "0.85rem", fontWeight: 700 }}>Button Color</h4>
                        <div className="form-grid-2">
                          <div className="config-group">
                            <label className="config-input-label">Background Color</label>
                            <div className="color-selector-wrap" style={{ display: "flex", gap: 6 }}>
                              <input type="color" value={currentHeader.settings.btnBgColor} onChange={(e) => updateCurrentSettings("btnBgColor", e.target.value)} />
                              <input type="text" value={currentHeader.settings.btnBgColor} onChange={(e) => updateCurrentSettings("btnBgColor", e.target.value)} className="config-textbox" />
                            </div>
                          </div>
                          <div className="config-group">
                            <label className="config-input-label">Text Color</label>
                            <div className="color-selector-wrap" style={{ display: "flex", gap: 6 }}>
                              <input type="color" value={currentHeader.settings.btnTextColor} onChange={(e) => updateCurrentSettings("btnTextColor", e.target.value)} />
                              <input type="text" value={currentHeader.settings.btnTextColor} onChange={(e) => updateCurrentSettings("btnTextColor", e.target.value)} className="config-textbox" />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Style Tab */}
              {activeTab === "style" && (
                <div className="form-grid-two-col">
                  <div className="form-column-panel">
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "0.85rem", fontWeight: 700 }}>Header Style Settings</h4>
                    <div className="config-group">
                      <label className="config-input-label">Header Background</label>
                      <div className="color-selector-wrap" style={{ display: "flex", gap: 6 }}>
                        <input type="color" value={currentHeader.settings.bgColor} onChange={(e) => updateCurrentSettings("bgColor", e.target.value)} />
                        <input type="text" value={currentHeader.settings.bgColor} onChange={(e) => updateCurrentSettings("bgColor", e.target.value)} className="config-textbox" />
                      </div>
                    </div>
                    <div className="config-group">
                      <label className="config-input-label">Header Text Color</label>
                      <div className="color-selector-wrap" style={{ display: "flex", gap: 6 }}>
                        <input type="color" value={currentHeader.settings.textColor} onChange={(e) => updateCurrentSettings("textColor", e.target.value)} />
                        <input type="text" value={currentHeader.settings.textColor} onChange={(e) => updateCurrentSettings("textColor", e.target.value)} className="config-textbox" />
                      </div>
                    </div>
                    <div className="config-group">
                      <label className="config-input-label">Border Color</label>
                      <div className="color-selector-wrap" style={{ display: "flex", gap: 6 }}>
                        <input type="color" value={currentHeader.settings.dividerColor} onChange={(e) => updateCurrentSettings("dividerColor", e.target.value)} />
                        <input type="text" value={currentHeader.settings.dividerColor} onChange={(e) => updateCurrentSettings("dividerColor", e.target.value)} className="config-textbox" />
                      </div>
                    </div>
                    <div className="config-group">
                      <label className="config-input-label">Header Shadow</label>
                      <select value={currentHeader.settings.headerShadow} onChange={(e) => updateCurrentSettings("headerShadow", e.target.value)} className="config-select">
                        <option value="None">None</option>
                        <option value="Small">Small</option>
                        <option value="Medium">Medium</option>
                        <option value="Large">Large</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-column-panel" style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: 20 }}>
                    <h4 style={{ margin: "0 0 8px 0", fontSize: "0.85rem", fontWeight: 700 }}>Additional Settings</h4>
                    <div className="config-group switch-toggle-row">
                      <span className="config-input-label" style={{ margin: 0 }}>Enable Transparent Header</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={currentHeader.settings.enableTransparentHeader} 
                          onChange={(e) => updateCurrentSettings("enableTransparentHeader", e.target.checked)} 
                        />
                        <span className="slider-round"></span>
                      </label>
                    </div>
                    <div className="config-group switch-toggle-row">
                      <span className="config-input-label" style={{ margin: 0 }}>Enable Divider</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={currentHeader.settings.enableDivider} 
                          onChange={(e) => updateCurrentSettings("enableDivider", e.target.checked)} 
                        />
                        <span className="slider-round"></span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="bottom-actions-container">
                <button type="button" className="btn-reset-settings" onClick={() => { setIsEditing(false); setIsAdding(false); setNewHeaderDraft(null); }}>
                  Cancel
                </button>
                <button type="button" className="btn-save-settings" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Add Menu Item modal */}
      {showAddMenuModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h4>{editingMenuId ? "Edit Menu Item" : "Add Menu Item"}</h4>
            <form onSubmit={handleAddOrEditMenuItem}>
              <div className="config-group">
                <label className="config-input-label">Menu Label</label>
                <input
                  type="text"
                  value={newMenuLabel}
                  onChange={(e) => setNewMenuLabel(e.target.value)}
                  placeholder="e.g. Help Center"
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: 6, outline: "none", fontSize: "0.85rem" }}
                />
              </div>

              <div className="config-group">
                <label className="config-input-label">Link / Path</label>
                <input
                  type="text"
                  value={newMenuLink}
                  onChange={(e) => setNewMenuLink(e.target.value)}
                  placeholder="e.g. /help"
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: 6, outline: "none", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn-reset-settings" style={{ padding: "6px 12px" }} onClick={() => setShowAddMenuModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save-settings" style={{ padding: "6px 16px" }}>
                  {editingMenuId ? "Save" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
