/* eslint-disable */
const { createProxyMiddleware } = require("http-proxy-middleware");
const https = require("https");
const fs = require("fs");
const path = require("path");

// Sync local flight video and hero background assets automatically
try {
  const srcMp4 = 'C:\\Users\\vinay\\Downloads\\Give_me_a_background_screen_fo.mp4';
  const srcPng = 'C:\\Users\\vinay\\Downloads\\flight-hero-theme.png';
  const targets = [
    { src: srcMp4, dest: path.join(__dirname, '../public/home_flight.mp4') },
    { src: srcMp4, dest: path.join(__dirname, '../public/Give_me_a_background_screen_fo.mp4') },
    { src: srcMp4, dest: path.join(__dirname, 'assets/images/illustrations/home_flight.mp4') },
    { src: srcPng, dest: path.join(__dirname, 'assets/images/illustrations/flight-hero-theme.png') },
    { src: srcPng, dest: path.join(__dirname, 'assets/images/illustrations/flight-hero-theme.jpg') },
    { src: srcPng, dest: path.join(__dirname, '../public/flight-hero-theme.png') },
    { 
      src: 'C:\\\\Users\\\\vinay\\\\.gemini\\\\antigravity-ide\\\\brain\\\\fd6618d5-9516-4436-8c9b-be2339f429cd\\\\media__1786455540235.jpg',
      dest: path.join(__dirname, 'assets/images/illustrations/bus-hero-theme.png')
    },
    {
      src: 'C:\\\\Users\\\\vinay\\\\.gemini\\\\antigravity-ide\\\\brain\\\\fd6618d5-9516-4436-8c9b-be2339f429cd\\\\media__1786451949910.png',
      dest: path.join(__dirname, 'assets/images/new-landscape-bg.jpg')
    },
    {
      src: 'C:\\\\Users\\\\vinay\\\\.gemini\\\\antigravity-ide\\\\brain\\\\fd6618d5-9516-4436-8c9b-be2339f429cd\\\\media__1786452449571.png',
      dest: path.join(__dirname, 'assets/images/brand/pick-n-book-logo.png')
    },
    {
      src: 'C:\\\\Users\\\\vinay\\\\.gemini\\\\antigravity-ide\\\\brain\\\\fd6618d5-9516-4436-8c9b-be2339f429cd\\\\media__1786456745530.png',
      dest: path.join(__dirname, 'assets/images/indian-travel-banner-hd.png')
    }
  ];
  targets.forEach(t => {
    if (fs.existsSync(t.src)) {
      const dir = path.dirname(t.dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(t.src, t.dest);
      console.log(`[Asset Sync] Successfully copied ${t.src} -> ${t.dest}`);
    }
  });
} catch (e) {
  console.log('[Asset Sync] Warning:', e.message);
}

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
  // Serve local flight video directly
  app.get(["/flight-hero-theme.mp4", "/home_flight.mp4", "/Give_me_a_background_screen_fo.mp4"], (req, res) => {
    const videoPath1 = path.join(__dirname, 'assets/images/illustrations/flight-hero-theme.mp4');
    if (fs.existsSync(videoPath1)) {
      return res.sendFile(videoPath1);
    }
    const videoPath2 = 'C:\\Users\\vinay\\Downloads\\Give_me_a_background_screen_fo.mp4';
    if (fs.existsSync(videoPath2)) {
      return res.sendFile(videoPath2);
    }
    const fallbackPath = path.join(__dirname, '../public/home_flight.mp4');
    if (fs.existsSync(fallbackPath)) {
      return res.sendFile(fallbackPath);
    }
    res.status(404).end();
  });

  // Serve local flight background image directly
  app.get(["/flight-hero-theme.png", "/flight-hero-theme.jpg"], (req, res) => {
    const imgPath = 'C:\\Users\\vinay\\Downloads\\flight-hero-theme.png';
    if (fs.existsSync(imgPath)) {
      return res.sendFile(imgPath);
    }
    res.status(404).end();
  });

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
      onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader("ngrok-skip-browser-warning", "true");
        proxyReq.setHeader("User-Agent", "custom-app-client");

        if (req.url.includes("/api/")) {
          const originalWrite = proxyReq.write;
          const originalEnd = proxyReq.end;
          let reqBodyStr = "";

          proxyReq.write = function(chunk) {
            if (chunk) reqBodyStr += chunk.toString();
            return originalWrite.apply(this, arguments);
          };

          proxyReq.end = function(chunk) {
            if (chunk) reqBodyStr += chunk.toString();
            try {
              if (reqBodyStr && reqBodyStr.startsWith("{")) {
                const parsed = JSON.parse(reqBodyStr);
                if (parsed.Password) parsed.Password = "[REDACTED]";
                console.log(`\n==================================================`);
                console.log(`ðŸš€ [API REQUEST] ${req.method} ${target}${req.url}`);
                console.log(`ðŸ“¦ Request Payload:`, JSON.stringify(parsed, null, 2));
                console.log(`==================================================\n`);
              }
            } catch (e) {}
            return originalEnd.apply(this, arguments);
          };
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        if (req.url.includes("/api/")) {
          const originalWrite = res.write;
          const originalEnd = res.end;
          let resBodyStr = "";

          res.write = function(chunk) {
            if (chunk) resBodyStr += chunk.toString();
            return originalWrite.apply(this, arguments);
          };

          res.end = function(chunk) {
            if (chunk) resBodyStr += chunk.toString();
            try {
              if (resBodyStr && resBodyStr.startsWith("{")) {
                const parsed = JSON.parse(resBodyStr);
                console.log(`\n==================================================`);
                console.log(`âœ… [API RESPONSE] ${req.method} ${req.url} (Status: ${proxyRes.statusCode})`);
                const str = JSON.stringify(parsed, null, 2);
                console.log(`ðŸ“¥ Response Data:`, str.length > 800 ? str.substring(0, 800) + '...\n  }\n}' : str);
                console.log(`==================================================\n`);
              }
            } catch (e) {}
            return originalEnd.apply(this, arguments);
          };
        }
      },
      onError: (err, req, res) => {
        console.error(`[Proxy Error] ${req.method} ${req.url} â†’ ${target}:`, err.message);
        if (!res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Backend proxy error", detail: err.message }));
        }
      },
    })
  );
};
