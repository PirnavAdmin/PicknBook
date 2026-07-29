/* eslint-disable */
import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, PencilLine, Eye, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./HotelConvenienceFee.css";
import { getHotelConvenienceFees, saveHotelConvenienceFee } from "../../../services/adminHotelService";
import AdminPagination from "../../../components/AdminPagination";

const inrFormatter = {
  format: (value) => `₹ ${Number(value).toFixed(2)}`
};

const formatDateTime = (value) => {
  if (!value) return "--";
  let dateString = String(value);
  if (!dateString.endsWith("Z") && !dateString.includes("+")) {
    dateString += "Z";
  }
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }

  return parsed.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function normalizeFeeResponse(data) {
  if (!data || typeof data !== "object") {
    return null;
  }

  if (data.message && !data.id && data.feeInr === undefined) {
    return null;
  }

  return {
    id: data.id ?? data.Id ?? null,
    feeInr: Number(data.feeInr ?? data.FeeInr ?? data.value ?? 0) || 0,
    isActive: data.isActive ?? data.IsActive ?? (String(data.status || "").toLowerCase() === "active"),
    createdAt: data.createdAt ?? data.CreatedAt ?? data.entryDateUtc ?? null,
    updatedAt: data.updateDateUtc ?? data.updatedAt ?? data.UpdatedAt ?? data.updatedAtUtc ?? data.updateDate ?? data.UpdateDate ?? data.updatedDate ?? data.UpdatedDate ?? data.modifiedDate ?? data.ModifiedDate ?? data.modifiedAt ?? data.ModifiedAt ?? data.createdAt ?? data.CreatedAt ?? data.entryDateUtc ?? null,
  };
}

export default function HotelConvenienceFee() {
  const navigate = useNavigate();
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isViewing, setIsViewing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [editFeeInr, setEditFeeInr] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadFee = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHotelConvenienceFees();
      
      // Hotel api returns an array, pick the first or active
      let targetFee = null;
      if (Array.isArray(data)) {
        targetFee = data.find(f => f.status === "Active" || f.isActive) || data[0] || null;
      } else {
        targetFee = data;
      }
      
      const normalized = normalizeFeeResponse(targetFee);
      setFee(normalized);
    } catch (err) {
      setError(err.message || "Failed to load hotel convenience fee.");
      setFee(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFee();
  }, []);

  const handleOpenEdit = () => {
    navigate("/admin/b2c-hotel/add-convenience-fee");
  };

  const handleOpenAdd = () => {
    navigate("/admin/b2c-hotel/add-convenience-fee");
  };



  const handleOpenView = () => {
    setIsViewing(true);
  };

  const feesList = fee ? [fee] : [];
  const totalItems = feesList.length;
  
  return (
    <section className="admin-b2c-page admin-convenience-page">
      <div className="admin-convenience-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <header className="admin-b2c-header admin-convenience-header" style={{ marginBottom: 0 }}>
          <h1><span style={{ color: '#A51C49', fontWeight: 700 }}>B2C Hotel</span> Convenience Fee</h1>
        </header>

        <button
          type="button"
          className="admin-convenience-icon-btn edit"
          style={{ width: 'auto', padding: '8px 16px', gap: '6px', fontSize: '0.88rem', fontWeight: 700, borderRadius: '9px', height: 'auto' }}
          onClick={handleOpenAdd}
        >
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
          Add Convenience Fee
        </button>
      </div>

      {loading ? (
        <div className="admin-data-info">Loading convenience fee settings...</div>
      ) : error ? (
        <div className="admin-data-error">{error}</div>
      ) : (
        <div className="admin-convenience-table-shell">
          <header className="admin-convenience-table-head">
            <span>ID</span>
            <span>Fee (INR)</span>
            <span>Status</span>
            <span>Created</span>
            <span>Updated</span>
            <span>Action</span>
          </header>

          {feesList.length > 0 ? (
            <div className="admin-convenience-table-body">
              {feesList.map((f, i) => (
                <article key={f.id || i} className="admin-convenience-table-row">
                  <div className="admin-convenience-cell">
                    <strong>{f.id || (i + 1)}</strong>
                  </div>

                  <div className="admin-convenience-cell">
                    <span>{inrFormatter.format(f.feeInr)}</span>
                  </div>

                  <div className="admin-convenience-cell admin-convenience-status-cell">
                    <span className={`admin-convenience-status-dot ${f.isActive ? "active" : "inactive"}`}>
                      <span className={`dot ${f.isActive ? "green" : "red"}`}></span>
                      {f.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="admin-convenience-cell">
                    <span>{formatDateTime(f.createdAt)}</span>
                  </div>

                  <div className="admin-convenience-cell">
                    <span>{formatDateTime(f.updatedAt)}</span>
                  </div>

                  <div className="admin-convenience-cell admin-convenience-action-cell">
                    <button
                      type="button"
                      className="admin-convenience-action-btn view"
                      title="View Details"
                      onClick={handleOpenView}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      className="admin-convenience-action-btn edit"
                      title="Edit Fee"
                      onClick={handleOpenEdit}
                    >
                      <PencilLine size={16} />
                    </button>
                    <button
                      type="button"
                      className="admin-convenience-action-btn delete"
                      title="Delete (Disabled for demo)"
                      disabled
                      style={{ opacity: 0.5, cursor: "not-allowed" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-convenience-empty">
              <span>No convenience fee configured yet.</span>
              <button
                type="button"
                className="admin-convenience-icon-btn edit"
                onClick={handleOpenAdd}
              >
                <PencilLine size={16} /> Configure Now
              </button>
            </div>
          )}

          <AdminPagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            itemName="records"
          />
        </div>
      )}

      {/* View Modal */}
      {isViewing && fee && (
        <div className="admin-convenience-modal-backdrop" onClick={() => setIsViewing(false)}>
          <div className="admin-convenience-modal" onClick={e => e.stopPropagation()}>
            <header>
              <h2>View Convenience Fee</h2>
              <button onClick={() => setIsViewing(false)}><X size={20} /></button>
            </header>
            <div className="admin-convenience-modal-body">
              <div className="admin-convenience-detail-row">
                <strong>ID:</strong>
                <span>{fee.id || 1}</span>
              </div>
              <div className="admin-convenience-detail-row">
                <strong>Fee Amount:</strong>
                <span>{inrFormatter.format(fee.feeInr)}</span>
              </div>
              <div className="admin-convenience-detail-row">
                <strong>Status:</strong>
                <span style={{ color: fee.isActive ? '#28a745' : '#be185d', fontWeight: 600 }}>
                  {fee.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="admin-convenience-detail-row">
                <strong>Created At:</strong>
                <span>{formatDateTime(fee.createdAt)}</span>
              </div>
              <div className="admin-convenience-detail-row">
                <strong>Updated At:</strong>
                <span>{formatDateTime(fee.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

