import http from "node:http";
import net from "node:net";
import QRCode from "qrcode";

const API_PORT = 8080;
const EXPO_PORT = parseInt(process.env.EXPO_WEB_PORT || "18115", 10);
const PROXY_PORT = parseInt(process.env.PORT || "5000", 10);

const EXPO_DEV_DOMAIN = process.env.REPLIT_EXPO_DEV_DOMAIN || "";
const EXPO_GO_URL = EXPO_DEV_DOMAIN ? `exp://${EXPO_DEV_DOMAIN}` : null;

function targetPort(url) {
  return url.startsWith("/api/") || url === "/api" ? API_PORT : EXPO_PORT;
}

function isRootBrowserRequest(req) {
  const url = req.url ?? "";
  const isRoot = url === "/" || url === "" || url === "/?";
  const wantsWeb = url.includes("web=1");
  return (
    isRoot &&
    !wantsWeb &&
    req.method === "GET" &&
    (req.headers["accept"] || "").includes("text/html")
  );
}

async function landingPage(expoGoUrl) {
  let qrDataUrl = null;
  if (expoGoUrl) {
    qrDataUrl = await QRCode.toDataURL(expoGoUrl, {
      width: 240,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Poulina AI OpsHub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 36px 40px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    }
    .logo {
      font-size: 26px;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 4px;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 28px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }
    .qr-wrap {
      background: #fff;
      border-radius: 12px;
      padding: 12px;
      display: inline-block;
      margin-bottom: 16px;
    }
    .qr-wrap img { display: block; border-radius: 4px; }
    .expo-url {
      font-size: 11px;
      color: #475569;
      word-break: break-all;
      margin-bottom: 20px;
      background: #0f172a;
      border-radius: 8px;
      padding: 10px 12px;
      border: 1px solid #1e293b;
      font-family: monospace;
    }
    .instructions {
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .divider {
      border: none;
      border-top: 1px solid #334155;
      margin: 0 0 20px 0;
    }
    .web-btn {
      display: block;
      background: #3b82f6;
      color: #fff;
      text-decoration: none;
      border-radius: 10px;
      padding: 13px 24px;
      font-size: 15px;
      font-weight: 600;
      transition: background 0.15s;
    }
    .web-btn:hover { background: #2563eb; }
    .no-qr { color: #ef4444; font-size: 13px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Poulina AI OpsHub</div>
    <div class="subtitle">Intelligent Infrastructure Monitoring</div>

    ${qrDataUrl ? `
    <div class="qr-wrap">
      <img src="${qrDataUrl}" width="240" height="240" alt="Expo Go QR Code" />
    </div>
    <div class="expo-url">${expoGoUrl}</div>
    <p class="instructions">
      Scan with <strong>Expo Go</strong> on your phone<br/>
      iOS: Camera app &nbsp;·&nbsp; Android: Expo Go app
    </p>
    <hr class="divider" />
    ` : `
    <p class="no-qr">Expo Go URL not available in this environment.</p>
    `}

    <a class="web-btn" href="/?web=1">Open Web Version</a>
  </div>
</body>
</html>`;
}

// Pre-generate the landing page HTML once at startup
let cachedLandingPage = null;
landingPage(EXPO_GO_URL).then((html) => { cachedLandingPage = html; });

const server = http.createServer(async (req, res) => {
  // Serve QR landing page at root for browser requests
  if (isRootBrowserRequest(req)) {
    const html = cachedLandingPage || await landingPage(EXPO_GO_URL);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  // Strip /app prefix so web version is accessible at /app
  let proxyUrl = req.url ?? "/";
  if (proxyUrl === "/app" || proxyUrl.startsWith("/app/")) {
    proxyUrl = proxyUrl.slice(4) || "/";
  }

  const port = targetPort(proxyUrl);

  const proxy = http.request(
    {
      hostname: "localhost",
      port,
      path: proxyUrl,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${port}` },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    },
  );

  proxy.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end(
        port === API_PORT
          ? "API server not ready — please wait a moment."
          : "Expo Metro not ready — please wait a moment and refresh.",
      );
    }
  });

  req.pipe(proxy, { end: true });
});

// WebSocket upgrades — needed for Expo HMR
server.on("upgrade", (req, clientSocket, head) => {
  let proxyUrl = req.url ?? "/";
  if (proxyUrl === "/app" || proxyUrl.startsWith("/app/")) {
    proxyUrl = proxyUrl.slice(4) || "/";
  }
  const port = targetPort(proxyUrl);
  const targetSocket = net.connect(port, "localhost", () => {
    const reqLine = `${req.method} ${proxyUrl} HTTP/1.1\r\n`;
    const headers = Object.entries({ ...req.headers, host: `localhost:${port}` })
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    targetSocket.write(`${reqLine}${headers}\r\n\r\n`);
    if (head && head.length) targetSocket.write(head);
    targetSocket.pipe(clientSocket, { end: true });
    clientSocket.pipe(targetSocket, { end: true });
  });

  targetSocket.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => targetSocket.destroy());
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(
    `Expo proxy: localhost:${PROXY_PORT} → / QR page, /app/* → :${EXPO_PORT}, /api/* → :${API_PORT}`,
  );
  if (EXPO_GO_URL) console.log(`Expo Go URL: ${EXPO_GO_URL}`);
});
