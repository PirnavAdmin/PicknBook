/* eslint-disable */
import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, PencilLine, Eye, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./BusConvenienceFee.css";
import { getConvenienceFee, updateConvenienceFee } from "../../../services/adminBusService";
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

  // Handle "No convenience fee configured." empty response
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

export default function AdminConvenienceFeePage() {
  const navigate = useNavigate();
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isViewing, setIsViewing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFeeInr, setEditFeeInr] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const loadFee = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getConvenienceFee();
        const normalized = normalizeFeeResponse(data);
        setFee(normalized);
      } catch (err) {
        setError(err.message || "Unable to load convenience fee settings.");
      } finally {
        setLoading(false);
      }
    };

    loadFee();
  }, []);

  const openEditModal = () => {
    setEditFeeInr(String(fee?.feeInr || 0));
    setEditIsActive(fee?.isActive ?? true);
    setSaveError("");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaveError("");
    const numericFee = Number(editFeeInr);
    if (!Number.isFinite(numericFee) || numericFee < 0) {
      setSaveError("Enter a valid fee amount (>= 0).");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        feeInr: numericFee,
        status: editIsActive ? "Active" : "Inactive",
        updatedBy: "admin",
      };

      await updateConvenienceFee(payload);
      setIsEditing(false);
      
      setLoading(true);
      const data = await getConvenienceFee();
      setFee(normalizeFeeResponse(data));
    } catch (err) {
      setSaveError(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
      setLoading(false);
    }
  };

  return (
    <section className="admin-b2c-page admin-convenience-page">
      <div className="admin-convenience-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <header className="admin-b2c-header admin-convenience-header" style={{ marginBottom: 0 }}>
          <h1><span style={{ color: '#A51C49', fontWeight: 700 }}>B2C Bus</span> Convenience Fee</h1>
        </header>

        <button
          type="button"
          className="admin-convenience-icon-btn edit"
          style={{ width: 'auto', padding: '8px 16px', gap: '6px', fontSize: '0.88rem', fontWeight: 700, borderRadius: '9px', height: 'auto' }}
          onClick={() => navigate("/admin/b2c-bus/convenience-fee/add")}
        >
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span>
          Add Convenience Fee
        </button>
      </div>

      {loading ? (
        <div className="admin-data-info">Loading convenience fee settings...</div>
      ) : error ? (
        <div className="admin-data-error">{error}</div>
      ) : !fee ? (
        <section className="admin-convenience-empty">
          <p>No convenience fee configured yet.</p>
          <button
            type="button"
            className="admin-convenience-icon-btn edit"
            onClick={() => navigate("/admin/b2c-bus/convenience-fee/add")}
          >
            <PencilLine size={15} />
            Configure Now
          </button>
        </section>
      ) : (
        <>
          <section className="admin-convenience-table-shell">
            <header className="admin-convenience-table-head">
              <span>ID</span>
              <span>Fee (INR)</span>
              <span>Status</span>
              <span>Created</span>
              <span>Updated</span>
              <span>Action</span>
            </header>

            <div className="admin-convenience-table-body">
              <article className="admin-convenience-table-row">
                <div className="admin-convenience-cell">
                  <span>{fee.id ?? "--"}</span>
                </div>

                <div className="admin-convenience-cell">
                  <span>{inrFormatter.format(fee.feeInr)}</span>
                </div>

                <div className="admin-convenience-cell admin-convenience-status-cell">
                  {fee.isActive ? (
                    <span className="admin-convenience-status-dot active">
                      <span className="dot green" />
                      Active
                    </span>
                  ) : (
                    <span className="admin-convenience-status-dot inactive">
                      <span className="dot red" />
                      Inactive
                    </span>
                  )}
                </div>

                <div className="admin-convenience-cell">
                  <span>{formatDateTime(fee.createdAt)}</span>
                </div>

                <div className="admin-convenience-cell">
                  <span>{formatDateTime(fee.updatedAt)}</span>
                </div>

                <div className="admin-convenience-cell admin-convenience-action-cell">
                  <button
                    type="button"
                    className="admin-convenience-action-btn view"
                    aria-label="View convenience fee"
                    title="View"
                    onClick={() => setIsViewing(true)}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    className="admin-convenience-action-btn edit"
                    aria-label="Edit convenience fee"
                    title="Edit"
                    onClick={openEditModal}
                  >
                    <PencilLine size={14} />
                  </button>
                  <button
                    type="button"
                    className="admin-convenience-action-btn delete"
                    aria-label="Delete convenience fee"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            </div>
            <AdminPagination
              currentPage={currentPage}
              totalItems={fee ? 1 : 0}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemName="records"
            />
          </section>
        </>
      )}

      {isViewing && fee && (
        <div className="admin-convenience-modal-backdrop" onClick={() => setIsViewing(false)}>
          <section className="admin-convenience-modal" onClick={e => e.stopPropagation()}>
            <header>
              <h2>View Convenience Fee</h2>
              <button type="button" onClick={() => setIsViewing(false)}><X size={16} /></button>
            </header>
            <div className="admin-convenience-modal-body">
              <div className="admin-convenience-detail-row">
                <strong>ID:</strong> <span>{fee.id ?? "--"}</span>
              </div>
              <div className="admin-convenience-detail-row">
                <strong>Fee Amount:</strong> <span>{inrFormatter.format(fee.feeInr)}</span>
              </div>
              <div className="admin-convenience-detail-row">
                <strong>Status:</strong> 
                <span style={{ color: fee.isActive ? "green" : "red", fontWeight: 600, marginLeft: "8px" }}>
                  {fee.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="admin-convenience-detail-row">
                <strong>Created At:</strong> <span>{formatDateTime(fee.createdAt)}</span>
              </div>
              <div className="admin-convenience-detail-row">
                <strong>Updated At:</strong> <span>{formatDateTime(fee.updatedAt)}</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {isEditing && (
        <div className="admin-convenience-modal-backdrop" onClick={() => !isSaving && setIsEditing(false)}>
          <section className="admin-convenience-modal" onClick={e => e.stopPropagation()}>
            <header>
              <h2>Edit Convenience Fee</h2>
              <button type="button" onClick={() => !isSaving && setIsEditing(false)} disabled={isSaving}><X size={16} /></button>
            </header>
            <div className="admin-convenience-modal-body form-body">
              <div style={{ display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
                <label className="admin-convenience-edit-label" style={{ margin: '0 0 4px 0', padding: 0, lineHeight: 1.2 }}>Fee Amount (INR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFeeInr}
                  onChange={(e) => setEditFeeInr(e.target.value)}
                  placeholder="e.g. 49"
                  className="admin-convenience-input"
                  style={{ height: '44px', margin: 0 }}
                  disabled={isSaving}
                />
              </div>
              
              <div>
                <label className="admin-convenience-edit-label" style={{marginTop: "16px"}}>Status</label>
                <label className="admin-convenience-toggle-label">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    disabled={isSaving}
                  />
                  <span>{editIsActive ? "Active" : "Inactive"}</span>
                </label>
              </div>

              {saveError && <p className="admin-data-error" style={{marginTop: '10px'}}>{saveError}</p>}
              
              <div className="admin-convenience-modal-actions">
                <button type="button" className="secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</button>
                <button type="button" className="primary" onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

