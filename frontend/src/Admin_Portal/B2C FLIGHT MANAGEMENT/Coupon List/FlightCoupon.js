import React, { useEffect, useState, useMemo } from "react";
import { Check, Download, Eye, List, Pencil, Trash2, X } from "lucide-react";
import "./FlightCoupon.css";
import "../Used Coupon List/FlightUsedCoupon.css";
import AdminPagination from "../../../components/AdminPagination";
import { formatCouponDate, formatCouponDateTime } from "../../../utils/adminPortalUtils";
import { useAdminList } from "../../../utils/adminPortalStorage";
import {
  createFlightCoupon,
  deleteFlightCoupon,
  listFlightCoupons,
  updateFlightCoupon,
} from "../../../services/flightBookingService";

function toInputDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function generateCouponCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 8; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

function createDefaultCouponForm() {
  return {
    value: "",
    cpnType: "",
    startDate: "",
    expiryDate: "",
    couponCode: generateCouponCode(),
    useLimit: "",
    remark: "",
  };
}

export default function AdminFlightCouponListPage() {
  const [coupons, setCoupons] = useAdminList("flight-coupons", []);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [couponLoadError, setCouponLoadError] = useState("");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState(createDefaultCouponForm);
  const [generateError, setGenerateError] = useState("");
  const [editCoupon, setEditCoupon] = useState(null);
  const [editError, setEditError] = useState("");
  const [deleteCoupon, setDeleteCoupon] = useState(null);
  const [viewCoupon, setViewCoupon] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalItems = coupons.length;
  const paginatedCoupons = useMemo(() => {
    const sortedCoupons = [...coupons].sort((a, b) => {
      const numA = parseInt(String(a.id).replace(/\D/g, "")) || 0;
      const numB = parseInt(String(b.id).replace(/\D/g, "")) || 0;
      return numA - numB;
    });
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedCoupons.slice(startIndex, startIndex + itemsPerPage);
  }, [coupons, currentPage]);
  const colWidths = [
    "8%",
    "10%",
    "10%",
    "13%",
    "10%",
    "10%",
    "11%",
    "8%",
    "11%",
    "9%",
    "10%",
  ];
  const headers = [
    "ID",
    "CPN Value",
    "CPN Type",
    "Coupon Code",
    "Start Date",
    "Expiry Date",
    "Use Limit",
    "Status",
    "Insert Date",
    "Remark",
    "Action",
  ];

  useEffect(() => {
    let isMounted = true;

    const loadCoupons = async () => {
      setIsLoadingCoupons(true);
      setCouponLoadError("");

      try {
        const backendCoupons = await listFlightCoupons();
        if (isMounted) {
          setCoupons(backendCoupons);
        }
      } catch (error) {
        if (isMounted) {
          setCoupons([]);
          setCouponLoadError(error.message || "Unable to load coupons from backend.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCoupons(false);
        }
      }
    };

    loadCoupons();

    return () => {
      isMounted = false;
    };
  }, [setCoupons]);

  const openGenerateModal = () => {
    setGenerateError("");
    setGenerateForm(createDefaultCouponForm());
    setIsGenerateModalOpen(true);
  };

  const openEditModal = (coupon) => {
    setEditError("");
    setEditCoupon({
      ...coupon,
      value: String(coupon.value),
      useLimit: String(coupon.useLimit),
      startDate: toInputDate(coupon.startDate),
      expiryDate: toInputDate(coupon.expiryDate),
      remark: coupon.remark || "",
    });
  };

  const handleEditSave = async () => {
    if (!editCoupon) {
      return;
    }

    const amount = Number(editCoupon.value);
    const useLimit = Number(editCoupon.useLimit);
    const startTimestamp = new Date(editCoupon.startDate).getTime();
    const expiryTimestamp = new Date(editCoupon.expiryDate).getTime();

    if (!Number.isFinite(amount) || amount <= 0) {
      setEditError("Enter a valid coupon value.");
      return;
    }

    if (!Number.isFinite(useLimit) || useLimit <= 0) {
      setEditError("Use limit must be greater than zero.");
      return;
    }

    if (!Number.isFinite(startTimestamp) || !Number.isFinite(expiryTimestamp)) {
      setEditError("Choose valid start and expiry dates.");
      return;
    }

    if (startTimestamp > expiryTimestamp) {
      setEditError("Expiry date should be the same or after start date.");
      return;
    }

    const nextCoupon = {
      ...editCoupon,
      value: amount,
      cpnType: editCoupon.cpnType,
      startDate: editCoupon.startDate,
      expiryDate: editCoupon.expiryDate,
      useLimit,
      status: editCoupon.status,
      remark: editCoupon.remark.trim(),
      entryDate: new Date().toISOString(),
    };

    try {
      const savedCoupon = await updateFlightCoupon(editCoupon.id, nextCoupon);
      setCoupons((previous) =>
        previous.map((coupon) => (coupon.id === editCoupon.id ? savedCoupon : coupon))
      );
      setEditCoupon(null);
      setEditError("");
    } catch (error) {
      setEditError(error.message || "Unable to update coupon in backend.");
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteCoupon) {
      return;
    }

    try {
      await deleteFlightCoupon(deleteCoupon.id);
      setCoupons((previous) => previous.filter((coupon) => coupon.id !== deleteCoupon.id));
      setDeleteCoupon(null);
    } catch (error) {
      setCouponLoadError(error.message || "Unable to delete coupon from backend.");
    }
  };

  const handleGenerateCoupon = async () => {
    const amount = Number(generateForm.value);
    const useLimit = Number(generateForm.useLimit);
    const couponCode = String(generateForm.couponCode || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    const startTimestamp = new Date(generateForm.startDate).getTime();
    const expiryTimestamp = new Date(generateForm.expiryDate).getTime();

    if (!String(generateForm.cpnType || "").trim()) {
      setGenerateError("Select coupon type.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setGenerateError("Enter a valid coupon value.");
      return;
    }

    if (!Number.isFinite(useLimit) || useLimit <= 0) {
      setGenerateError("Use limit must be greater than zero.");
      return;
    }

    if (!Number.isFinite(startTimestamp) || !Number.isFinite(expiryTimestamp)) {
      setGenerateError("Choose valid start and expiry dates.");
      return;
    }

    if (startTimestamp > expiryTimestamp) {
      setGenerateError("Expiry date should be the same or after start date.");
      return;
    }

    const nextId =
      coupons.reduce((highest, coupon) => Math.max(highest, Number(coupon.id) || 0), 0) + 1;
    const existingCodes = new Set(
      coupons.map((coupon) => String(coupon.couponCode || "").toUpperCase())
    );

    if (!couponCode) {
      setGenerateError("Coupon code is required.");
      return;
    }

    if (existingCodes.has(couponCode)) {
      setGenerateError("Coupon code already exists. Use a different code.");
      return;
    }

    const newCoupon = {
      id: nextId,
      value: amount,
      cpnType: generateForm.cpnType,
      couponCode,
      startDate: generateForm.startDate,
      expiryDate: generateForm.expiryDate,
      useLimit,
      status: "active",
      entryDate: new Date().toISOString(),
      remark: generateForm.remark.trim(),
    };

    try {
      const savedCoupon = await createFlightCoupon(newCoupon);
      setCoupons((previous) => [savedCoupon, ...previous]);
      setIsGenerateModalOpen(false);
      setGenerateError("");
    } catch (error) {
      setGenerateError(error.message || "Unable to save coupon to backend.");
    }
  };

  return (
    <section className="admin-b2c-page flight-markup-panel">
      <header className="flight-markup-toolbar">
        <div className="flight-markup-title">
          <h1><span style={{ color: '#A51C49', fontWeight: 700 }}>B2C Flight</span> Coupon List</h1>
          <div className="flight-markup-title-underline" aria-hidden="true" />
        </div>

        <div className="flight-markup-actions">
          <button
            type="button"
            className="flight-markup-action-btn primary"
            onClick={openGenerateModal}
          >
            <List size={16} />
            <span>Generate Coupon</span>
          </button>
          <button type="button" className="flight-markup-action-btn secondary">
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {couponLoadError && <p className="admin-markup-coupon-error">{couponLoadError}</p>}

      {isGenerateModalOpen && (
        <div className="admin-markup-coupon-backdrop" onClick={() => setIsGenerateModalOpen(false)}>
          <section
            className="admin-markup-coupon-modal generate"
            role="dialog"
            aria-modal="true"
            aria-label="Generate flight coupon"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="generate-header">
              <h2>Add B2C Flight Coupon</h2>
            </header>

            <div className="admin-markup-coupon-form admin-markup-coupon-generate-form">
              <label>
                <span>Coupon Type :</span>
                <select
                  value={generateForm.cpnType}
                  onChange={(event) =>
                    setGenerateForm((previous) => ({ ...previous, cpnType: event.target.value }))
                  }
                >
                  <option value="">---Select Amount Type---</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Percentage">Percentage</option>
                </select>
              </label>
              <label>
                <span>Value :</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter value"
                  value={generateForm.value}
                  onChange={(event) =>
                    setGenerateForm((previous) => ({ ...previous, value: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Start Date :</span>
                <input
                  type="date"
                  placeholder="Select Start Date"
                  value={generateForm.startDate}
                  onChange={(event) =>
                    setGenerateForm((previous) => ({ ...previous, startDate: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Expiry Date :</span>
                <input
                  type="date"
                  placeholder="Select Expiry Date"
                  value={generateForm.expiryDate}
                  onChange={(event) =>
                    setGenerateForm((previous) => ({
                      ...previous,
                      expiryDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Coupon Code :</span>
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={generateForm.couponCode}
                  onChange={(event) =>
                    setGenerateForm((previous) => ({
                      ...previous,
                      couponCode: event.target.value.toUpperCase().replace(/\s+/g, ""),
                    }))
                  }
                />
              </label>
              <label>
                <span>Coupon Use Limit :</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter use limit"
                  value={generateForm.useLimit}
                  onChange={(event) =>
                    setGenerateForm((previous) => ({ ...previous, useLimit: event.target.value }))
                  }
                />
              </label>
              <label className="remark-field">
                <span>Coupon Remark :</span>
                <input
                  type="text"
                  placeholder="Enter remark"
                  value={generateForm.remark}
                  onChange={(event) =>
                    setGenerateForm((previous) => ({ ...previous, remark: event.target.value }))
                  }
                />
              </label>
            </div>

            {generateError && <p className="admin-markup-coupon-error">{generateError}</p>}

            <div className="admin-markup-coupon-modal-actions generate-actions">
              <button type="button" className="primary generate-submit" onClick={handleGenerateCoupon}>
                <Check size={16} />
                <span>Generate</span>
              </button>
              <button
                type="button"
                className="danger generate-cancel"
                onClick={() => setIsGenerateModalOpen(false)}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {editCoupon && (
        <div className="admin-markup-coupon-backdrop" onClick={() => setEditCoupon(null)}>
          <section
            className="admin-markup-coupon-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Edit coupon"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Edit Coupon</h2>
              <button type="button" onClick={() => setEditCoupon(null)} aria-label="Close edit">
                <X size={16} />
              </button>
            </header>

            <div className="admin-markup-coupon-form">
              <label>
                <span>ID</span>
                <input type="text" value={editCoupon.id} disabled />
              </label>
              <label>
                <span>Coupon Code</span>
                <input type="text" value={editCoupon.couponCode} disabled />
              </label>
              <label>
                <span>CPN Value</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editCoupon.value}
                  onChange={(event) =>
                    setEditCoupon((previous) => ({ ...previous, value: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>CPN Type</span>
                <select
                  value={editCoupon.cpnType}
                  onChange={(event) =>
                    setEditCoupon((previous) => ({ ...previous, cpnType: event.target.value }))
                  }
                >
                  <option value="Fixed">Fixed</option>
                  <option value="Percentage">Percentage</option>
                </select>
              </label>
              <label>
                <span>Start Date</span>
                <input
                  type="date"
                  value={editCoupon.startDate}
                  onChange={(event) =>
                    setEditCoupon((previous) => ({ ...previous, startDate: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Expiry Date</span>
                <input
                  type="date"
                  value={editCoupon.expiryDate}
                  onChange={(event) =>
                    setEditCoupon((previous) => ({ ...previous, expiryDate: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Use Limit</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editCoupon.useLimit}
                  onChange={(event) =>
                    setEditCoupon((previous) => ({ ...previous, useLimit: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Status</span>
                <select
                  value={editCoupon.status}
                  onChange={(event) =>
                    setEditCoupon((previous) => ({ ...previous, status: event.target.value }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="wide">
                <span>Remark</span>
                <textarea
                  value={editCoupon.remark}
                  onChange={(event) =>
                    setEditCoupon((previous) => ({ ...previous, remark: event.target.value }))
                  }
                />
              </label>
            </div>

            {editError && <p className="admin-markup-coupon-error">{editError}</p>}

            <div className="admin-markup-coupon-modal-actions">
              <button type="button" className="secondary" onClick={() => setEditCoupon(null)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleEditSave}>
                Save Changes
              </button>
            </div>
          </section>
        </div>
      )}

      {deleteCoupon && (
        <div className="admin-markup-coupon-backdrop" onClick={() => setDeleteCoupon(null)}>
          <section
            className="admin-markup-coupon-modal small"
            role="dialog"
            aria-modal="true"
            aria-label="Delete coupon"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Delete Coupon</h2>
              <button
                type="button"
                onClick={() => setDeleteCoupon(null)}
                aria-label="Close delete dialog"
              >
                <X size={16} />
              </button>
            </header>

            <p className="admin-markup-coupon-delete-copy">
              Are you sure you want to delete coupon <strong>{deleteCoupon.couponCode}</strong>?
            </p>

            <div className="admin-markup-coupon-modal-actions">
              <button type="button" className="secondary" onClick={() => setDeleteCoupon(null)}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={handleDeleteCoupon}>
                Delete
              </button>
            </div>
          </section>
        </div>
      )}

      {viewCoupon && (
        <div className="admin-markup-coupon-backdrop" onClick={() => setViewCoupon(null)}>
          <section
            className="admin-markup-coupon-modal"
            role="dialog"
            aria-modal="true"
            aria-label="View coupon details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flight-markup-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <h2 style={{ margin: 0 }}>View Coupon Details</h2>
              <button
                type="button"
                className="flight-markup-modal-close"
                onClick={() => setViewCoupon(null)}
                aria-label="Close view dialog"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-soft)', color: 'var(--text-primary)', borderRadius: '10px', padding: '4px 8px', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </header>

            <div className="admin-markup-modal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '14px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>ID</span>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{viewCoupon.id}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Coupon Code</span>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{viewCoupon.couponCode}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>CPN Value</span>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{`INR ${viewCoupon.value}`}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>CPN Type</span>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{viewCoupon.cpnType}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Start Date</span>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCouponDate(viewCoupon.startDate)}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Expiry Date</span>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCouponDate(viewCoupon.expiryDate)}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Use Limit</span>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{viewCoupon.useLimit}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Status</span>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{viewCoupon.status === "active" ? "Active" : "Inactive"}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Insert Date</span>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCouponDateTime(viewCoupon.entryDate)}</strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Remark</span>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{viewCoupon.remark || "--"}</strong>
              </div>
            </div>

            <div className="admin-markup-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setViewCoupon(null)}
                style={{ border: '1px solid var(--border)', padding: '8px 14px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', background: 'var(--surface-soft)', color: 'var(--text-primary)' }}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="flight-markup-table-wrap">
        <div className="flight-markup-table-scroll">
          <table className="flight-markup-table">
            <colgroup>
              {colWidths.map((width, index) => (
                <col key={`${width}-${index}`} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>
                    <div className="flight-markup-th-pill">
                      <span>{header}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoadingCoupons ? (
                <tr>
                  <td colSpan={headers.length} className="flight-markup-empty-cell">
                    <span className="flight-markup-empty">Loading coupons from backend...</span>
                  </td>
                </tr>
              ) : paginatedCoupons.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="flight-markup-empty-cell">
                    <span className="flight-markup-empty">No Record Found...</span>
                  </td>
                </tr>
              ) : (
                paginatedCoupons.map((coupon, index) => (
                  <tr key={coupon.id}>
                    <td>{coupon.id}</td>
                    <td>{`INR ${Number(coupon.value) || 0}`}</td>
                    <td>{coupon.cpnType}</td>
                    <td>
                      <span className="flight-coupon-code">{coupon.couponCode}</span>
                    </td>
                    <td>{formatCouponDate(coupon.startDate)}</td>
                    <td>{formatCouponDate(coupon.expiryDate)}</td>
                    <td>{coupon.useLimit}</td>
                    <td>
                      <span className={`flight-coupon-status ${coupon.status}`}>
                        {coupon.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{formatCouponDateTime(coupon.entryDate)}</td>
                    <td>{coupon.remark || "--"}</td>
                    <td>
                      <div className="flight-markup-row-actions" aria-label="Coupon actions">
                        <button
                          type="button"
                          title="View"
                          aria-label={`View coupon ${coupon.id}`}
                          onClick={() => setViewCoupon(coupon)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          aria-label={`Edit coupon ${coupon.id}`}
                          onClick={() => openEditModal(coupon)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          aria-label={`Delete coupon ${coupon.id}`}
                          className="danger"
                          onClick={() => setDeleteCoupon(coupon)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemName="coupons"
        />
      </section>
    </section>
  );
}



