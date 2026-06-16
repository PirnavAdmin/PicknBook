import React, { useState, useEffect } from "react";
import "./AirlineWebCheckLink.css";
import { getNextNumericId, useAdminList } from "../../../utils/adminPortalStorage";
import { listAirlineWebCheckins, createAirlineWebCheckin, deleteAirlineWebCheckin } from "../../../services/flightBookingService";

const normalizeCheckin = (checkin) => {
  if (!checkin) return { id: "", name: "Unknown", code: "NA", url: "" };
  return {
    id: checkin.id || checkin.Id || "",
    name: checkin.airlineName || checkin.AirlineName || checkin.airline || checkin.Airline || checkin.name || checkin.Name || "Unknown",
    code: checkin.airlineCode || checkin.AirlineCode || checkin.code || checkin.Code || "NA",
    url: checkin.webCheckinUrl || checkin.WebCheckinUrl || checkin.webCheckInUrl || checkin.WebCheckInUrl || checkin.webCheckinURL || checkin.WebCheckinURL || checkin.url || checkin.Url || ""
  };
};

function AirlineWebCheckLink() {
  const [page, setPage] = useState("list");
  const [airlines, setAirlines] = useState([]);
  const [localAirlines, setLocalAirlines] = useAdminList("airline-webcheck", [
    { id: 38, name: "IndiGo", code: "6E", url: "https://www.goindigo.in/web-check-in.html" },
  ]);

  const loadCheckins = async () => {
    try {
      const data = await listAirlineWebCheckins();
      if (Array.isArray(data)) {
        setAirlines(data.map(normalizeCheckin));
      } else {
        setAirlines(localAirlines);
      }
    } catch (e) {
      console.warn("Failed to load checkins from server, using local storage", e);
      setAirlines(localAirlines);
    }
  };

  useEffect(() => {
    loadCheckins();
  }, [localAirlines]);

  const [selectedAirline, setSelectedAirline] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: "", code: "", url: "" });

  // Navigation
  const goToAdd = () => {
    setFormData({ name: "", code: "", url: "" });
    setIsEditing(false);
    setEditId(null);
    setPage("add");
  };
  const goToList = () => {
    setIsEditing(false);
    setEditId(null);
    setPage("list");
  };

  // Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Edit Action
  const handleEdit = (item) => {
    setFormData({ name: item.name, code: item.code, url: item.url });
    setEditId(item.id);
    setIsEditing(true);
    setPage("add");
  };

  // Submit
  const handleSubmit = async () => {
    if (!formData.name || !formData.code || !formData.url) {
      alert("Please fill all fields");
      return;
    }

    const airlineCode = formData.code.trim().toUpperCase();
    const payload = {
      AirlineCode: airlineCode,
      Airline: formData.name,
      Url: formData.url
    };

    if (isEditing) {
      try {
        const updated = airlines.map((a) =>
          a.id === editId ? { ...a, name: formData.name, code: airlineCode, url: formData.url } : a
        );
        setAirlines(updated);
        setLocalAirlines(localAirlines.map((a) =>
          a.id === editId ? { ...a, name: formData.name, code: airlineCode, url: formData.url } : a
        ));
      } catch (error) {
        console.warn("Failed to update checkin", error);
      }
    } else {
      try {
        const created = await createAirlineWebCheckin(payload);
        setAirlines([...airlines, normalizeCheckin(created)]);
      } catch (error) {
        console.warn("Failed to save checkin to backend, saving locally", error);
        const newAirline = {
          id: getNextNumericId(localAirlines, 1),
          name: formData.name,
          code: airlineCode,
          url: formData.url
        };
        setLocalAirlines([...localAirlines, newAirline]);
      }
    }

    setFormData({ name: "", code: "", url: "" });
    setIsEditing(false);
    setEditId(null);
    setPage("list");
  };

  // Delete
  const handleDelete = async (id) => {
    try {
      await deleteAirlineWebCheckin(id);
    } catch (e) {
      console.warn("Failed to delete checkin from backend", e);
    }
    const updated = airlines.filter((a) => a.id !== id);
    setAirlines(updated);
    setLocalAirlines(localAirlines.filter((a) => a.id !== id));
  };

  // Clear Filter (reset demo data)
  const handleClear = () => {
    setAirlines([]);
    setLocalAirlines([]);
  };

  return (
    <div className="container">

      {/* LIST PAGE */}
      {page === "list" && (
        <>
          <div className="header">
            <h2>Airline WebCheck Link List</h2>
            <div className="actions">
              <button className="btn add" onClick={goToAdd}>
                + Add WebCheck Link
              </button>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>SN.</th>
                <th>ID</th>
                <th>Airline</th>
                <th>Airline Code</th>
                <th>Url</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {airlines.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.code}</td>
                  <td>{item.url}</td>
                  <td className="action-buttons" style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                    <button
                      className="icon-btn view"
                      title="View"
                      onClick={() => setSelectedAirline(item)}
                    >
                      👁
                    </button>
                    <button
                      className="icon-btn edit"
                      title="Edit"
                      onClick={() => handleEdit(item)}
                    >
                      ✏
                    </button>
                    <button
                      className="icon-btn delete"
                      title="Delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ADD PAGE */}
      {page === "add" && (
        <>
          <div className="header">
            <h2>Add Airline WebCheck Link</h2>
            <button className="btn back" onClick={goToList}>
              Airline WebCheckin List
            </button>
          </div>

          <div className="form-box">
            <div className="form-title">Basic Details</div>

            <div className="form-row">
              <div className="input-group">
                <label>Airline Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Airline Name (e.g. IndiGo)"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label>Airline Code</label>
                <input
                  type="text"
                  name="code"
                  placeholder="Airline Code (e.g. 6E)"
                  value={formData.code}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label>Url</label>
                <input
                  type="text"
                  name="url"
                  placeholder="AirLine Url"
                  value={formData.url}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button className="submit-btn" style={{ marginTop: 0 }} onClick={handleSubmit}>
                SUBMIT
              </button>
            </div>
          </div>
        </>
      )}

      {selectedAirline ? (
        <div className="admin-view-backdrop" onClick={() => setSelectedAirline(null)} style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }}>
          <div className="form-box" style={{ width: "min(500px, 95vw)", padding: "20px", background: "var(--admin-surface)", borderRadius: "12px", border: "1px solid var(--admin-border)", boxShadow: "0 24px 48px rgba(0, 0, 0, 0.1)" }} onClick={(e) => e.stopPropagation()}>
            <div className="form-title">WebCheck Link Details</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px", color: "var(--admin-text)" }}>
              <div>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--admin-muted)" }}>ID</span>
                <div style={{ fontSize: "14px", fontWeight: "bold" }}>{selectedAirline.id}</div>
              </div>
              <div>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--admin-muted)" }}>Airline Name</span>
                <div style={{ fontSize: "14px", fontWeight: "bold" }}>{selectedAirline.name}</div>
              </div>
              <div>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--admin-muted)" }}>Airline Code</span>
                <div style={{ fontSize: "14px", fontWeight: "bold" }}>{selectedAirline.code}</div>
              </div>
              <div>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--admin-muted)" }}>WebCheckin URL</span>
                <div style={{ fontSize: "14px", fontWeight: "bold", wordBreak: "break-all" }}>
                  <a href={selectedAirline.url} target="_blank" rel="noreferrer" style={{ color: "var(--admin-primary)" }}>{selectedAirline.url}</a>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="submit-btn" style={{ marginTop: 0 }} onClick={() => setSelectedAirline(null)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AirlineWebCheckLink;
