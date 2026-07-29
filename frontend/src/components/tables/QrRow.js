/* eslint-disable */
import React, { useState, useEffect } from "react";
import { FiEdit2, FiSave, FiTrash2, FiX } from "react-icons/fi";
import "../../STYLES/QR.css";

const QRRow = ({
  item,
  index,
  onQRClick,
  isEditing,
  setEditingId,
  onUpdate,
  onDelete,
  isBusy,
}) => {
  const [form, setForm] = useState({
    id: null,
    bankName: "",
    accountName: "",
    upiId: "",
    mobile: "",
    qrImage: "",
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setForm({
        id: item.id,
        bankName: item.bankName || "",
        accountName: item.accountName || "",
        upiId: item.upiId || "",
        mobile: item.mobile || "",
        qrImage: item.qrImage || "",
      });
      setErrors({});
      setFile(null);
    }
  }, [isEditing, item]);

  const isRowBusy = isBusy || isSaving;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));

    if (errors[name]) {
      setErrors((previous) => ({ ...previous, [name]: "" }));
    }
  };

  const handleFile = (event) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.bankName.trim()) {
      nextErrors.bankName = "Required";
    }

    if (!form.accountName.trim()) {
      nextErrors.accountName = "Required";
    }

    if (!form.upiId.trim() || !form.upiId.includes("@")) {
      nextErrors.upiId = "Invalid UPI";
    }

    if (!/^[0-9]{10}$/.test(form.mobile.trim())) {
      nextErrors.mobile = "Invalid mobile";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);

    try {
      await onUpdate({
        id: form.id,
        bankName: form.bankName.trim(),
        accountName: form.accountName.trim(),
        upiId: form.upiId.trim(),
        mobile: form.mobile.trim(),
        file,
      });
      setErrors({});
      setFile(null);
    } catch {
      // Parent renders API error state.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <tr>
      <td>{index + 1}</td>

      <td>
        {isEditing ? (
          <>
            <input
              name="bankName"
              value={form.bankName}
              onChange={handleChange}
              className="input-style"
              disabled={isRowBusy}
            />
            {errors.bankName && <p className="error-text">{errors.bankName}</p>}
          </>
        ) : (
          item.bankName
        )}
      </td>

      <td>
        {isEditing ? (
          <>
            <input
              name="accountName"
              value={form.accountName}
              onChange={handleChange}
              className="input-style"
              disabled={isRowBusy}
            />
            {errors.accountName && <p className="error-text">{errors.accountName}</p>}
          </>
        ) : (
          item.accountName
        )}
      </td>

      <td>
        {isEditing ? (
          <>
            <input
              name="upiId"
              value={form.upiId}
              onChange={handleChange}
              className="input-style"
              disabled={isRowBusy}
            />
            {errors.upiId && <p className="error-text">{errors.upiId}</p>}
          </>
        ) : (
          item.upiId
        )}
      </td>

      <td>
        {isEditing ? (
          <>
            <input
              name="mobile"
              maxLength="10"
              value={form.mobile}
              onChange={handleChange}
              className="input-style"
              disabled={isRowBusy}
            />
            {errors.mobile && <p className="error-text">{errors.mobile}</p>}
          </>
        ) : (
          item.mobile
        )}
      </td>

      <td>
        {isEditing ? (
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="file-input"
            disabled={isRowBusy}
          />
        ) : (
          <img
            src={item.qrImage}
            alt="QR"
            className="qr-thumb"
            onClick={() => onQRClick(item)}
            onError={(event) => {
              event.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                item.upiId || "upi"
              )}`;
            }}
          />
        )}
      </td>

      <td>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="action-icon action-save"
              title="Save"
              disabled={isRowBusy}
              type="button"
            >
              <FiSave />
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="action-icon action-cancel"
              title="Cancel"
              disabled={isRowBusy}
              type="button"
            >
              <FiX />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditingId(item.id)}
              className="action-icon action-edit"
              title="Edit"
              disabled={isRowBusy}
              type="button"
            >
              <FiEdit2 />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="action-icon action-delete"
              title="Delete"
              disabled={isRowBusy}
              type="button"
            >
              <FiTrash2 />
            </button>
          </>
        )}
      </td>
    </tr>
  );
};

export default QRRow;
