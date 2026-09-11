import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyCashfreePayment } from "../../services/paymentService";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import "../../STYLES/CashfreeReturnPage.css";

export default function CashfreeReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState("verifying"); // verifying, success, failed, cancelled, error
  const [message, setMessage] = useState("Verifying your payment status...");
  const [paymentData, setPaymentData] = useState(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      setStatus("error");
      setMessage("Payment reference not found.");
      return;
    }

    let pendingBooking = null;
    try {
      const raw = sessionStorage.getItem("pending_cashfree_booking");
      if (raw) pendingBooking = JSON.parse(raw);
    } catch { }

    const maxAttempts = 24; // 2 minutes at 5s intervals
    let timeoutId = null;

    async function verify() {
      attemptsRef.current += 1;
      try {
        const data = await verifyCashfreePayment(orderId);
        
        if (data.status === "Success") {
          setStatus("success");
          setPaymentData(data);
          sessionStorage.removeItem("pending_cashfree_booking");
          
          setMessage("Redirecting to your ticket...");
          timeoutId = setTimeout(() => {
            navigate("/print-ticket", {
              replace: true,
              state: {
                pnr: data.paymentReference || (pendingBooking && pendingBooking.bookingReference),
                email: pendingBooking?.email || "",
                mobile: pendingBooking?.mobile || "",
                bookingType: data.bookingType?.toLowerCase() || pendingBooking?.bookingType || "bus",
                forceFetch: true,
              },
            });
          }, 3000);
          return;
        }
        
        if (data.status === "Failed") {
          setStatus("failed");
          setMessage(data.failureReason || "Payment failed. Please try again.");
          return;
        }
        
        if (data.status === "Cancelled") {
          setStatus("cancelled");
          setMessage("Payment was cancelled. You can try again.");
          return;
        }

        // Pending or Created state
        if (attemptsRef.current < maxAttempts) {
          setMessage(`Payment is processing (Attempt ${attemptsRef.current}/${maxAttempts})...`);
          timeoutId = setTimeout(verify, 5000);
        } else {
          setStatus("error");
          setMessage("Payment verification is taking longer than expected. Don't worry — you'll receive a confirmation email once verified.");
        }
      } catch (error) {
        if (attemptsRef.current < maxAttempts) {
          timeoutId = setTimeout(verify, 5000);
        } else {
          setStatus("error");
          setMessage("Unable to verify payment. Please contact support.");
        }
      }
    }

    verify();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate, searchParams]);

  const handleRetry = () => {
    navigate(-1); // Go back to payment page to try again
  };

  const handleGoHome = () => {
    navigate("/dashboard");
  };

  return (
    <div className="upay-root upay-return-page">
      <div className="upay-return-card">
        {status === "verifying" && (
          <>
            <div className="upay-return-icon is-processing">
              <div className="upay-spinner" style={{ width: 36, height: 36, border: "3px solid rgba(245,158,11,0.2)", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "upay-spin 0.8s linear infinite" }} />
            </div>
            <h2 className="upay-return-title">Processing Payment</h2>
            <p className="upay-return-sub">{message}</p>
            <p style={{ fontSize: "0.78rem", color: "var(--upay-text-dim)" }}>
              Please do not close this page or press back.
            </p>
          </>
        )}
        
        {status === "success" && (
          <>
            <div className="upay-return-icon" style={{ color: "#10b981", background: "rgba(16, 185, 129, 0.1)" }}>
              <CheckCircle size={40} />
            </div>
            <h2 className="upay-return-title">Payment Successful!</h2>
            <p className="upay-return-sub">{message}</p>
            {paymentData && (
              <div style={{ marginTop: 20, textAlign: "left", background: "#1a2235", padding: 15, borderRadius: 8, fontSize: "0.85rem", color: "#cbd5e1" }}>
                <div><strong>Amount:</strong> ₹{paymentData.amount}</div>
                <div><strong>Reference:</strong> {paymentData.paymentReference}</div>
                <div><strong>Method:</strong> {paymentData.paymentMethod}</div>
              </div>
            )}
          </>
        )}
        
        {status === "failed" && (
          <>
            <div className="upay-return-icon" style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.1)" }}>
              <XCircle size={40} />
            </div>
            <h2 className="upay-return-title">Payment Failed</h2>
            <p className="upay-return-sub">{message}</p>
            <button onClick={handleRetry} className="upay-agent-pay-btn" style={{ marginTop: 20 }}>
              Try Again
            </button>
          </>
        )}
        
        {status === "cancelled" && (
          <>
            <div className="upay-return-icon" style={{ color: "#f59e0b", background: "rgba(245, 158, 11, 0.1)" }}>
              <AlertCircle size={40} />
            </div>
            <h2 className="upay-return-title">Payment Cancelled</h2>
            <p className="upay-return-sub">{message}</p>
            <button onClick={handleRetry} className="upay-agent-pay-btn" style={{ marginTop: 20 }}>
              Go Back
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="upay-return-icon" style={{ color: "#94a3b8", background: "rgba(148, 163, 184, 0.1)" }}>
              <AlertCircle size={40} />
            </div>
            <h2 className="upay-return-title">Notice</h2>
            <p className="upay-return-sub">{message}</p>
            <button onClick={handleGoHome} className="upay-agent-pay-btn" style={{ marginTop: 20 }}>
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
