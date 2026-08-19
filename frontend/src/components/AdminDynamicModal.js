import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, Pencil, Trash2, Clock, Calendar, Tag, Info, FileText } from "lucide-react";
import { toApiAssetUrl, NgrokSafeImage } from "../services/apiClient";
import "./AdminDynamicModal.css";

const formatDateCustom = (val) => {
  if (!val) return "";
  const date = new Date(val);
  if (isNaN(date.getTime())) return String(val);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const formatKeyLabel = (key) => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const toInputDateFormat = (val) => {
  if (!val) return "";
  const date = new Date(val);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const toInputDatetimeFormat = (val) => {
  if (!val) return "";
  const date = new Date(val);
  if (isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function AdminDynamicModal({
  isOpen,
  mode, // 'view' | 'edit' | 'delete'
  moduleName, // e.g. "Blog", "Offer", "Customer"
  data, // selected record data object
  schema = [], // array of fields: { name, label, type, options, required }
  onClose,
  onSave, // callback for edit save: (updatedData) => {}
  onDelete, // callback for delete confirm
}) {
  const [localMode, setLocalMode] = useState(mode);
  const [formData, setFormData] = useState({});
  const [imagePreviews, setImagePreviews] = useState({});

  useEffect(() => {
    setLocalMode(mode);
  }, [mode, isOpen]);

  useEffect(() => {
    if (localMode === "edit" && data) {
      const initialForm = {};
      const initialPreviews = {};

      schema.forEach((field) => {
        const val = data[field.name];
        if (field.type === "date") {
          initialForm[field.name] = toInputDateFormat(val);
        } else if (field.type === "datetime-local") {
          initialForm[field.name] = toInputDatetimeFormat(val);
        } else if (field.type === "boolean" || field.type === "checkbox") {
          initialForm[field.name] = val === true || val === "Yes" || val === "Active" || val === "active";
        } else {
          initialForm[field.name] = val ?? "";
        }

        if ((field.type === "image" || field.type === "file") && val) {
          initialPreviews[field.name] = typeof val === "string" ? val : "";
        }
      });
      setFormData(initialForm);
      setImagePreviews(initialPreviews);
    }
  }, [localMode, data, schema]);

  if (!isOpen || !data) return null;

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (name) => (e) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreviews((prev) => ({ ...prev, [name]: previewUrl }));
      setFormData((prev) => ({ ...prev, [name]: file }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave(formData);
  };

  const getRecordName = () => {
    if (!data) return "";
    return data.title || data.name || data.customerName || data.displayTitle || data.offerCode || data.slug || data.id || "";
  };

  const isImageValue = (val) => {
    if (typeof val !== "string") return false;
    const clean = val.toLowerCase();
    return (
      clean.startsWith("http") || clean.startsWith("/") ||
      clean.includes("assets") || clean.includes("image") || clean.includes("uploads") ||
      /\.(jpg|jpeg|png|gif|webp|svg)/i.test(clean)
    );
  };

  /* ============================== VIEW MODE ============================== */
  const renderViewContent = () => {
    // Collect image field
    let recordImage = null;
    const imageKeys = ["imageUrl", "image", "imagePath", "imageVal", "coverImage", "thumbnail"];
    for (const key of imageKeys) {
      if (data[key] && data[key] !== "-" && isImageValue(data[key])) {
        recordImage = data[key];
        break;
      }
    }
    // Also check schema
    if (!recordImage && schema.length > 0) {
      const imgField = schema.find(f => f.type === "image" || f.type === "file");
      if (imgField && data[imgField.name] && isImageValue(data[imgField.name])) {
        recordImage = data[imgField.name];
      }
    }

    // Collect all fields
    const allFields = [];
    const ignoredKeys = ["id", "_id", "createdAt", "updatedAt", "v", "__v", "password", "pin"];
    if (schema.length > 0) {
      schema.forEach((f) => {
        const val = data[f.name];
        if (val !== null && val !== undefined && val !== "" && val !== "-") {
          allFields.push({ name: f.name, label: f.label, value: val, type: f.type });
        }
      });
    } else {
      Object.keys(data).forEach((key) => {
        const val = data[key];
        if (!ignoredKeys.includes(key) && val !== null && val !== undefined && val !== "" && val !== "-") {
          allFields.push({
            name: key,
            label: formatKeyLabel(key),
            value: val,
            type: isImageValue(val) ? "image" : typeof val === "boolean" ? "boolean" : "text",
          });
        }
      });
    }

    // Group fields into categories
    const basicInfo = [];
    const metricsInfo = [];
    const dateInfo = [];
    const textInfo = [];
    const imageFields = [];

    allFields.forEach((f) => {
      const val = f.value;
      const nameLower = f.name.toLowerCase();

      // Skip image fields (handled in header)
      if (f.type === "image" || isImageValue(val)) {
        imageFields.push(f);
        return;
      }

      const isDate = nameLower.includes("date") || nameLower.includes("time") || nameLower.includes("created") ||
        nameLower.includes("updated") || nameLower.includes("starts") || nameLower.includes("ends") ||
        nameLower.includes("expires") || nameLower.includes("expiry");
      const isLongText = typeof val === "string" && (val.length > 80 || nameLower.includes("description") ||
        nameLower.includes("content") || nameLower.includes("terms") || nameLower.includes("condition") ||
        nameLower.includes("comment") || nameLower.includes("message") || nameLower.includes("note"));
      const isNumeric = !isNaN(Number(val)) && typeof val !== "boolean";
      const isMetric = isNumeric || nameLower.includes("discount") || nameLower.includes("balance") ||
        nameLower.includes("price") || nameLower.includes("amount") || nameLower.includes("limit") ||
        nameLower.includes("usage") || nameLower.includes("count") || nameLower.includes("seats") ||
        nameLower.includes("order") || nameLower.includes("fee") || nameLower.includes("value") ||
        nameLower.includes("currency") || nameLower.includes("minimum") || nameLower.includes("maximum");

      if (isLongText) {
        textInfo.push(f);
      } else if (isDate) {
        dateInfo.push(f);
      } else if (isMetric) {
        metricsInfo.push(f);
      } else {
        basicInfo.push(f);
      }
    });

    const formatVal = (f) => {
      let val = f.value;
      if (typeof val === "boolean") {
        const isStatus = f.name.toLowerCase().includes("status") || f.name.toLowerCase().includes("active");
        return val ? (isStatus ? "Active" : "Yes") : (isStatus ? "Inactive" : "No");
      }
      const nameLower = f.name.toLowerCase();
      const isDateField = nameLower.includes("date") || nameLower.includes("time") || nameLower.includes("created") ||
        nameLower.includes("updated") || nameLower.includes("starts") || nameLower.includes("ends") || nameLower.includes("expires");
      if (isDateField && typeof val === "string" && !isNaN(Date.parse(val))) {
        return formatDateCustom(val);
      }
      const isCurrency = nameLower.includes("amount") || nameLower.includes("price") || nameLower.includes("balance") ||
        nameLower.includes("fee") || nameLower.includes("discountvalue");
      if (isCurrency && !isNaN(Number(val))) {
        return `₹${Number(val).toLocaleString("en-IN")}`;
      }
      return String(val);
    };

    const renderStatusPill = (val) => {
      if (typeof val !== "string") return null;
      const lower = val.toLowerCase();
      if (lower === "active" || lower === "yes" || lower === "true") {
        return <span className="pv-status-pill active">{val}</span>;
      }
      if (lower === "inactive" || lower === "no" || lower === "false" || lower === "deactive") {
        return <span className="pv-status-pill inactive">{val}</span>;
      }
      return <span className="pv-status-pill neutral">{val}</span>;
    };

    const renderFieldValue = (f) => {
      const nameLower = f.name.toLowerCase();
      if (nameLower.includes("status") || nameLower.includes("active")) {
        return renderStatusPill(formatVal(f));
      }
      return <span>{formatVal(f)}</span>;
    };

    return (
      <div className="pv-container">
        {/* ─── Top Header Banner ─── */}
        <div className="pv-header-banner">
          {recordImage && (
            <div className="pv-header-img-box">
              <NgrokSafeImage src={toApiAssetUrl(recordImage)} alt="Record" />
            </div>
          )}
          <div className="pv-header-info">
            <h3 className="pv-record-title">{getRecordName()}</h3>
            <div className="pv-header-badges">
              {data.category && <span className="pv-category-badge">{data.category}</span>}
              {data.type && <span className="pv-category-badge blue">{data.type}</span>}
              {data.bookingType && <span className="pv-category-badge blue">{data.bookingType}</span>}
              {data.status && renderStatusPill(typeof data.status === "boolean" ? (data.status ? "Active" : "Inactive") : data.status)}
            </div>
            {data.description && data.description.length <= 80 && (
              <p className="pv-header-desc">{data.description}</p>
            )}
          </div>

          <div className="pv-header-sidebar">
            {data.createdBy && (
              <div className="pv-sidebar-row">
                <Info size={13} />
                <span className="pv-sidebar-lbl">Created By</span>
                <span className="pv-sidebar-val">{data.createdBy}</span>
              </div>
            )}
            {(data.createdAt || data.entryDate || data.createdDate) && (
              <div className="pv-sidebar-row">
                <Clock size={13} />
                <span className="pv-sidebar-lbl">Created Date</span>
                <span className="pv-sidebar-val">{formatDateCustom(data.createdAt || data.entryDate || data.createdDate)}</span>
              </div>
            )}
            {(data.updatedAt || data.updateDate || data.updatedDate) && (
              <div className="pv-sidebar-row">
                <Clock size={13} />
                <span className="pv-sidebar-lbl">Updated Date</span>
                <span className="pv-sidebar-val">{formatDateCustom(data.updatedAt || data.updateDate || data.updatedDate)}</span>
              </div>
            )}
            {data.displayOrder !== undefined && (
              <div className="pv-sidebar-row">
                <Tag size={13} />
                <span className="pv-sidebar-lbl">Display Order</span>
                <span className="pv-sidebar-val">{data.displayOrder}</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Sections Grid ─── */}
        <div className="pv-sections-grid">
          {basicInfo.length > 0 && (
            <div className="pv-section-card">
              <div className="pv-section-hdr blue">
                <Info size={15} />
                <h4>Basic Information</h4>
              </div>
              <div className="pv-section-body">
                {basicInfo.map((f, i) => (
                  <div key={i} className="pv-info-row">
                    <span className="pv-info-lbl">{f.label}</span>
                    {renderFieldValue(f)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {metricsInfo.length > 0 && (
            <div className="pv-section-card">
              <div className="pv-section-hdr purple">
                <Tag size={15} />
                <h4>Details & Metrics</h4>
              </div>
              <div className="pv-section-body">
                {metricsInfo.map((f, i) => (
                  <div key={i} className="pv-info-row">
                    <span className="pv-info-lbl">{f.label}</span>
                    <span className="pv-info-val">{formatVal(f)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dateInfo.length > 0 && (
            <div className="pv-section-card">
              <div className="pv-section-hdr green">
                <Calendar size={15} />
                <h4>Date Information</h4>
              </div>
              <div className="pv-section-body">
                {dateInfo.map((f, i) => (
                  <div key={i} className="pv-info-row">
                    <span className="pv-info-lbl">{f.label}</span>
                    <span className="pv-info-val">{formatVal(f)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Full-width Text Sections ─── */}
        {textInfo.length > 0 && textInfo.map((f, i) => (
          <div key={i} className="pv-fullwidth-card">
            <div className="pv-section-hdr orange">
              <FileText size={15} />
              <h4>{f.label}</h4>
            </div>
            <div className="pv-text-body">
              <p>{formatVal(f)}</p>
            </div>
          </div>
        ))}

        {/* ─── Extra Image Fields ─── */}
        {imageFields.filter(f => f.value !== recordImage).map((f, i) => (
          <div key={i} className="pv-fullwidth-card">
            <div className="pv-section-hdr blue">
              <Info size={15} />
              <h4>{f.label}</h4>
            </div>
            <div className="pv-image-body">
              <NgrokSafeImage src={toApiAssetUrl(f.value)} alt={f.label} className="pv-detail-img" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ============================== EDIT MODE ============================== */
  const renderEditContent = () => {
    return (
      <form onSubmit={handleSubmit} className="dynamic-form-wrap">
        <div className="dynamic-edit-grid">
          {schema.map((field) => {
            const inputId = `edit-field-${field.name}`;

            if (field.type === "select") {
              return (
                <div key={field.name} className="dynamic-edit-field">
                  <label htmlFor={inputId}>{field.label} {field.required && "*"}</label>
                  <select
                    id={inputId}
                    value={formData[field.name] ?? ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.required}
                  >
                    <option value="">Select {field.label}</option>
                    {(field.options || []).map((opt) => {
                      const optVal = typeof opt === "object" ? opt.value : opt;
                      const optLabel = typeof opt === "object" ? opt.label : opt;
                      return <option key={optVal} value={optVal}>{optLabel}</option>;
                    })}
                  </select>
                </div>
              );
            }

            if (field.type === "textarea" || field.type === "richtext") {
              return (
                <div key={field.name} className="dynamic-edit-field-full">
                  <label htmlFor={inputId}>{field.label} {field.required && "*"}</label>
                  <textarea
                    id={inputId}
                    value={formData[field.name] ?? ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.required}
                    rows={4}
                  />
                </div>
              );
            }

            if (field.type === "image" || field.type === "file") {
              const previewSrc = imagePreviews[field.name];
              let resolvedPreviewSrc = previewSrc;
              if (previewSrc && !previewSrc.startsWith("blob:") && !previewSrc.startsWith("data:") && !previewSrc.startsWith("http")) {
                resolvedPreviewSrc = `http://localhost:5000/assets/uploads/${previewSrc}`;
              }
              return (
                <div key={field.name} className="dynamic-edit-field-full">
                  <label htmlFor={inputId}>{field.label} {field.required && "*"}</label>
                  {resolvedPreviewSrc && (
                    <div className="dynamic-edit-image-box">
                      <img src={resolvedPreviewSrc} alt="Preview" className="dynamic-edit-image-el" />
                    </div>
                  )}
                  <input id={inputId} type="file" accept="image/*" onChange={handleFileChange(field.name)} required={field.required && !resolvedPreviewSrc} />
                </div>
              );
            }

            if (field.type === "boolean" || field.type === "checkbox") {
              return (
                <div key={field.name} className="dynamic-edit-field checkbox-row">
                  <label className="checkbox-container">
                    <input id={inputId} type="checkbox" checked={Boolean(formData[field.name])} onChange={(e) => handleInputChange(field.name, e.target.checked)} />
                    <span className="checkbox-label-text">{field.label}</span>
                  </label>
                </div>
              );
            }

            const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime-local" ? "datetime-local" : "text";
            return (
              <div key={field.name} className="dynamic-edit-field">
                <label htmlFor={inputId}>{field.label} {field.required && "*"}</label>
                <input id={inputId} type={inputType} value={formData[field.name] ?? ""} onChange={(e) => handleInputChange(field.name, e.target.value)} required={field.required} />
              </div>
            );
          })}
        </div>

        <div className="dynamic-modal-actions">
          <button type="button" className="dynamic-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="dynamic-btn-primary">Save Changes</button>
        </div>
      </form>
    );
  };

  /* ============================== DELETE MODE ============================== */
  const renderDeleteContent = () => {
    return (
      <div className="dynamic-delete-modal-content">
        <div className="dynamic-delete-warning-icon">
          <AlertTriangle size={36} />
        </div>
        <p className="dynamic-delete-message">
          Are you sure you want to delete <strong>{getRecordName()}</strong>?
        </p>
        <p className="dynamic-delete-disclaimer">This action cannot be undone.</p>
        <div className="dynamic-modal-actions">
          <button type="button" className="dynamic-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="dynamic-btn-danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
    );
  };

  const getHeaderTitle = () => {
    if (localMode === "view") return `${moduleName} Details`;
    if (localMode === "edit") return `Edit ${moduleName}`;
    return `Delete ${moduleName}`;
  };

  return createPortal(
    <div className="dynamic-modal-backdrop" onClick={onClose}>
      <div className={`dynamic-modal-card mode-${localMode}`} onClick={(e) => e.stopPropagation()}>
        <header className="dynamic-modal-header">
          <div className="modal-header-left">
            <h2>{getHeaderTitle()}</h2>
            {localMode === "view" && data.id && <span className="modal-header-id-badge">#{data.id}</span>}
          </div>
          <div className="modal-header-actions">
            {localMode === "view" && (
              <>
                <button type="button" className="modal-action-btn-edit" onClick={() => setLocalMode("edit")}>
                  <Pencil size={14} /> Edit {moduleName}
                </button>
                <button type="button" className="modal-action-btn-delete" onClick={() => setLocalMode("delete")}>
                  <Trash2 size={14} /> Delete {moduleName}
                </button>
              </>
            )}
            <button type="button" className="dynamic-modal-close-btn" onClick={onClose} aria-label="Close dialog">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="dynamic-modal-body">
          {localMode === "view" && renderViewContent()}
          {localMode === "edit" && renderEditContent()}
          {localMode === "delete" && renderDeleteContent()}
        </div>
      </div>
    </div>,
    document.body
  );
}
