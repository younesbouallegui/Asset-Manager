import http from "node:http";
import net from "node:net";

const API_PORT = 8080;
const EXPO_PORT = 8081;
const PROXY_PORT = parseInt(process.env.PORT || "5000", 10);

function targetPort(url) {
  return url.startsWith("/api/") || url === "/api" ? API_PORT : EXPO_PORT;
}

const server = http.createServer((req, res) => {
  const port = targetPort(req.url ?? "/");

  const proxy = http.request(
    {
      hostname: "localhost",
      port,
      path: req.url,
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

// WebSocket upgrades — only needed for Expo HMR (port 8081)
server.on("upgrade", (req, clientSocket, head) => {
  const port = targetPort(req.url ?? "/");
  const targetSocket = net.connect(port, "localhost", () => {
    const reqLine = `${req.method} ${req.url} HTTP/1.1\r\n`;
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
    `Expo proxy: localhost:${PROXY_PORT} → /api/* → :${API_PORT}, /* → :${EXPO_PORT} (HTTP + WS)`,
  );
});
