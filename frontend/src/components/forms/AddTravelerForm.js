import React, { useRef, useState } from "react";
import { FiArrowLeft, FiPlus, FiTrash2 } from "react-icons/fi";
import { getTravelerCreationErrors, toNewTravelerData, validateNewTraveler } from "../../utils/travelerCreation";
import "../../STYLES/traveller.css";

const emptyTraveler = (id) => ({ id, title: "", fullName: "", age: "", gender: "" });

const AddTravelerForm = ({ onBack, onSubmit }) => {
  const [travelers, setTravelers] = useState([emptyTraveler(0)]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const nextId = useRef(1);
  const saving = useRef(false);

  const handleChange = (id, event) => {
    const { name, value } = event.target;
    setTravelers((prev) => prev.map((traveler) => traveler.id === id ? { ...traveler, [name]: value } : traveler));
    setErrors((prev) => ({ ...prev, [id]: { ...prev[id], [name]: undefined } }));
    setSubmitError("");
  };
  const addTraveler = () => {
    const traveler = emptyTraveler(nextId.current++);
    setTravelers((prev) => [...prev, traveler]);
  };
  const removeTraveler = (id) => {
    setTravelers((prev) => prev.length > 1 ? prev.filter((traveler) => traveler.id !== id) : prev);
    setErrors((prev) => { const remaining = { ...prev }; delete remaining[id]; return remaining; });
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving.current) return;
    const validation = Object.fromEntries(travelers.map((traveler) => [traveler.id, validateNewTraveler(traveler)]));
    setErrors(validation);
    setSubmitError("");
    if (Object.values(validation).some((fields) => Object.keys(fields).length > 0)) return;
    saving.current = true;
    setIsSaving(true);
    try {
      const data = travelers.map(toNewTravelerData);
      await onSubmit(data.length === 1 ? data[0] : data);
    } catch (error) {
      const itemErrors = getTravelerCreationErrors(error.payload, travelers.length);
      setErrors(Object.fromEntries(travelers.map((traveler, index) => [traveler.id, itemErrors[index]])));
      const fallback = error.status === 404 ? "Traveler creation endpoint was not found. Please try again later."
        : error.status >= 500 ? "The server could not save your travelers. Please try again."
        : error.status === 400 ? "Please check the traveler details and try again."
        : "Unable to save travelers. Please try again.";
      setSubmitError(error.message || fallback);
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="flex-between">
        <div className="section-heading-block">
          <button onClick={onBack} disabled={isSaving} type="button" className="btn btn-red traveler-back-btn">
            <FiArrowLeft size={13} aria-hidden="true" /><span>Back</span>
          </button>
          <h2 className="title-text">Add Traveler</h2>
          <p className="section-subtitle">Save passenger details once and reuse them across future bookings.</p>
        </div>
        <button onClick={onBack} disabled={isSaving} type="button" className="btn btn-red">Traveler List</button>
      </div>
      <form onSubmit={handleSubmit} noValidate style={{ overflow: "visible" }}>
        {travelers.map((traveler, index) => {
          const fields = errors[traveler.id] || {};
          const fieldId = (name) => `traveler-${traveler.id}-${name}`;
          return (
            <div className="traveler-entry" key={traveler.id}>
              {index > 0 && (
                <div className="traveler-entry-heading">
                  <span>Traveler {index + 1}</span>
                  <button type="button" className="traveler-btn-delete" disabled={isSaving} title="Remove traveler" aria-label={`Remove traveler ${index + 1}`} onClick={() => removeTraveler(traveler.id)}><FiTrash2 size={13} /></button>
                </div>
              )}
              <div className="traveler-form-grid traveler-batch-grid">
                <div className="form-field-wrap">
                  <label htmlFor={fieldId("title")}>Title</label>
                  <select id={fieldId("title")} name="title" value={traveler.title} disabled={isSaving} onChange={(event) => handleChange(traveler.id, event)} className="input-field" required aria-invalid={Boolean(fields.title)} aria-describedby={fields.title ? `${fieldId("title")}-error` : undefined}>
                    <option value="" disabled>Select Title</option><option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Ms">Ms</option>
                  </select>
                  {fields.title && <p id={`${fieldId("title")}-error`} className="error-text">{fields.title}</p>}
                </div>
                <div className="form-field-wrap">
                  <label htmlFor={fieldId("fullName")}>Full Name</label>
                  <input id={fieldId("fullName")} name="fullName" placeholder="Full Name" value={traveler.fullName} disabled={isSaving} onChange={(event) => handleChange(traveler.id, event)} className="input-field" required aria-invalid={Boolean(fields.fullName)} aria-describedby={fields.fullName ? `${fieldId("fullName")}-error` : undefined} />
                  {fields.fullName && <p id={`${fieldId("fullName")}-error`} className="error-text">{fields.fullName}</p>}
                </div>
                <div className="form-field-wrap">
                  <label htmlFor={fieldId("age")}>Age</label>
                  <input id={fieldId("age")} name="age" type="number" min="0" max="120" step="1" placeholder="Age" value={traveler.age} disabled={isSaving} onChange={(event) => handleChange(traveler.id, event)} className="input-field" required aria-invalid={Boolean(fields.age)} aria-describedby={fields.age ? `${fieldId("age")}-error` : undefined} />
                  {fields.age && <p id={`${fieldId("age")}-error`} className="error-text">{fields.age}</p>}
                </div>
                <div className="form-field-wrap">
                  <label htmlFor={fieldId("gender")}>Gender</label>
                  <select id={fieldId("gender")} name="gender" value={traveler.gender} disabled={isSaving} onChange={(event) => handleChange(traveler.id, event)} className="input-field" required aria-invalid={Boolean(fields.gender)} aria-describedby={fields.gender ? `${fieldId("gender")}-error` : undefined}>
                    <option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                  </select>
                  {fields.gender && <p id={`${fieldId("gender")}-error`} className="error-text">{fields.gender}</p>}
                </div>
              </div>
              {fields.form && <p className="error-text" role="alert">{fields.form}</p>}
            </div>
          );
        })}
        <div className="submit-wrap traveler-add-actions">
          <button type="button" className="btn btn-gray traveler-add-another" onClick={addTraveler} disabled={isSaving}><FiPlus size={14} aria-hidden="true" /> Add Another Traveler</button>
          <button type="submit" className="btn btn-atlas" disabled={isSaving}>{isSaving ? "Saving..." : travelers.length > 1 ? "Save Travelers" : "Save Traveler"}</button>
        </div>
        {submitError && <p className="traveler-api-error" role="alert">{submitError}</p>}
      </form>
    </div>
  );
};
export default AddTravelerForm;
