/* eslint-disable */
import React, { useState, useEffect } from "react";
import { Upload, CheckCircle2, AlertCircle, FileImage, RefreshCw } from "lucide-react";
import { uploadAgentLogo } from "../../services/b2bService";
import "../../STYLES/B2BLayout.css";

export default function B2BLogoManagement() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [currentLogo, setCurrentLogo] = useState(null);

  useEffect(() => {
    // Try to load current logo from B2B user data
    try {
      const userStr = localStorage.getItem("b2b_user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.logoUrl) {
          setCurrentLogo(userObj.logoUrl);
        }
      }
    } catch (e) {
      console.error("Error reading logo configuration", e);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", message: "Please select an image file (PNG, JPG, WEBP)." });
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: "error", message: "File size exceeds the 5MB limit." });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStatus({ type: "", message: "" });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || uploading) return;

    setUploading(true);
    setStatus({ type: "", message: "" });

    try {
      const result = await uploadAgentLogo(selectedFile);
      if (result.success || result.logoUrl) {
        const newLogoUrl = result.logoUrl || previewUrl;
        setCurrentLogo(newLogoUrl);
        setStatus({
          type: "success",
          message: result.message || "Agency logo uploaded and updated successfully."
        });

        // Save new logoUrl to localStorage user details
        try {
          const userStr = localStorage.getItem("b2b_user");
          if (userStr) {
            const userObj = JSON.parse(userStr);
            userObj.logoUrl = newLogoUrl;
            localStorage.setItem("b2b_user", JSON.stringify(userObj));
            // Dispatch event so layout topbar can reload logo if applicable
            window.dispatchEvent(new Event("storage"));
          }
        } catch {}

        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        throw new Error(result.message || "Failed to update logo.");
      }
    } catch (error) {
      console.error(error);
      const errMsg = error?.message || "Failed to connect to logo upload service.";
      
      // Fallback Demo Mode Behavior
      if (errMsg.includes("Failed to fetch") || errMsg.includes("404")) {
        const fakeLogoUrl = previewUrl;
        setCurrentLogo(fakeLogoUrl);
        setStatus({
          type: "success",
          message: "Demo Mode: Custom logo uploaded and saved to localStorage successfully!"
        });
        
        try {
          const userStr = localStorage.getItem("b2b_user");
          if (userStr) {
            const userObj = JSON.parse(userStr);
            userObj.logoUrl = fakeLogoUrl;
            localStorage.setItem("b2b_user", JSON.stringify(userObj));
            window.dispatchEvent(new Event("storage"));
          }
        } catch {}
        
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        setStatus({ type: "error", message: errMsg });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="b2b-dashboard">
      <div className="b2b-dashboard-header">
        <h1>Logo & Branding Settings</h1>
        <p>Upload your agency logo to customize your invoices, client vouchers, and booking receipts.</p>
      </div>

      <div className="b2b-quick-section">
        {/* Upload Form */}
        <div className="b2b-panel" style={{ flex: 1.2 }}>
          <h2 className="b2b-panel-title">Upload Agency Logo</h2>
          
          {status.message && (
            <div className={`b2b-alert ${status.type === "success" ? "success" : "error"}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
              {status.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{status.message}</span>
            </div>
          )}

          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="b2b-upload-dropzone" style={{ border: '2px dashed var(--b2b-border)', borderRadius: '12px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', position: 'relative', background: 'rgba(255,255,255,0.02)' }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
              <Upload size={36} style={{ color: 'var(--b2b-primary)' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 600 }}>Click or drag file to upload</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--b2b-text-secondary)' }}>Support PNG, JPG, or WEBP (Max 5MB)</p>
              </div>
            </div>

            {previewUrl && (
              <div className="b2b-preview-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--b2b-border)', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: '#fff', padding: '4px', display: 'grid', placeContent: 'center', border: '1px solid #ddd' }}>
                  <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 600 }}>Selected File</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--b2b-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileImage size={12} />
                    {selectedFile.name}
                  </p>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={!selectedFile || uploading}
              className="b2b-btn"
              style={{ padding: '12px 24px', background: 'var(--b2b-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', width: 'fit-content' }}
            >
              {uploading && <RefreshCw size={14} className="spin" />}
              {uploading ? "Uploading..." : "Save Logo"}
            </button>
          </form>
        </div>

        {/* Brand Display Card */}
        <div className="b2b-panel" style={{ flex: 0.8 }}>
          <h2 className="b2b-panel-title">Active Agency Brand</h2>
          <p style={{ color: 'var(--b2b-text-secondary)', fontSize: '0.8rem', marginBottom: 20 }}>
            Here is your current logo used on client deliverables.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--b2b-border)', borderRadius: '12px', padding: '30px', background: '#fff', minHeight: '180px' }}>
            {currentLogo ? (
              <img 
                src={currentLogo} 
                alt="Agency Logo" 
                style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain' }} 
                onError={(e) => {
                  e.target.src = "https://placehold.co/200x80?text=No+Logo";
                }}
              />
            ) : (
              <div style={{ color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <FileImage size={40} />
                <span style={{ fontSize: '0.85rem' }}>No logo uploaded yet</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
