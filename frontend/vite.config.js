import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import envCompatible from 'vite-plugin-env-compatible';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTION_API_URL = "https://www.picknbook.in";

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
      (port === "3000" || port === "5173")
    );
  } catch {
    return false;
  }
}

function resolveProxyTarget() {
  const candidates = [
    process.env.REACT_APP_API_PROXY_TARGET,
    process.env.REACT_APP_API_BASE_URL,
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

  return PRODUCTION_API_URL;
}

export default defineConfig(({ mode }) => {
  // Load .env file so vite.config.js can read REACT_APP_* variables
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  const target = resolveProxyTarget();

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
  });

  return {
  envPrefix: 'REACT_APP_',
  define: {
    global: 'globalThis',
  },
  plugins: [
    react(),
    envCompatible(),
    {
      name: 'cra-setup-proxy-migration',
      configureServer(server) {
        // Sync local flight video and hero background assets automatically
        try {
          const srcMp4 = 'C:\\Users\\vinay\\Downloads\\Give_me_a_background_screen_fo.mp4';
          const srcPng = 'C:\\Users\\vinay\\Downloads\\flight-hero-theme.png';
          const targets = [
            { src: srcMp4, dest: path.join(__dirname, 'public/home_flight.mp4') },
            { src: srcMp4, dest: path.join(__dirname, 'public/Give_me_a_background_screen_fo.mp4') },
            { src: srcMp4, dest: path.join(__dirname, 'src/assets/images/illustrations/home_flight.mp4') },
            { src: srcPng, dest: path.join(__dirname, 'src/assets/images/illustrations/flight-hero-theme.png') },
            { src: srcPng, dest: path.join(__dirname, 'src/assets/images/illustrations/flight-hero-theme.jpg') },
            { src: srcPng, dest: path.join(__dirname, 'public/flight-hero-theme.png') },
            {
              src: 'C:\\Users\\vinay\\.gemini\\antigravity-ide\\brain\\fd6618d5-9516-4436-8c9b-be2339f429cd\\media__1786455540235.jpg',
              dest: path.join(__dirname, 'src/assets/images/illustrations/bus-hero-theme.png')
            },
            {
              src: 'C:\\Users\\vinay\\.gemini\\antigravity-ide\\brain\\fd6618d5-9516-4436-8c9b-be2339f429cd\\media__1786451949910.png',
              dest: path.join(__dirname, 'src/assets/images/new-landscape-bg.jpg')
            },
            {
              src: 'C:\\Users\\vinay\\.gemini\\antigravity-ide\\brain\\fd6618d5-9516-4436-8c9b-be2339f429cd\\media__1786452449571.png',
              dest: path.join(__dirname, 'src/assets/images/brand/pick-n-book-logo.png')
            },
            {
              src: 'C:\\Users\\vinay\\.gemini\\antigravity-ide\\brain\\fd6618d5-9516-4436-8c9b-be2339f429cd\\media__1786456745530.png',
              dest: path.join(__dirname, 'src/assets/images/indian-travel-banner-hd.png')
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

        // Intercept local assets directly
        server.middlewares.use((req, res, next) => {
          if (["/flight-hero-theme.mp4", "/home_flight.mp4", "/Give_me_a_background_screen_fo.mp4"].includes(req.url)) {
            const videoPath1 = path.join(__dirname, 'src/assets/images/illustrations/flight-hero-theme.mp4');
            if (fs.existsSync(videoPath1)) {
              res.setHeader('Content-Type', 'video/mp4');
              return fs.createReadStream(videoPath1).pipe(res);
            }
            const videoPath2 = 'C:\\Users\\vinay\\Downloads\\Give_me_a_background_screen_fo.mp4';
            if (fs.existsSync(videoPath2)) {
              res.setHeader('Content-Type', 'video/mp4');
              return fs.createReadStream(videoPath2).pipe(res);
            }
            const fallbackPath = path.join(__dirname, 'public/home_flight.mp4');
            if (fs.existsSync(fallbackPath)) {
              res.setHeader('Content-Type', 'video/mp4');
              return fs.createReadStream(fallbackPath).pipe(res);
            }
            return res.statusCode = 404, res.end();
          }

          if (["/flight-hero-theme.png", "/flight-hero-theme.jpg"].includes(req.url)) {
            const imgPath = path.join(__dirname, 'src/assets/images/illustrations/flight-hero-theme.png');
            if (fs.existsSync(imgPath)) {
              res.setHeader('Content-Type', 'image/png');
              return fs.createReadStream(imgPath).pipe(res);
            }
            return res.statusCode = 404, res.end();
          }
          next();
        });
      }
    }
  ],
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: "load-js-files-as-jsx",
          setup(build) {
            build.onLoad({ filter: /src\/.*\.js$/ }, async (args) => ({
              loader: "jsx",
              contents: await fs.promises.readFile(args.path, "utf8"),
            }));
          },
        },
      ],
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '^/(api|uploads|offers|Images|images|Content)': {
        target,
        changeOrigin: true,
        secure: false,
        agent: target.startsWith("https") ? httpsAgent : undefined,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader("ngrok-skip-browser-warning", "true");
            proxyReq.setHeader("User-Agent", "custom-app-client");

            if (req.url.includes("/api/")) {
              const originalWrite = proxyReq.write;
              const originalEnd = proxyReq.end;
              let reqBodyStr = "";

              proxyReq.write = function (chunk) {
                if (chunk) reqBodyStr += chunk.toString();
                return originalWrite.apply(this, arguments);
              };

              proxyReq.end = function (chunk) {
                if (chunk) reqBodyStr += chunk.toString();
                try {
                  if (reqBodyStr && reqBodyStr.startsWith("{")) {
                    const parsed = JSON.parse(reqBodyStr);
                    if (parsed.Password) parsed.Password = "[REDACTED]";
                    console.log(`\n==================================================`);
                    console.log(`🚀 [API REQUEST] ${req.method} ${target}${req.url}`);
                    console.log(`📦 Request Payload:`, JSON.stringify(parsed, null, 2));
                    console.log(`==================================================\n`);
                  }
                } catch (e) { }
                return originalEnd.apply(this, arguments);
              };
            }
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            if (req.url.includes("/api/")) {
              let resBodyStr = "";
              proxyRes.on('data', (chunk) => {
                resBodyStr += chunk.toString();
              });
              proxyRes.on('end', () => {
                try {
                  if (resBodyStr && resBodyStr.startsWith("{")) {
                    const parsed = JSON.parse(resBodyStr);
                    console.log(`\n==================================================`);
                    console.log(`✅ [API RESPONSE] ${req.method} ${req.url} (Status: ${proxyRes.statusCode})`);
                    const str = JSON.stringify(parsed, null, 2);
                    console.log(`📥 Response Data:`, str.length > 800 ? str.substring(0, 800) + '...\n  }\n}' : str);
                    console.log(`==================================================\n`);
                  }
                } catch (e) { }
              });
            }
          });

          proxy.on('error', (err, req, res) => {
            console.error(`[Proxy Error] ${req.method} ${req.url} → ${target}:`, err.message);
            if (!res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Backend proxy error", detail: err.message }));
            }
          });
        }
      }
    }
  }
};
});
