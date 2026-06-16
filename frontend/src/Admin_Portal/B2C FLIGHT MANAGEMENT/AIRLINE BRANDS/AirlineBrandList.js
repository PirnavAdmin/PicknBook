import React, { useState } from "react";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import "./Airline BrandList.css";
import { getNextNumericId, useAdminList } from "../../../utils/adminPortalStorage";

function AirlineBrands() {
  const [page, setPage] = useState("list");

  const [airlines, setAirlines] = useAdminList("airline-brands", [
    { id: 221, name: "IndiGo", code: "6E", status: "Active", image: "", imageName: "" },
    { id: 150, name: "Akasa Air", code: "QP", status: "Active", image: "", imageName: "" },
    { id: 149, name: "Air India", code: "AI", status: "Active", image: "", imageName: "" },
    { id: 148, name: "Air Asia India", code: "I5", status: "Active", image: "", imageName: "" }
  ]);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    status: "Active",
    image: "",
    imageName: ""
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Navigation
  const goToAdd = () => {
    setFormData({ name: "", code: "", status: "Active", image: "", imageName: "" });
    setIsEditing(false);
    setEditId(null);
    setPage("add");
  };
  const goToList = () => {
    setIsEditing(false);
    setEditId(null);
    setPage("list");
  };

  // Edit Action
  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      code: item.code,
      status: item.status,
      image: item.image || "",
      imageName: item.imageName || ""
    });
    setEditId(item.id);
    setIsEditing(true);
    setPage("add");
  };

  // File Change Handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        alert("Invalid file type. Please select a PDF, JPG, JPEG, or PNG file.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          image: reader.result, // base64 string
          imageName: file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Add/Update Airline
  const handleSubmit = () => {
    if (!formData.name || !formData.code) {
      alert("Please fill all fields");
      return;
    }

    if (isEditing) {
      const updated = airlines.map((a) =>
        a.id === editId
          ? {
              ...a,
              name: formData.name,
              code: formData.code.trim().toUpperCase(),
              status: formData.status,
              image: formData.image,
              imageName: formData.imageName
            }
          : a
      );
      setAirlines(updated);
    } else {
      const newItem = {
        id: getNextNumericId(airlines, 1),
        name: formData.name,
        code: formData.code.trim().toUpperCase(),
        status: formData.status,
        image: formData.image || "",
        imageName: formData.imageName || ""
      };
      setAirlines([...airlines, newItem]);
    }

    setFormData({ name: "", code: "", status: "Active", image: "", imageName: "" });
    setIsEditing(false);
    setEditId(null);
    setPage("list");
  };

  // Delete
  const handleDelete = (id) => {
    setAirlines(airlines.filter((a) => a.id !== id));
  };

  // Export (JSON download)
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(airlines, null, 2)], {
      type: "application/json"
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "airlines.json";
    link.click();
  };

  const handleViewImage = (item) => {
    if (!item.image) {
      alert("No image/file uploaded for this airline brand.");
      return;
    }
    setPreviewImage(item);
  };

  return (
    <div className="container">

      {/* LIST PAGE */}
      {page === "list" && (
        <>
          <div className="header">
            <h2>Airline Brand List</h2>
            <div className="actions">
              <button className="btn add" onClick={goToAdd}>
                + Add Airline Brand
              </button>
              <button className="btn export" onClick={handleExport}>
                Export
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
                <th>Image</th>
                <th>Status</th>
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

                  <td>
                    {item.image ? (
                      <button className="view-btn" onClick={() => handleViewImage(item)}>
                        View
                      </button>
                    ) : (
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>No Image</span>
                    )}
                  </td>

                  <td>
                    <span
                      className={
                        item.status === "Active"
                          ? "status active"
                          : "status inactive"
                      }
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="action-buttons" style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                    <button
                      className="icon-btn view"
                      title="View Image"
                      onClick={() => handleViewImage(item)}
                      disabled={!item.image}
                      style={{ opacity: item.image ? 1 : 0.5, cursor: item.image ? "pointer" : "not-allowed" }}
                    >
                      <Eye size={14} />
                    </button>

                    <button
                      className="icon-btn edit"
                      title="Edit"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      className="icon-btn delete"
                      title="Delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={14} />
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
            <h2>{isEditing ? "Edit Airline Brand" : "Add Airline Brand"}</h2>
            <button className="btn back" onClick={goToList}>
              Airline Brand List
            </button>
          </div>

          <div className="form-box">
            <div className="form-title">Basic Details</div>

            <div className="form-row">
              <div className="input-group">
                <label>Airline Name</label>
                <input
                  type="text"
                  placeholder="Airline Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Airline Code</label>
                <input
                  type="text"
                  placeholder="Airline Code (e.g. AI)"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="input-group">
                <label>Choose a File (PDF, JPG, JPEG, PNG)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
                {formData.imageName && (
                  <div style={{ marginTop: "5px", fontSize: "12px", color: "var(--admin-text)" }}>
                    Selected file: <strong>{formData.imageName}</strong>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button className="submit-btn" style={{ marginTop: 0 }} onClick={handleSubmit}>
                {isEditing ? "UPDATE" : "SUBMIT"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* PREVIEW MODAL */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{previewImage.name} - Logo Preview</h3>
              <button className="close-btn" onClick={() => setPreviewImage(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "center", padding: "20px" }}>
              {previewImage.image.startsWith("data:application/pdf") ? (
                <embed src={previewImage.image} type="application/pdf" width="100%" height="450px" />
              ) : (
                <img src={previewImage.image} alt="Preview" style={{ maxWidth: "100%", maxHeight: "350px", objectFit: "contain" }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AirlineBrands;
