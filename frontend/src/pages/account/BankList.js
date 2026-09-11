/* eslint-disable */
import React, { useCallback, useEffect, useState } from "react";
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";
import {
  createBankDetail,
  deleteBankDetail,
  listBankDetails,
  updateBankDetail,
} from "../../services/bankDetailsService";
import "../../STYLES/bank.css";

const INITIAL_BANK_FORM = {
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  branch: "",
  ifsc: "",
  type: "",
};

function formatApiError(error, fallback) {
  const message = String(error?.message || "").trim();
  if (!message) {
    return fallback;
  }

  return message.replace(/^"|"$/g, "");
}

function validateBankForm(form) {
  const nextErrors = {};

  if (!String(form.bankName || "").trim()) {
    nextErrors.bankName = "Bank Name is required";
  }

  if (!String(form.accountHolderName || "").trim()) {
    nextErrors.accountHolderName = "Account Holder Name is required";
  }

  if (!/^\d{9,18}$/.test(String(form.accountNumber || "").trim())) {
    nextErrors.accountNumber = "Account Number must be 9-18 digits";
  }

  if (!String(form.branch || "").trim()) {
    nextErrors.branch = "Branch is required";
  }

  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(form.ifsc || "").trim().toUpperCase())) {
    nextErrors.ifsc = "IFSC invalid";
  }

  if (!String(form.type || "").trim()) {
    nextErrors.type = "Account Type is required";
  }

  return nextErrors;
}

function sanitizeBankPayload(form) {
  return {
    bankName: String(form.bankName || "").trim(),
    accountHolderName: String(form.accountHolderName || "").trim(),
    accountNumber: String(form.accountNumber || "").trim(),
    branch: String(form.branch || "").trim(),
    ifsc: String(form.ifsc || "").trim().toUpperCase(),
    type: String(form.type || "").trim(),
  };
}

