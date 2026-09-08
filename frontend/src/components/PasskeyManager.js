import React, { useState, useEffect, useCallback } from "react";
import {
  registerPasskey,
  listPasskeys,
  deletePasskey,
  renamePasskey,
} from "../services/passkeyService";
import {
  Fingerprint,
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Pencil,
  X,
  Check,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";

/* ─── tiny helpers ─────────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return "Never";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/* ─── styles (inline so no extra CSS file needed) ────────────────  */
const S = {
  card: {
    padding: "24px",
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    marginBottom: "20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  iconBubble: {
    background: "#f0f9ff",
    padding: "10px",
    borderRadius: "50%",
    color: "#0284c7",
    flexShrink: 0,
  },
  title: { margin: 0, fontSize: "1.1rem", color: "#0f172a" },
  subtitle: { margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" },
  alert: (color, bg) => ({
    marginBottom: "16px",
    padding: "12px",
    background: bg,
    color,
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.9rem",
  }),
  divider: { borderTop: "1px solid #f1f5f9", margin: "20px 0" },
  sectionLabel: {
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom: "12px",
  },
  passkeyRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    marginBottom: "10px",
    background: "#fafafa",
  },
  passkeyMeta: { flex: 1, minWidth: 0 },
  passkeyName: {
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  passkeyDates: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    marginTop: "2px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  iconBtn: (color) => ({
    background: "none",
    border: "none",
    cursor: "pointer",
    color,
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    transition: "background 0.15s",
  }),
  primaryBtn: (disabled) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: disabled ? "#94a3b8" : "#0f172a",
    color: "#ffffff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 0.2s",
    fontSize: "0.9rem",
  }),
  input: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.9rem",
    outline: "none",
    flex: 1,
    color: "#0f172a",
    background: "#fff",
  },
  emptyState: {
    textAlign: "center",
    padding: "24px",
    color: "#94a3b8",
    fontSize: "0.9rem",
  },
};

