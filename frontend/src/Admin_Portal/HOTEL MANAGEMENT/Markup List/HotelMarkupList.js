import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listHotelPricingRules,
  deleteHotelPricingRule,
  updateHotelPricingRule,
} from "../../../services/adminHotelService";
import AdminPagination from "../../../components/AdminPagination";
import "./HotelMarkupList.css";

const fmtDate = (isoStr) => {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
};

const fmtValue = (type, value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return type === "Percentage" ? `${num.toFixed(2)}%` : `₹${num.toFixed(2)}`;
};

export default function HotelMarkupList() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listHotelPricingRules();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load pricing rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleDelete = async (rule) => {
    const confirmed = window.confirm(
      `Delete pricing rule #${rule.id}? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteHotelPricingRule(rule.id);
      showToast("Rule deleted successfully.");
      fetchRules();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const handleToggleActive = async (rule) => {
    const nextActive = !rule.isActive;
    if (nextActive) {
      const confirmed = window.confirm(
        "Activating this rule will deactivate all other rules. Continue?"
      );
      if (!confirmed) return;
    }
    try {
      await updateHotelPricingRule(rule.id, {
        markupType: rule.markupType,
        markupValue: rule.markupValue,
        convenienceFeeType: rule.convenienceFeeType,
        convenienceFeeValue: rule.convenienceFeeValue,
        gstPercent: rule.gstPercent,
        isActive: nextActive,
      });
      showToast(nextActive ? "Rule activated." : "Rule deactivated.");
      fetchRules();
    } catch (err) {
      showToast(`Toggle failed: ${err.message}`);
    }
  };

  const paginatedRules = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return rules.slice(startIndex, startIndex + itemsPerPage);
  }, [rules, currentPage]);

  return (
    <div className="hml-page">
      {/* Header */}
      <div className="hml-header">
        <div>
          <h2 className="hml-title" style={{ fontWeight: 500 }}>
            <span style={{ color: '#A51C49', fontWeight: 500 }}>Hotel</span> Pricing Rules
          </h2>
          <p className="hml-subtitle">
            Manage markup, convenience fee &amp; GST settings for hotel bookings.
          </p>
        </div>
        <button
          className="hml-add-btn"
          onClick={() => navigate("/admin/hotel-management/markup-list/new")}
        >
          + Add Pricing Rule
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          {toast}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div className="hml-table-wrap">
        <table className="hml-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Markup</th>
              <th>Convenience Fee</th>
              <th>GST %</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Updated By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 28, color: "#94a3b8" }}>
                  Loading pricing rules...
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 28, color: "#94a3b8" }}>
                  No pricing rules found. Click "Add Pricing Rule" to create one.
                </td>
              </tr>
            ) : (
              paginatedRules.map((rule) => (
                <tr
                  key={rule.id}
                  style={
                    rule.isActive
                      ? { background: "#f0fdf4", borderLeft: "3px solid #16a34a" }
                      : {}
                  }
                >
                  <td className="hml-supplier">#{rule.id}</td>
                  <td>
                    <span className="hml-cat-badge">{rule.markupType}</span>{" "}
                    <span className="hml-markup">{fmtValue(rule.markupType, rule.markupValue)}</span>
                  </td>
                  <td>
                    <span className="hml-cat-badge">{rule.convenienceFeeType}</span>{" "}
                    <span className="hml-markup">
                      {fmtValue(rule.convenienceFeeType, rule.convenienceFeeValue)}
                    </span>
                  </td>
                  <td>{Number(rule.gstPercent).toFixed(2)}%</td>
                  <td>
                    <span
                      className={`hml-status-badge ${rule.isActive ? "hml-active" : "hml-inactive"}`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "#64748b" }}>
                    {fmtDate(rule.updatedAtUtc || rule.createdAtUtc)}
                  </td>
                  <td style={{ fontSize: 12.5 }}>{rule.updatedBy || "—"}</td>
                  <td>
                    <div className="hml-actions">
                      <button
                        className="hml-action-btn hml-edit"
                        onClick={() =>
                          navigate(`/admin/hotel-management/markup-list/edit/${rule.id}`)
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="hml-action-btn hml-toggle"
                        onClick={() => handleToggleActive(rule)}
                      >
                        {rule.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="hml-action-btn"
                        style={{
                          background: "#fef2f2",
                          color: "#dc2626",
                          borderColor: "#fecaca",
                        }}
                        onClick={() => handleDelete(rule)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '16px' }}>
        <AdminPagination
          currentPage={currentPage}
          totalItems={rules.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          itemName="rules"
        />
      </div>
    </div>
  );
}

