import http from "node:http";

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
    res.writeHead(502);
    res.end("Expo Metro not ready yet — please wait a moment and refresh.");
  });

  req.pipe(proxy, { end: true });
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`Expo proxy: localhost:${PROXY_PORT} → localhost:${TARGET_PORT}`);
});
