export function formatNotificationDate(value) {
  if (!value) return "";

  const normalizedValue = typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)
    ? `${value}Z`
    : value;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}
