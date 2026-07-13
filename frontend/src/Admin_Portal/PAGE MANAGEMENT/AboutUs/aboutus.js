import React, { useEffect, useState } from "react";
import "./aboutus.css";
import { getAdminAboutUs, updateAdminAboutUs } from "../../../services/cmsPageService";

export default function AdminAboutUsPage() {
  const [module, setModule] = useState("B2C");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    aboutDescription: "",
    status: "Active",
    whoWeAre: {
      heading: "",
      details: "",
      imageUrl: "",
    },
    countSection: [],
    teamMembers: [],
  });

  const loadAboutUs = async (selectedModule) => {
    try {
      setLoading(true);
      setError("");
      setSaved(false);
      const data = await getAdminAboutUs(selectedModule);
      setFormData({
        aboutDescription: data?.aboutDescription || "",
        status: data?.status || "Active",
        whoWeAre: {
          heading: data?.whoWeAre?.heading || "",
          details: data?.whoWeAre?.details || "",
          imageUrl: data?.whoWeAre?.imageUrl || "",
        },
        countSection: [],
        teamMembers: [],
      });
    } catch (err) {
      console.error("Error loading About Us:", err);
      setError("Failed to load About Us details from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAboutUs(module);
  }, [module]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleWhoWeAreChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      whoWeAre: { ...prev.whoWeAre, [field]: value },
    }));
  };

  // Count section actions
  const handleCountChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.countSection];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, countSection: updated };
    });
  };

  const addCountRow = () => {
    setFormData((prev) => ({
      ...prev,
      countSection: [
        ...prev.countSection,
        { countValue: "", countTitle: "", displayOrder: prev.countSection.length + 1 },
      ],
    }));
  };

  const removeCountRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      countSection: prev.countSection.filter((_, i) => i !== index),
    }));
  };

  // Team section actions
  const handleTeamChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.teamMembers];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, teamMembers: updated };
    });
  };

  const addTeamRow = () => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: [
        ...prev.teamMembers,
        { name: "", designation: "", imageUrl: "", displayOrder: prev.teamMembers.length + 1 },
      ],
    }));
  };

  const removeTeamRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSaved(false);

      const payload = {
        module: module,
        status: formData.status,
        aboutDescription: formData.aboutDescription,
        whoWeAre: formData.whoWeAre,
        countSection: formData.countSection.map((item) => ({
          countValue: item.countValue,
          countTitle: item.countTitle,
          displayOrder: Number(item.displayOrder) || 1,
        })),
        teamMembers: formData.teamMembers.map((member) => ({
          name: member.name,
          designation: member.designation,
          imageUrl: member.imageUrl,
          displayOrder: Number(member.displayOrder) || 1,
        })),
      };

      await updateAdminAboutUs(payload);
      setSaved(true);
      loadAboutUs(module);
    } catch (err) {
      console.error("Error updating About Us page:", err);
      setError(err.response?.data?.message || err.message || "Failed to save updates.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="about-container">
      {loading && !formData.aboutDescription ? (
        <div className="loading-state">Loading About Us details...</div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Top Header outside containers */}
          <div className="about-page-header" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0 10px 0',
            borderBottom: '1.5px solid #f1f5f9',
            marginBottom: '16px'
          }}>
            <h2 className="about-page-heading" style={{
              fontSize: '1.5rem',
              fontWeight: 500,
              color: '#A51C49',
              margin: 0
            }}>Manage About Us</h2>
          </div>


          {/* Section 1: About Description */}
          <div className="form-section">
            <h3><span className="title-tab">About Description</span></h3>
            <div className="form-grid">
              <div className="form-group wide">
                <label>Description</label>
                <textarea
                  placeholder="Enter About Description..."
                  value={formData.aboutDescription}
                  onChange={(e) => handleChange("aboutDescription", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  disabled={loading}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label>Module</label>
                <select value={module} onChange={(e) => setModule(e.target.value)} disabled={loading}>
                  <option value="B2C">B2C</option>
                  <option value="B2B">B2B</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Count Section */}
          <div className="form-section">
            <div className="section-header" style={{ marginTop: 0 }}>
              <h3><span className="title-tab">Count Section</span></h3>
              <button type="button" className="add-row-btn" onClick={addCountRow} disabled={loading}>
                + Add Row
              </button>
            </div>
            {formData.countSection.length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", padding: "16px 0", margin: 0 }}>
                No statistics configured. Click "+ Add Row" to add one.
              </p>
            ) : (
              <div className="count-grid">
                {formData.countSection.map((item, index) => (
                  <React.Fragment key={index}>
                    <div className="count-pair">
                      <label>Count Value</label>
                      <input
                        type="text"
                        placeholder="e.g. 100+"
                        value={item.countValue}
                        onChange={(e) => handleCountChange(index, "countValue", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="count-pair" style={{ position: "relative" }}>
                      <label>Count Title</label>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                          type="text"
                          placeholder="e.g. years"
                          value={item.countTitle}
                          onChange={(e) => handleCountChange(index, "countTitle", e.target.value)}
                          disabled={loading}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="delete-row-btn"
                          onClick={() => removeCountRow(index)}
                          disabled={loading}
                          title="Remove"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Who We Are */}
          <div className="form-section">
            <h3><span className="title-tab">Who We Are</span></h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleWhoWeAreChange("imageUrl", file.name);
                    }
                  }}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Heading</label>
                <input
                  type="text"
                  placeholder="Heading"
                  value={formData.whoWeAre.heading}
                  onChange={(e) => handleWhoWeAreChange("heading", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="form-group wide">
                <label>Description</label>
                <textarea
                  placeholder="Details..."
                  value={formData.whoWeAre.details}
                  onChange={(e) => handleWhoWeAreChange("details", e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Team Members */}
          <div className="form-section">
            <div className="section-header" style={{ marginTop: 0 }}>
              <h3><span className="title-tab">Team Members</span></h3>
              <button type="button" className="add-row-btn" onClick={addTeamRow} disabled={loading}>
                + Add Member
              </button>
            </div>
            {formData.teamMembers.length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", padding: "16px 0", margin: 0 }}>
                No team members configured. Click "+ Add Member" to add one.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '15px', padding: '10px 0' }}>
                {formData.teamMembers.map((member, index) => (
                  <div key={index} style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.2fr 1.8fr 80px 42px',
                    gap: '12px',
                    alignItems: 'end',
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div className="form-group" style={{ gap: '2px' }}>
                      <label>Name</label>
                      <input
                        type="text"
                        placeholder="Name"
                        value={member.name}
                        onChange={(e) => handleTeamChange(index, "name", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group" style={{ gap: '2px' }}>
                      <label>Designation</label>
                      <input
                        type="text"
                        placeholder="Designation"
                        value={member.designation}
                        onChange={(e) => handleTeamChange(index, "designation", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group" style={{ gap: '2px' }}>
                      <label>Image URL</label>
                      <input
                        type="text"
                        placeholder="Image URL"
                        value={member.imageUrl}
                        onChange={(e) => handleTeamChange(index, "imageUrl", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group" style={{ gap: '2px' }}>
                      <label>Order</label>
                      <input
                        type="number"
                        value={member.displayOrder}
                        onChange={(e) => handleTeamChange(index, "displayOrder", e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group" style={{ gap: '2px' }}>
                      <label style={{ visibility: 'hidden', height: '17px' }}>Action</label>

                      <button
                        type="button"
                        className="delete-row-btn"
                        onClick={() => removeTeamRow(index)}
                        disabled={loading}
                        style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, padding: 0 }}
                      >
                        🗑
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="error-msg" style={{ marginTop: '16px' }}>{error}</p>}
          {saved && <p className="success-msg" style={{ marginTop: '16px' }}>About Us page updated successfully.</p>}

          <div className="submit-area">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "SAVING..." : "SAVE ABOUT US DATA"}
            </button>
          </div>
        </form>

      )}
    </div>
  );
}