/* ─── PasskeyManager ──────────────────────────────────────────── */
export default function PasskeyManager() {
  const [supported, setSupported] = useState(true);

  /* list state */
  const [passkeys, setPasskeys] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  /* register state */
  const [deviceName, setDeviceName] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState("");

  /* rename state */
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  /* delete state */
  const [deletingId, setDeletingId] = useState(null);

  /* ── check WebAuthn support ── */
  useEffect(() => {
    (async () => {
      try {
        const ok = browserSupportsWebAuthn();
        setSupported(ok);
      } catch {
        setSupported(false);
      }
    })();
  }, []);

  /* ── fetch passkey list ── */
  const fetchPasskeys = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const list = await listPasskeys();
      setPasskeys(Array.isArray(list) ? list : []);
    } catch (err) {
      setListError(err.message || "Failed to load passkeys.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  /* ── register ── */
  const handleRegister = async () => {
    setRegLoading(true);
    setRegError("");
    setRegSuccess(false);
    try {
      const label = deviceName.trim() || null;
      const ok = await registerPasskey(label);
      if (ok) {
        setRegSuccess(true);
        setDeviceName("");
        await fetchPasskeys(); // refresh list
      } else {
        setRegError("Passkey registration failed verification.");
      }
    } catch (err) {
      setRegError(err.message || "Failed to register passkey.");
    } finally {
      setRegLoading(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deletePasskey(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setListError(err.message || "Failed to delete passkey.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── rename ── */
  const startEdit = (passkey) => {
    setEditingId(passkey.id);
    setEditingName(passkey.deviceName);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };
  const handleRename = async (id) => {
    const newName = editingName.trim();
    if (!newName) return;
    setRenameLoading(true);
    try {
      await renamePasskey(id, newName);
      setPasskeys((prev) =>
        prev.map((p) => (p.id === id ? { ...p, deviceName: newName } : p))
      );
      setEditingId(null);
    } catch (err) {
      setListError(err.message || "Failed to rename passkey.");
    } finally {
      setRenameLoading(false);
    }
  };

  /* ── unsupported ── */
  if (!supported) {
    return (
      <div style={S.alert("#c53030", "#fff5f5")}>
        <AlertCircle size={20} />
        <span>Your device or browser does not support passkeys (WebAuthn).</span>
      </div>
    );
  }

  return (
    <div style={S.card}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.iconBubble}>
          <Fingerprint size={24} />
        </div>
        <div>
          <h3 style={S.title}>Passkeys</h3>
          <p style={S.subtitle}>
            Use your device's fingerprint, face scan, or PIN to sign in
            securely — no password needed.
          </p>
        </div>
      </div>

      {/* ── Enrolled Passkeys ── */}
      <div>
        <p style={S.sectionLabel}>
          <ShieldCheck size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
          Enrolled Passkeys
        </p>

        {listError && (
          <div style={S.alert("#991b1b", "#fef2f2")}>
            <AlertCircle size={16} />
            <span>{listError}</span>
          </div>
        )}

        {listLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", padding: "12px 0" }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            <span>Loading passkeys…</span>
          </div>
        ) : passkeys.length === 0 ? (
          <div style={S.emptyState}>
            <Key size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No passkeys registered yet.</p>
          </div>
        ) : (
          passkeys.map((pk) => (
            <div key={pk.id} style={S.passkeyRow}>
              <Key size={18} style={{ color: "#0284c7", flexShrink: 0 }} />

              <div style={S.passkeyMeta}>
                {editingId === pk.id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      id={`passkey-rename-${pk.id}`}
                      style={S.input}
                      value={editingName}
                      maxLength={100}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(pk.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                    />
                    <button
                      style={S.iconBtn("#16a34a")}
                      onClick={() => handleRename(pk.id)}
                      disabled={renameLoading}
                      title="Save"
                    >
                      {renameLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={16} />}
                    </button>
                    <button
                      style={S.iconBtn("#64748b")}
                      onClick={cancelEdit}
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <p style={S.passkeyName}>{pk.deviceName || "My Passkey"}</p>
                    <div style={S.passkeyDates}>
                      <span title="Created">
                        <Clock size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />
                        Added {formatDate(pk.createdAt)}
                      </span>
                      {pk.lastUsedAt && (
                        <span title="Last used">
                          Last used {formatDate(pk.lastUsedAt)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {editingId !== pk.id && (
                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    id={`passkey-edit-${pk.id}`}
                    style={S.iconBtn("#0284c7")}
                    onClick={() => startEdit(pk)}
                    title="Rename"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    id={`passkey-delete-${pk.id}`}
                    style={S.iconBtn("#dc2626")}
                    onClick={() => handleDelete(pk.id)}
                    disabled={deletingId === pk.id}
                    title="Remove"
                  >
                    {deletingId === pk.id
                      ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                      : <Trash2 size={15} />
                    }
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={S.divider} />

      {/* ── Register New Passkey ── */}
      <div>
        <p style={S.sectionLabel}>Register a New Passkey</p>

        {regSuccess && (
          <div style={S.alert("#166534", "#f0fdf4")}>
            <CheckCircle size={16} />
            <span>Passkey registered successfully! You can now sign in with it.</span>
          </div>
        )}
        {regError && (
          <div style={S.alert("#991b1b", "#fef2f2")}>
            <AlertCircle size={16} />
            <span>{regError}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            id="passkey-device-name"
            style={{ ...S.input, maxWidth: "260px" }}
            placeholder="Device name (e.g. iPhone 15)"
            value={deviceName}
            maxLength={100}
            onChange={(e) => setDeviceName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !regLoading) handleRegister(); }}
          />
          <button
            id="passkey-register-btn"
            onClick={handleRegister}
            disabled={regLoading}
            style={S.primaryBtn(regLoading)}
          >
            {regLoading
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Registering…</>
              : <><Key size={16} /> Register Passkey</>
            }
          </button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "8px", marginBottom: 0 }}>
          Your browser will prompt you to authenticate (fingerprint / face / PIN) to complete registration.
        </p>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
