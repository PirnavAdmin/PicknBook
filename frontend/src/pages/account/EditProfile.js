/* eslint-disable */
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import { updateAccountProfile } from "../../services/accountProfileService";
import "../../STYLES/editProfile.css";
 
const validateName = (value, fieldName = "firstName") => {
  const isFirst = fieldName === "firstName";
  const label = isFirst ? "first name" : "last name";
  const properLabel = isFirst ? "First name" : "Last name";

  if (!value || typeof value !== "string" || !value.trim()) {
    return `${properLabel} is required`;
  }

  // Trim and collapse spaces
  const val = value.trim().replace(/\s+/g, " ");
  if (!val) {
    return `${properLabel} is required`;
  }

  // 2. Has a number
  if (/\d/.test(val)) {
    return `Numbers are not allowed in ${label}`;
  }

  // 3. Has symbols
  // "Special characters are not allowed. Use only letters, spaces, hyphen (-), apostrophe (') or dot (.)"
  if (/[^\p{L}\s'.\-]/u.test(val)) {
    return "Special characters are not allowed. Use only letters, spaces, hyphen (-), apostrophe (') or dot (.)";
  }

  // 4. Not a proper name: /^\p{L}+(?:[ '.\-]\p{L}+)*$/u
  if (!/^\p{L}+(?:[ '.\-]\p{L}+)*$/u.test(val)) {
    return `Invalid ${label}. Enter a proper name (for example: Priya or Mary-Anne)`;
  }

  // 5. Under 2 letters
  if (val.length < 2) {
    return `${properLabel} must be at least 2 characters`;
  }

  // 6. Over 30 letters
  if (val.length > 30) {
    return `${properLabel} must not exceed 30 characters`;
  }

  // 7. 3+ same character in a row: /(.)\1{2,}/iu
  if (/(.)\1{2,}/iu.test(val)) {
    return 'More than 2 repeated characters in a row are not allowed (for example: "iii")';
  }

  return null;
};

const validateEmail = (rawEmail) => {
  if (!rawEmail || typeof rawEmail !== "string" || !rawEmail.trim()) {
    return "Email is required";
  }

  // 2. Has a space
  if (/\s/.test(rawEmail)) {
    return "Email cannot contain spaces";
  }

  const trimmed = rawEmail.trim();

  // 3. No @
  if (!trimmed.includes("@")) {
    return "Email must contain '@' (for example: name@gmail.com)";
  }

  // 4. More than one @
  const atParts = trimmed.split("@");
  if (atParts.length > 2) {
    return "Email can contain only one '@'";
  }

  // 5. Nothing before @
  const localPart = atParts[0];
  if (!localPart) {
    return "Enter the part before '@' (for example: name@gmail.com)";
  }

  // 6. Nothing after @
  const domainPart = atParts[1];
  if (!domainPart) {
    return "Enter the domain after '@' (for example: gmail.com)";
  }

  // 7. Invalid characters in name
  if (!/^[a-zA-Z0-9._%+-]+$/.test(localPart) || !/^[a-zA-Z0-9.-]+$/.test(domainPart)) {
    return "Email contains invalid characters. Use only letters, numbers and . _ % + -";
  }

  // 8. Dot at start/end or ".."
  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    domainPart.startsWith(".") ||
    domainPart.endsWith(".") ||
    trimmed.startsWith(".") ||
    trimmed.endsWith(".") ||
    trimmed.includes("..")
  ) {
    return "Email cannot start or end with a dot, or have two dots in a row";
  }

  // 9. Domain has no "."
  if (!domainPart.includes(".")) {
    return "Domain must have an ending like .com or .in";
  }

  // 10. Domain ending under 2 letters
  const domainDots = domainPart.split(".");
  const tld = domainDots[domainDots.length - 1];
  if (!tld || tld.length < 2) {
    return "Domain ending must be at least 2 letters, like .com or .in";
  }

  if (trimmed.length > 100) {
    return "Email must not exceed 100 characters";
  }

  return null;
};

const validateSingleField = (name, value) => {
  if (name === "firstName") return validateName(value, "firstName");
  if (name === "lastName") return validateName(value, "lastName");
  if (name === "email") return validateEmail(value);
  if (name === "mobile") {
    if (!value) return "Mobile number is required";
    if (!/^\d{10}$/.test(value)) return "Must be 10 digits";
    return null;
  }
  return null;
};

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
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    mobile: false,
  });
  const [previewUrl, setPreviewUrl] = useState(userData.profileImage || null);
  const [statusMessage, setStatusMessage] = useState("");

  const fields = [
    { id: "firstName", label: "First Name", type: "text", placeholder: "Enter first name", maxLength: 30 },
    { id: "lastName", label: "Last name", type: "text", placeholder: "Enter last name", maxLength: 30 },
    { id: "email", label: "Email ID", type: "email", placeholder: "example@gmail.com", maxLength: 100 },
    { id: "mobile", label: "Mobile No", type: "text", placeholder: "Enter mobile number" },
  ];

  const validate = () => {
    const tempErrors = {};
    const fnErr = validateName(formData.firstName, "firstName");
    if (fnErr) tempErrors.firstName = fnErr;

    const lnErr = validateName(formData.lastName, "lastName");
    if (lnErr) tempErrors.lastName = lnErr;

    const emErr = validateEmail(formData.email);
    if (emErr) tempErrors.email = emErr;

    if (!formData.mobile) {
      tempErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      tempErrors.mobile = "Must be 10 digits";
    }

    setErrors(tempErrors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      mobile: true,
    });

    const fieldOrder = ["firstName", "lastName", "email", "mobile"];
    const firstInvalidField = fieldOrder.find((f) => tempErrors[f]);
    if (firstInvalidField) {
      const el = document.getElementById(`edit-profile-${firstInvalidField}`);
      if (el) el.focus();
    }

    return Object.keys(tempErrors).length === 0;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    // For email: trim, lowercase on blur
    if (name === "email" && typeof value === "string") {
      finalValue = value.trim().toLowerCase();
      setFormData((prev) => ({ ...prev, email: finalValue }));
    }

    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateSingleField(name, finalValue);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // On every change once the field has been touched
    if (touched[name]) {
      const error = validateSingleField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    } else if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
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

  const handleSubmit = async () => {
    if (!validate()) {
      setStatusMessage("");
      return;
    }

    try {
      setStatusMessage("Saving...");
      const payload = new FormData();
      payload.append("firstName", (formData.firstName || "").trim().replace(/\s+/g, " "));
      payload.append("lastName", (formData.lastName || "").trim().replace(/\s+/g, " "));
      payload.append("email", (formData.email || "").trim().toLowerCase());
      payload.append("phoneNumber", formData.mobile);
      if (formData.profileImage instanceof File) {
        payload.append("profileImage", formData.profileImage);
      }

      const updatedProfile = await updateAccountProfile(payload);

      updateUserData({
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        email: updatedProfile.email,
        mobile: updatedProfile.phoneNumber,
        profileImage: updatedProfile.profileImageUrl,
      });

      navigate("/dashboard/my-account");
    } catch (err) {
      const fieldNameMap = {
        firstname: "firstName",
        lastname: "lastName",
        email: "email",
        emailaddress: "email",
        mobile: "mobile",
        mobilenumber: "mobile",
        phonenumber: "mobile",
      };
      const validationErrors = Object.entries(err.validationErrors || {}).reduce((mappedErrors, [name, messages]) => {
        const fieldName = fieldNameMap[name.replace(/[^a-z]/gi, "").toLowerCase()];
        const message = Array.isArray(messages) ? messages[0] : messages;
        if (fieldName && message) mappedErrors[fieldName] = String(message);
        return mappedErrors;
      }, {});

      if (Object.keys(validationErrors).length > 0) {
        setErrors((currentErrors) => ({ ...currentErrors, ...validationErrors }));
        setStatusMessage("");
        const fieldOrder = ["firstName", "lastName", "email", "mobile"];
        const firstInvalid = fieldOrder.find((f) => validationErrors[f]);
        if (firstInvalid) {
          const el = document.getElementById(`edit-profile-${firstInvalid}`);
          if (el) el.focus();
        }
      } else {
        setStatusMessage(err.message || "Failed to update profile.");
      }
    }
  };

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-card">
        <div className="edit-profile-heading-row">
          <div className="edit-profile-header-line">
            <h2 className="edit-profile-title">
              Edit <span>Profile</span>
            </h2>
          </div>
          <button
            type="button"
            className="edit-profile-back-btn"
            onClick={() => navigate("/dashboard/my-account")}
          >
            <span aria-hidden="true">&larr;</span>
            <span>Back</span>
          </button>
        </div>

        <div className="edit-profile-grid">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="edit-profile-label" htmlFor={`edit-profile-${field.id}`}>
                {field.label}
              </label>
              <input
                id={`edit-profile-${field.id}`}
                type={field.type}
                name={field.id}
                value={formData[field.id]}
                placeholder={field.placeholder}
                onChange={handleChange}
                onBlur={handleBlur}
                maxLength={field.maxLength}
                className={`edit-profile-input ${errors[field.id] ? "is-error" : ""}`}
                aria-invalid={Boolean(errors[field.id])}
                aria-describedby={errors[field.id] ? `edit-profile-${field.id}-error` : undefined}
              />
              <div
                id={`edit-profile-${field.id}-error`}
                className="edit-profile-error"
                role="alert"
              >
                {errors[field.id] || ""}
              </div>
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
 
 