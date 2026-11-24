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

export function formatStageValue(value) {
  if (value == null || value === "") return "--";
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
}
