export function getBookingStages(booking) {
  const stages = Array.isArray(booking?.stages)
    ? booking.stages
    : booking?.lifecycleHierarchy?.stages;
  if (!Array.isArray(stages)) return [];

  const hasCompletedPayment = stages.some((stage) =>
    String(stage?.key || "").trim().toUpperCase() === "GATEWAY_PAYMENT" &&
    getStageState(stage?.status) === "completed" &&
    stage?.meta?.isPaid === true
  );

  const stageOrder = (stage) => {
    if (stage.stageIndex == null || stage.stageIndex === "") return Infinity;
    const index = Number(stage.stageIndex);
    return Number.isFinite(index) ? index : Infinity;
  };

  return stages
    .filter((stage) => stage && typeof stage === "object" && !Array.isArray(stage))
    .filter((stage) => {
      const isRefundSettlement =
        String(stage.key || "").trim().toUpperCase() === "REFUND_SETTLEMENT" ||
        String(stage.name || "").trim().toLowerCase() === "refund settlement";
      return !(hasCompletedPayment && isRefundSettlement && getStageState(stage.status) === "skipped");
    })
    .slice()
    .sort((a, b) => stageOrder(a) - stageOrder(b));
}

export function getStageState(status) {
  const state = typeof status === "string" ? status.trim().toUpperCase() : "";
  return ["COMPLETED", "IN_PROGRESS", "WARNING", "FAILED", "PENDING", "SKIPPED"].includes(state)
    ? state.toLowerCase().replace("_", "-")
    : "unknown";
}

export function formatPaymentMethod(value) {
  if (!value || typeof value !== "string") return value || "--";
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "upi") return "UPI";
  if (lower.includes("debit")) return "Debit Card";
  if (lower.includes("credit")) return "Credit Card";
  if (lower === "card" || lower.includes("card")) return "Card Payment";
  if (lower === "netbanking" || lower.includes("net_banking") || lower.includes("net banking") || lower === "nb") return "Net Banking";
  if (lower === "wallet" || lower === "app") return "Wallet";
  if (lower === "agent wallet") return "Agent Wallet";
  if (lower === "paylater") return "Pay Later";
  if (lower === "emi" || lower === "cardlessemi") return "EMI";
  if (lower === "cashfree") return "Online Payment";
  return trimmed;
}

export function formatStageValue(value, key = "") {
  if (value == null || value === "") return "--";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  const keyLower = String(key || "").toLowerCase();
  if (keyLower === "method" || keyLower === "paymentmethod" || keyLower === "gatewaypaymentmethod") {
    return formatPaymentMethod(String(value));
  }
  return String(value);
}
