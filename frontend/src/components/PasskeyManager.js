import React, { useState, useEffect } from "react";
import { registerPasskey } from "../services/passkeyService";
import { Fingerprint, Key, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';

export default function PasskeyManager() {
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSupport = async () => {
      try {
        const isSupported = browserSupportsWebAuthn() && await platformAuthenticatorIsAvailable();
        setSupported(isSupported);
      } catch (err) {
        setSupported(false);
      }
    };
    checkSupport();
  }, []);

  const handleRegisterPasskey = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const isVerified = await registerPasskey();
      if (isVerified) {
        setSuccess(true);
      } else {
        setError("Passkey registration failed verification.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to register passkey. Ensure your backend endpoints are set up.");
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div style={{ padding: '20px', background: '#fff5f5', borderRadius: '12px', color: '#c53030', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertCircle size={20} />
        <span>Your device or browser does not support passkeys (WebAuthn).</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: '#f0f9ff', padding: '10px', borderRadius: '50%', color: '#0284c7' }}>
          <Fingerprint size={24} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Sign in with Passkey</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Use your device's fingerprint, face scan, or PIN to log in securely without a password.
          </p>
        </div>
      </div>

      {success && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#f0fdf4', color: '#166534', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <CheckCircle size={18} />
          <span>Passkey registered successfully! You can now use it to sign in.</span>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleRegisterPasskey}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: '#0f172a',
          color: '#ffffff',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'background 0.2s',
        }}
      >
        {loading ? <Loader2 size={18} className="spin" /> : <Key size={18} />}
        {loading ? 'Registering...' : 'Register a Passkey'}
      </button>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