export default function BankList() {
  const [banks, setBanks] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(INITIAL_BANK_FORM);
  const [editErrors, setEditErrors] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_BANK_FORM);
  const [addErrors, setAddErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [busyRowId, setBusyRowId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const loadBanks = useCallback(async () => {
    setIsLoading(true);

    try {
      const records = await listBankDetails();
      setBanks(records);
      setFeedback((previous) =>
        previous.type === "error" ? { type: "", message: "" } : previous
      );
    } catch (error) {
      setFeedback({
        type: "error",
        message: formatApiError(error, "Unable to load bank details."),
      });
      setBanks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanks();
  }, [loadBanks]);

  const handleAddFieldChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "ifsc" ? value.toUpperCase() : value;

    setAddForm((previous) => ({ ...previous, [name]: nextValue }));

    if (addErrors[name]) {
      setAddErrors((previous) => ({ ...previous, [name]: "" }));
    }
  };

  const handleEditFieldChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "ifsc" ? value.toUpperCase() : value;

    setEditForm((previous) => ({ ...previous, [name]: nextValue }));

    if (editErrors[name]) {
      setEditErrors((previous) => ({ ...previous, [name]: "" }));
    }
  };

  const resetAddForm = () => {
    setAddForm(INITIAL_BANK_FORM);
    setAddErrors({});
    setShowAddForm(false);
  };

  const handleStartEdit = (bank) => {
    setEditId(bank.id);
    setEditErrors({});
    setEditForm({
      bankName: bank.bankName || "",
      accountHolderName: bank.accountHolderName || "",
      accountNumber: bank.accountNumber || "",
      branch: bank.branch || "",
      ifsc: bank.ifsc || "",
      type: bank.type || "",
    });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditForm(INITIAL_BANK_FORM);
    setEditErrors({});
  };

  const handleCreateBank = async (event) => {
    event.preventDefault();

    const validationErrors = validateBankForm(addForm);
    setAddErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmittingAdd(true);

    try {
      const payload = sanitizeBankPayload(addForm);
      await createBankDetail(payload);
      await loadBanks();
      setFeedback({ type: "success", message: "Bank detail added successfully." });
      resetAddForm();
    } catch (error) {
      setFeedback({
        type: "error",
        message: formatApiError(error, "Unable to add bank detail."),
      });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleSaveEdit = async () => {
    const validationErrors = validateBankForm(editForm);
    setEditErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setBusyRowId(editId);

    try {
      const payload = sanitizeBankPayload(editForm);
      await updateBankDetail(editId, payload);
      await loadBanks();
      setFeedback({ type: "success", message: "Bank detail updated successfully." });
      handleCancelEdit();
    } catch (error) {
      setFeedback({
        type: "error",
        message: formatApiError(error, "Unable to update bank detail."),
      });
    } finally {
      setBusyRowId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bank?")) {
      return;
    }

    setBusyRowId(id);

    try {
      await deleteBankDetail(id);
      await loadBanks();
      setFeedback({ type: "success", message: "Bank detail deleted successfully." });

      if (editId === id) {
        handleCancelEdit();
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: formatApiError(error, "Unable to delete bank detail."),
      });
    } finally {
      setBusyRowId(null);
    }
  };

  return (
    <div className="bank-page">
      <div className="white-card">
        <div className="flex-between bank-header-row">
          <div>
            <h2 className="page-title">Bank List</h2>
            <div className="title-underline"></div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFeedback((previous) =>
                previous.type === "success" ? { type: "", message: "" } : previous
              );
              setShowAddForm((previous) => !previous);
            }}
            className="btn-primary"
          >
            {showAddForm ? "Close Form" : "+ Add Bank"}
          </button>
        </div>

        {feedback.message && (
          <div className={`bank-feedback ${feedback.type === "error" ? "error" : "success"}`}>
            <span>{feedback.message}</span>
            <button
              type="button"
              className="btn-back"
              onClick={() => setFeedback({ type: "", message: "" })}
            >
              Dismiss
            </button>
          </div>
        )}

        {showAddForm && (
          <form onSubmit={handleCreateBank} className="bank-form bank-inline-form">
            <div>
              <input
                type="text"
                name="bankName"
                placeholder="Bank Name"
                value={addForm.bankName}
                onChange={handleAddFieldChange}
                className={`input-field ${addErrors.bankName ? "input-error" : ""}`}
              />
              {addErrors.bankName && <p className="error-text">{addErrors.bankName}</p>}
            </div>

            <div>
              <input
                type="text"
                name="accountHolderName"
                placeholder="Account Holder Name"
                value={addForm.accountHolderName}
                onChange={handleAddFieldChange}
                className={`input-field ${addErrors.accountHolderName ? "input-error" : ""}`}
              />
              {addErrors.accountHolderName && (
                <p className="error-text">{addErrors.accountHolderName}</p>
              )}
            </div>

            <div>
              <input
                type="text"
                name="accountNumber"
                placeholder="Account Number"
                value={addForm.accountNumber}
                onChange={handleAddFieldChange}
                className={`input-field ${addErrors.accountNumber ? "input-error" : ""}`}
              />
              {addErrors.accountNumber && (
                <p className="error-text">{addErrors.accountNumber}</p>
              )}
            </div>

            <div>
              <input
                type="text"
                name="branch"
                placeholder="Branch"
                value={addForm.branch}
                onChange={handleAddFieldChange}
                className={`input-field ${addErrors.branch ? "input-error" : ""}`}
              />
              {addErrors.branch && <p className="error-text">{addErrors.branch}</p>}
            </div>

            <div>
              <input
                type="text"
                name="ifsc"
                placeholder="IFSC"
                value={addForm.ifsc}
                onChange={handleAddFieldChange}
                className={`input-field uppercase ${addErrors.ifsc ? "input-error" : ""}`}
              />
              {addErrors.ifsc && <p className="error-text">{addErrors.ifsc}</p>}
            </div>

            <div>
              <select
                name="type"
                value={addForm.type}
                onChange={handleAddFieldChange}
                className={`input-field ${addErrors.type ? "input-error" : ""}`}
              >
                <option value="">Select Account Type</option>
                <option value="Savings">Savings</option>
                <option value="Current">Current</option>
                <option value="Business">Business</option>
              </select>
              {addErrors.type && <p className="error-text">{addErrors.type}</p>}
            </div>

            <div className="col-span-full bank-form-actions">
              <button type="submit" className="btn-primary" disabled={isSubmittingAdd}>
                {isSubmittingAdd ? "Saving..." : "Save Bank"}
              </button>
              <button
                type="button"
                className="btn-back"
                onClick={resetAddForm}
                disabled={isSubmittingAdd}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="table-wrapper">
          <table className="bank-table">
            <thead className="table-header">
              <tr>
                <th>Sr</th>
                <th>Bank Name</th>
                <th>Account Name</th>
                <th>Account Number</th>
                <th>Branch</th>
                <th>IFSC</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="table-cell table-empty">
                    Loading bank details...
                  </td>
                </tr>
              ) : banks.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-cell table-empty">
                    Bank detail not found
                  </td>
                </tr>
              ) : (
                banks.map((bank, index) => {
                  const isEditing = editId === bank.id;
                  const isBusy = busyRowId === bank.id;

                  return (
                    <tr key={bank.id} className="table-row">
                      <td className="table-cell">{bank.sr || index + 1}</td>

                      <td className="table-cell">
                        {isEditing ? (
                          <input
                            name="bankName"
                            value={editForm.bankName}
                            onChange={handleEditFieldChange}
                            className={`input-field ${editErrors.bankName ? "input-error" : ""}`}
                          />
                        ) : (
                          bank.bankName
                        )}
                        {isEditing && editErrors.bankName && (
                          <p className="error-text">{editErrors.bankName}</p>
                        )}
                      </td>

                      <td className="table-cell">
                        {isEditing ? (
                          <input
                            name="accountHolderName"
                            value={editForm.accountHolderName}
                            onChange={handleEditFieldChange}
                            className={`input-field ${
                              editErrors.accountHolderName ? "input-error" : ""
                            }`}
                          />
                        ) : (
                          bank.accountHolderName
                        )}
                        {isEditing && editErrors.accountHolderName && (
                          <p className="error-text">{editErrors.accountHolderName}</p>
                        )}
                      </td>

                      <td className="table-cell">
                        {isEditing ? (
                          <input
                            name="accountNumber"
                            value={editForm.accountNumber}
                            onChange={handleEditFieldChange}
                            className={`input-field ${
                              editErrors.accountNumber ? "input-error" : ""
                            }`}
                          />
                        ) : (
                          bank.accountNumber
                        )}
                        {isEditing && editErrors.accountNumber && (
                          <p className="error-text">{editErrors.accountNumber}</p>
                        )}
                      </td>

                      <td className="table-cell">
                        {isEditing ? (
                          <input
                            name="branch"
                            value={editForm.branch}
                            onChange={handleEditFieldChange}
                            className={`input-field ${editErrors.branch ? "input-error" : ""}`}
                          />
                        ) : (
                          bank.branch
                        )}
                        {isEditing && editErrors.branch && (
                          <p className="error-text">{editErrors.branch}</p>
                        )}
                      </td>

                      <td className="table-cell">
                        {isEditing ? (
                          <input
                            name="ifsc"
                            value={editForm.ifsc}
                            onChange={handleEditFieldChange}
                            className={`input-field uppercase ${editErrors.ifsc ? "input-error" : ""}`}
                          />
                        ) : (
                          bank.ifsc
                        )}
                        {isEditing && editErrors.ifsc && (
                          <p className="error-text">{editErrors.ifsc}</p>
                        )}
                      </td>

                      <td className="table-cell">
                        {isEditing ? (
                          <select
                            name="type"
                            value={editForm.type}
                            onChange={handleEditFieldChange}
                            className={`input-field ${editErrors.type ? "input-error" : ""}`}
                          >
                            <option value="Savings">Savings</option>
                            <option value="Current">Current</option>
                            <option value="Business">Business</option>
                          </select>
                        ) : (
                          bank.type
                        )}
                        {isEditing && editErrors.type && (
                          <p className="error-text">{editErrors.type}</p>
                        )}
                      </td>

                      <td className="table-cell">
                        <div className="action-group">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="icon-btn text-green"
                                disabled={isBusy}
                              >
                                <FiSave />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="icon-btn text-gray"
                                disabled={isBusy}
                              >
                                <FiX />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(bank)}
                                className="icon-btn text-blue"
                                disabled={busyRowId !== null}
                              >
                                <FiEdit />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(bank.id)}
                                className="icon-btn text-red"
                                disabled={busyRowId !== null}
                              >
                                <FiTrash2 />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && (
          <div className="bank-footer-actions">
            <button type="button" className="btn-back" onClick={loadBanks}>
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
