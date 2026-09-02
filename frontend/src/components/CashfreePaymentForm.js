import React, { useEffect, useRef, useState } from "react";
import { CreditCard, Smartphone, Building, ShieldCheck, ChevronRight, CheckCircle } from "lucide-react";

export default function CashfreePaymentForm({ cashfree, paymentSessionId, onPaymentComplete, payableAmount }) {
  const [activeTab, setActiveTab] = useState("upi");
  const [isMounted, setIsMounted] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState("");

  const elementsRef = useRef({});

  useEffect(() => {
    if (!cashfree || !paymentSessionId) return;

    try {
      // Cashfree's exact native input styling
      const style = {
        base: {
          color: "#374151",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          fontSize: "14px",
          fontWeight: "500",
          letterSpacing: "0.5px",
          "::placeholder": { color: "#9ca3af" },
          padding: "12px"
        },
        invalid: { color: "#e11d48" }
      };

      if (activeTab === "card" && !elementsRef.current.cardMounted) {
        setTimeout(() => {
          elementsRef.current.cardNumber = cashfree.create("cardNumber", { style });
          elementsRef.current.cardNumber.mount("#cf-card-number");
          elementsRef.current.cardExpiry = cashfree.create("cardExpiry", { style });
          elementsRef.current.cardExpiry.mount("#cf-card-expiry");
          elementsRef.current.cardCvv = cashfree.create("cardCvv", { style });
          elementsRef.current.cardCvv.mount("#cf-card-cvv");
          elementsRef.current.cardMounted = true;
          setIsMounted(true);
        }, 50);
      }
      
      if (activeTab === "upi" && !elementsRef.current.upiMounted) {
        setTimeout(() => {
          elementsRef.current.upiCollect = cashfree.create("upiCollect", { style });
          elementsRef.current.upiCollect.mount("#cf-upi-collect");
          elementsRef.current.upiMounted = true;
          setIsMounted(true);
        }, 50);
      }
      
      if (activeTab === "netbanking" && !elementsRef.current.netbankingMounted) {
        setTimeout(() => {
          elementsRef.current.netbanking = cashfree.create("netbanking", { style });
          elementsRef.current.netbanking.mount("#cf-netbanking");
          elementsRef.current.netbankingMounted = true;
          setIsMounted(true);
        }, 50);
      }
    } catch (err) {
      console.error("Failed to mount Cashfree elements", err);
      setError("Error initializing secure form: " + (err.message || String(err)));
    }
  }, [cashfree, paymentSessionId, activeTab]);

  const handlePay = async () => {
    if (isPaying) return;
    setIsPaying(true);
    setError("");

    try {
      let paymentMethod;
      if (activeTab === "card") paymentMethod = elementsRef.current.cardNumber;
      else if (activeTab === "upi") paymentMethod = elementsRef.current.upiCollect;
      else if (activeTab === "netbanking") paymentMethod = elementsRef.current.netbanking;

      const result = await cashfree.pay({
        paymentMethod: paymentMethod,
        paymentSessionId: paymentSessionId
      });
      
      if (result.error) {
        setError(result.error.message || "Payment failed. Please try another method.");
      } else {
        if (onPaymentComplete) onPaymentComplete(result);
        else window.location.href = `/payment/cashfree/return?order_id=${sessionStorage.getItem("pending_cashfree_order_id")}`;
      }
    } catch (err) {
      setError("An unexpected error occurred during payment.");
    } finally {
      setIsPaying(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const tabs = [
    { id: "upi", label: "UPI", icon: Smartphone, tag: "Popular" },
    { id: "card", label: "Cards", icon: CreditCard },
    { id: "netbanking", label: "Netbanking", icon: Building }
  ];

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      width: "100%",
      maxWidth: "800px",
      margin: "0 auto",
      minHeight: "550px"
    }}>
      
      {/* HEADER EXACT CLONE */}
      <div style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "20px 24px", borderBottom: "1px solid #e5e7eb", background: "#fff"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Mock Logo / User's Brand Space */}
          <div style={{ width: "40px", height: "40px", background: "#2563eb", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: "1.2rem" }}>
            P
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111827" }}>PicknBook Payments</h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#6b7280" }}>Transaction ID: {paymentSessionId?.split('_')[0] || "10293848"}</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ display: "block", fontSize: "1.25rem", fontWeight: 700, color: "#111827" }}>
            {payableAmount ? formatCurrency(payableAmount) : "₹ 0"}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#059669", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", fontWeight: 500, marginTop: "2px" }}>
            <CheckCircle size={12} /> View Details
          </span>
        </div>
      </div>

      {/* 2-COLUMN LAYOUT EXACT CLONE */}
      <div style={{ display: "flex", flex: 1 }}>
        
        {/* LEFT SIDEBAR - PAYMENT METHODS */}
        <div style={{ width: "260px", background: "#f9fafb", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px 20px 8px", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Payment Options
          </div>
          
          <div style={{ display: "flex", flexDirection: "column" }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: "flex", alignItems: "center", padding: "16px 20px",
                    background: isActive ? "#ffffff" : "transparent",
                    border: "none",
                    borderLeft: isActive ? "4px solid #6366f1" : "4px solid transparent",
                    borderTop: isActive ? "1px solid #e5e7eb" : "1px solid transparent",
                    borderBottom: isActive ? "1px solid #e5e7eb" : "1px solid transparent",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    textAlign: "left",
                    position: "relative",
                    width: "100%",
                    outline: "none"
                  }}
                  onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = "#f3f4f6"; }}
                  onMouseOut={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                    <div style={{ 
                      width: "32px", height: "32px", borderRadius: "8px", 
                      background: isActive ? "#eef2ff" : "#f3f4f6", 
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isActive ? "#6366f1" : "#6b7280"
                    }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: isActive ? 600 : 500, color: isActive ? "#111827" : "#4b5563" }}>
                        {tab.label}
                      </span>
                      {tab.tag && (
                        <span style={{ display: "block", fontSize: "0.7rem", color: "#059669", fontWeight: 600, marginTop: "2px" }}>
                          {tab.tag}
                        </span>
                      )}
                    </div>
                    {isActive && <ChevronRight size={16} color="#9ca3af" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE - INPUTS & PAY BUTTON */}
        <div style={{ flex: 1, background: "#ffffff", padding: "32px", display: "flex", flexDirection: "column", position: "relative" }}>
          
          <h3 style={{ margin: "0 0 24px 0", fontSize: "1.1rem", fontWeight: 600, color: "#111827" }}>
            {activeTab === "upi" ? "Pay via UPI" : activeTab === "card" ? "Enter Card Details" : "Select Bank"}
          </h3>

          {error && (
            <div style={{ 
              padding: "12px 16px", background: "#fef2f2", borderLeft: "4px solid #ef4444", 
              color: "#b91c1c", fontSize: "0.85rem", fontWeight: 500, marginBottom: "24px"
            }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1 }}>
            {/* UPI */}
            <div style={{ display: activeTab === "upi" ? "block" : "none" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>UPI ID / VPA</label>
              <div id="cf-upi-collect" style={{ 
                height: "46px", border: "1px solid #d1d5db", borderRadius: "8px", 
                background: "#ffffff", transition: "border-color 0.2s, box-shadow 0.2s" 
              }}></div>
              <p style={{ margin: "12px 0 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
                A collect request will be sent to your UPI app. Open your app and enter your PIN to authorize the payment.
              </p>
            </div>

            {/* CARD */}
            <div style={{ display: activeTab === "card" ? "block" : "none" }}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>Card Number</label>
                <div id="cf-card-number" style={{ height: "46px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#ffffff" }}></div>
              </div>
              
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>Valid Thru</label>
                  <div id="cf-card-expiry" style={{ height: "46px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#ffffff" }}></div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>CVV</label>
                  <div id="cf-card-cvv" style={{ height: "46px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#ffffff" }}></div>
                </div>
              </div>
            </div>

            {/* NETBANKING */}
            <div style={{ display: activeTab === "netbanking" ? "block" : "none" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>Select Bank</label>
              <div id="cf-netbanking" style={{ minHeight: "46px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#ffffff", overflow: "hidden" }}></div>
            </div>
          </div>

          {/* STICKY BOTTOM BUTTON & FOOTER */}
          <div style={{ marginTop: "auto", paddingTop: "32px" }}>
            <button
              type="button"
              onClick={handlePay}
              disabled={!isMounted || isPaying}
              style={{
                width: "100%",
                height: "50px",
                background: isPaying ? "#9ca3af" : "#6366f1", // Cashfree indigo
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "1.05rem",
                fontWeight: 600,
                cursor: isPaying ? "not-allowed" : "pointer",
                transition: "background 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              onMouseOver={(e) => { if(!isPaying) e.currentTarget.style.background = "#4f46e5"; }}
              onMouseOut={(e) => { if(!isPaying) e.currentTarget.style.background = "#6366f1"; }}
            >
              {isPaying ? "Processing..." : `Pay ${formatCurrency(payableAmount)}`}
            </button>
            
            <div style={{ 
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", 
              marginTop: "16px", fontSize: "0.75rem", color: "#9ca3af" 
            }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>100% Secure Payments powered by <strong>Cashfree</strong></span>
            </div>
          </div>

        </div>
      </div>
      
      {/* Global styles injection for Cashfree iframes to ensure they fill the divs properly */}
      <style>{`
        #cf-card-number iframe, #cf-card-expiry iframe, #cf-card-cvv iframe, #cf-upi-collect iframe {
          height: 46px !important;
        }
      `}</style>
    </div>
  );
}
