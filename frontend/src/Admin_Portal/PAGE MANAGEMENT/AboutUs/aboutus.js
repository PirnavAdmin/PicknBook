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
        countSection: data?.countSection || [],
        teamMembers: data?.teamMembers || [],
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
      <div className="top-bar">
        <h2>Manage <span style={{ color: "#000" }}>About Us</span></h2>
      </div>

      {loading && !formData.aboutDescription ? (
        <div className="loading-state">Loading About Us details...</div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* About Description */}
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

          {/* Count Section */}
          <div className="form-section">
            <div className="section-header">
              <h3><span className="title-tab">Count Section</span></h3>
              <button type="button" className="add-row-btn" onClick={addCountRow} disabled={loading}>
                + Add Row
              </button>
            </div>
            {formData.countSection.length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", padding: "20px 0" }}>
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

          {/* Who We Are */}
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

          {/* Team Members */}
          <div className="form-section">
            <div className="section-header">
              <h3><span className="title-tab">Team Members</span></h3>
              <button type="button" className="add-row-btn" onClick={addTeamRow} disabled={loading}>
                + Add Member
              </button>
            </div>
            <table className="about-sub-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Image URL</th>
                  <th>Display Order</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {formData.teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-row">No team members configured.</td>
                  </tr>
                ) : (
                  formData.teamMembers.map((member, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          placeholder="Name"
                          value={member.name}
                          onChange={(e) => handleTeamChange(index, "name", e.target.value)}
                          disabled={loading}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="Designation"
                          value={member.designation}
                          onChange={(e) => handleTeamChange(index, "designation", e.target.value)}
                          disabled={loading}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="Image URL"
                          value={member.imageUrl}
                          onChange={(e) => handleTeamChange(index, "imageUrl", e.target.value)}
                          disabled={loading}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={member.displayOrder}
                          onChange={(e) => handleTeamChange(index, "displayOrder", e.target.value)}
                          disabled={loading}
                        />
                      </td>
                      <td className="action-td">
                        <button
                          type="button"
                          className="delete-row-btn"
                          onClick={() => removeTeamRow(index)}
                          disabled={loading}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {error && <p className="error-msg">{error}</p>}
          {saved && <p className="success-msg">About Us page updated successfully.</p>}

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
