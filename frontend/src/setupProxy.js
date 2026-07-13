const { createProxyMiddleware } = require("http-proxy-middleware");

const FALLBACK_PROXY_TARGET =
  "http://65.2.53.198:3000";

function normalizeHttpUrl(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
}

function isFrontendHost(urlValue) {
  try {
    const parsed = new URL(urlValue);
    const host = String(parsed.hostname || "").toLowerCase();
    const port = String(parsed.port || (parsed.protocol === "https:" ? "443" : "80"));

    return (
      (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") &&
      port === "3000"
    );
  } catch {
    return false;
  }
}

function resolveProxyTarget() {
  const candidates = [
    process.env.REACT_APP_API_PROXY_TARGET,
    process.env.REACT_APP_API_BASE_URL,
    process.env.REACT_APP_BUS_API_BASE_URL,
    process.env.REACT_APP_PLACES_API_URL,
  ];

  const explicit = candidates
    .map((candidate) => normalizeHttpUrl(candidate))
    .filter((candidate) => !isFrontendHost(candidate))
    .find(Boolean);

  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      // Fall through to fallback target.
    }
  }

  return FALLBACK_PROXY_TARGET;
}

module.exports = function setupProxy(app) {
  const target = resolveProxyTarget();

  app.use(
    ["/api", "/uploads", "/offers", "/Images", "/images", "/Content"],
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      logLevel: "warn",
      onProxyReq(proxyReq) {
        proxyReq.setHeader("ngrok-skip-browser-warning", "true");
      },
    })
  );
};
