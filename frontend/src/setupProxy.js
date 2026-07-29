/* eslint-disable */
const { createProxyMiddleware } = require("http-proxy-middleware");
const https = require("https");

const FALLBACK_PROXY_TARGET = "https://www.picknbook.in";

function normalizeHttpUrl(value) {
  if (typeof value !== "string") return "";
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
    .map((c) => normalizeHttpUrl(c))
    .filter((c) => !isFrontendHost(c))
    .find(Boolean);

  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      // Fall through
    }
  }

  return FALLBACK_PROXY_TARGET;
}

module.exports = function setupProxy(app) {
  const target = resolveProxyTarget();

  // HTTPS agent that bypasses self-signed certificate validation
  // (required for local .NET dev certificates on localhost:7179)
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
  });

  app.use(
    ["/api", "/uploads", "/offers", "/Images", "/images", "/Content"],
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      agent: target.startsWith("https") ? httpsAgent : undefined,
      headers: {
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "custom-app-client",
      },
      onProxyReq: (proxyReq) => {
        proxyReq.setHeader("ngrok-skip-browser-warning", "true");
        proxyReq.setHeader("User-Agent", "custom-app-client");
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error] ${req.method} ${req.url} → ${target}:`, err.message);
        if (!res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Backend proxy error", detail: err.message }));
        }
      },
    })
  );
};
