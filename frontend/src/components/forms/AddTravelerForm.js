/* eslint-disable */
import React, { useState } from "react";
import "../../STYLES/traveller.css";

const AddTravelerForm = ({ onBack, onSubmit }) => {
  const [form, setForm] = useState({
    fullName: "",
    age: "",
    gender: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const validate = () => {
    const newErrors = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = "Full name required";
    }

    if (!form.age) {
      newErrors.age = "Age required";
    } else {
      const ageNum = Number(form.age);
      if (Number.isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        newErrors.age = "Enter a valid age (1-120)";
      }
    }

    if (!form.gender) {
      newErrors.gender = "Select gender";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const birthYear = new Date().getFullYear() - Number(form.age);
    const dob = `${birthYear}-01-01`;
    const nameParts = form.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const type = Number(form.age) < 18 ? "Child" : "Adult";
    const title = form.gender === "Female" ? "Ms" : "Mr";

    const submitData = {
      type,
      title,
      firstName,
      lastName,
      name: form.fullName.trim(),
      gender: form.gender,
      dob,
      dobInput: dob,
      email: "",
      mobile: "",
      phone: "",
      passportNo: "",
      country: "India",
      age: Number(form.age),
    };

    if (typeof onSubmit === "function") onSubmit(submitData);

    setForm({
      fullName: "",
      age: "",
      gender: "",
    });
    setErrors({});
  };

  return (
    <div className="card">
      <div className="flex-between">
        <div className="section-heading-block">
          <span className="section-kicker">Traveler Directory</span>
          <h2 className="title-text">Add Traveler</h2>
          <p className="section-subtitle">
            Save passenger details once and reuse them across future bookings.
          </p>
        </div>
        <button onClick={onBack} type="button" className="btn btn-red">
          Traveler List
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ overflow: "visible" }}>
        <div className="traveler-form-grid">
          {/* Full Name */}
          <div className="form-field-wrap traveler-fullname-span">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              placeholder="Full Name"
              value={form.fullName}
              onChange={handleChange}
              className="input-field"
            />
            {errors.fullName && <p className="error-text">{errors.fullName}</p>}
          </div>

          {/* Age */}
          <div className="form-field-wrap">
            <label htmlFor="age">Age</label>
            <input
              id="age"
              name="age"
              type="number"
              placeholder="Age"
              value={form.age}
              onChange={handleChange}
              className="input-field"
            />
            {errors.age && <p className="error-text">{errors.age}</p>}
          </div>

          {/* Gender */}
          <div className="form-field-wrap">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            {errors.gender && <p className="error-text">{errors.gender}</p>}
          </div>
        </div>

        <div className="submit-wrap">
          <button type="submit" className="btn btn-atlas">
            Save Traveler
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTravelerForm;