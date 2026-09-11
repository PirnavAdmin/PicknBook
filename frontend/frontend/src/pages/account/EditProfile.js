/* eslint-disable */
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import "../../STYLES/editProfile.css";

const EditProfileCard = () => {
  const { userData, updateUserData } = useContext(UserContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: userData.firstName || "",
    lastName: userData.lastName || "",
    email: userData.email || "",
    mobile: userData.mobile || "",
    profileImage: userData.profileImage || null,
  });

  const [errors, setErrors] = useState({});
  const [previewUrl, setPreviewUrl] = useState(userData.profileImage || null);
  const [statusMessage, setStatusMessage] = useState("");

  const fields = [
    { id: "firstName", label: "First Name", type: "text", placeholder: "Enter first name" },
    { id: "lastName", label: "Last name", type: "text", placeholder: "Enter last name" },
    { id: "email", label: "Email ID", type: "email", placeholder: "example@gmail.com" },
    { id: "mobile", label: "Mobile No", type: "text", placeholder: "Enter mobile number" },
  ];

  const validate = () => {
    let tempErrors = {};
    if (!formData.firstName) tempErrors.firstName = "First name is required";
    if (!formData.lastName) tempErrors.lastName = "Last name is required";
    if (!formData.email) {
      tempErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      tempErrors.email = "Email is invalid";
    }
    if (!formData.mobile) {
      tempErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      tempErrors.mobile = "Must be 10 digits";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, profileImage: file }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleResetImage = () => {
    setFormData((prev) => ({ ...prev, profileImage: null }));
    setPreviewUrl(null);
    const fileInput = document.getElementById("fileInput");
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = () => {
    if (validate()) {
      updateUserData({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        mobile: formData.mobile,
        profileImage: previewUrl,
      });
      navigate("/dashboard/my-account");
    } else {
      setStatusMessage("");
    }
  };

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-card">
        <div className="edit-profile-header-line">
          <h2 className="edit-profile-title">
            Edit <span>Profile</span>
          </h2>
        </div>

        <div className="edit-profile-grid">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="edit-profile-label">{field.label}</label>
              <input
                type={field.type}
                name={field.id}
                value={formData[field.id]}
                placeholder={field.placeholder}
                onChange={handleChange}
                className={`edit-profile-input ${errors[field.id] ? "is-error" : ""}`}
              />
              <div className="edit-profile-error">{errors[field.id] || ""}</div>
            </div>
          ))}
        </div>

        <div className="edit-profile-submit-row">
          <button type="button" className="edit-profile-submit-btn" onClick={handleSubmit}>
            Submit
          </button>
          {statusMessage && <div className="edit-profile-success">{statusMessage}</div>}
        </div>

        <div className="edit-profile-image-section">
          <div className="edit-profile-image-tag">Profile Image</div>
          <div className="edit-profile-file-input-box">
            <input id="fileInput" type="file" onChange={handleFileChange} className="edit-profile-file-input" />
          </div>
          <div className="edit-profile-preview-box">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="edit-profile-preview-img" />
            ) : (
              <span className="edit-profile-preview-empty">No file chosen</span>
            )}
          </div>
          <div className="edit-profile-btn-row">
            <button
              type="button"
              className="edit-profile-upload-btn"
              onClick={() => formData.profileImage && setStatusMessage("Image Uploaded!")}
            >
              Upload Profile Image
            </button>
            <button type="button" className="edit-profile-reset-btn" onClick={handleResetImage}>
              Reset Profile Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfileCard;
