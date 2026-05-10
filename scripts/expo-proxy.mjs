import http from "node:http";
import net from "node:net";

const TARGET_PORT = 8081;
const PROXY_PORT = parseInt(process.env.PORT || "5000", 10);

const server = http.createServer((req, res) => {
  const options = {
    hostname: "localhost",
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${TARGET_PORT}`,
    },
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502);
      res.end("Expo Metro not ready yet — please wait a moment and refresh.");
    }
  });

  req.pipe(proxy, { end: true });
});

// Forward WebSocket upgrades (needed for Expo HMR / live-reload)
server.on("upgrade", (req, clientSocket, head) => {
  const targetSocket = net.connect(TARGET_PORT, "localhost", () => {
    const reqLine = `${req.method} ${req.url} HTTP/1.1\r\n`;
    const headers = Object.entries({ ...req.headers, host: `localhost:${TARGET_PORT}` })
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
  console.log(`Expo proxy: localhost:${PROXY_PORT} → localhost:${TARGET_PORT} (HTTP + WS)`);
});
