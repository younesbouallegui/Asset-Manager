import { Router } from "express";

const router = Router();
const TIMEOUT_MS = 15_000;

// ─── Health / diagnostic endpoint ─────────────────────────────────────────────

router.get("/zabbix/health", async (_req, res) => {
  const serverUrl = process.env.EXPO_PUBLIC_ZABBIX_URL?.trim();
  const apiToken = process.env.EXPO_PUBLIC_ZABBIX_TOKEN?.trim();

  const cfg = {
    serverUrlConfigured: !!serverUrl,
    apiTokenConfigured: !!apiToken,
    serverUrl: serverUrl ? serverUrl.replace(/\/+$/, "") : null,
  };

  if (!serverUrl || !apiToken) {
    res.status(503).json({ ok: false, reason: "env_not_configured", ...cfg });
    return;
  }

  const endpoint = `${serverUrl.replace(/\/+$/, "")}/api_jsonrpc.php`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // apiinfo.version must be called WITHOUT Authorization header (Zabbix API rule)
    const versionRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "apiinfo.version", params: {}, id: 1 }),
      signal: controller.signal as RequestInit["signal"],
    });
    clearTimeout(timer);
    const versionJson = (await versionRes.json()) as { result?: string; error?: { code: number; data?: string } };
    const zabbixVersion = versionJson.result ?? "unknown";

    // Verify auth token with a lightweight authenticated call
    const authTimer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const authRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ jsonrpc: "2.0", method: "host.get", params: { output: ["hostid"], limit: 1 }, id: 2 }),
      signal: controller.signal as RequestInit["signal"],
    });
    clearTimeout(authTimer);
    const authJson = (await authRes.json()) as { result?: unknown; error?: { code: number; data?: string } };
    if (authJson.error) {
      res.status(401).json({ ok: false, reason: "auth_error", zabbixError: authJson.error, zabbixVersion, ...cfg });
      return;
    }
    res.json({ ok: true, zabbixVersion, ...cfg });
  } catch (err) {
    clearTimeout(timer);
    const name = (err as Error).name;
    const msg = (err as Error).message ?? "";
    const isTimeout = name === "AbortError";
    const isSsl =
      msg.includes("certificate") ||
      msg.includes("CERT") ||
      msg.includes("SSL") ||
      msg.includes("TLS") ||
      msg.includes("self signed") ||
      msg.includes("UNABLE_TO_VERIFY");
    const isDns =
      msg.includes("ENOTFOUND") ||
      msg.includes("EAI_AGAIN") ||
      msg.includes("getaddrinfo");
    const reason = isTimeout ? "timeout" : isSsl ? "ssl_error" : isDns ? "dns_error" : "network_error";
    res.status(502).json({ ok: false, reason, error: msg, endpoint, ...cfg });
  }
});

function normalizeUrl(url: string): string {
  let u = url.trim();
  if (u.endsWith("/api_jsonrpc.php")) u = u.slice(0, -"/api_jsonrpc.php".length);
  return u.replace(/\/+$/, "");
}

router.post("/zabbix/rpc", async (req, res) => {
  const { method, params } = req.body as { method: string; params: unknown };

  if (!method) {
    res.status(400).json({ error: "Missing method" });
    return;
  }

  const serverUrl = process.env.EXPO_PUBLIC_ZABBIX_URL?.trim();
  const apiToken = process.env.EXPO_PUBLIC_ZABBIX_TOKEN?.trim();

  if (!serverUrl || !apiToken) {
    console.error("[ZabbixProxy] ✗ Zabbix env vars not configured");
    res.status(503).json({ error: "Zabbix not configured on server" });
    return;
  }

  const endpoint = `${normalizeUrl(serverUrl)}/api_jsonrpc.php`;
  const body = { jsonrpc: "2.0", method, params, id: 1 };

  console.log(
    `[ZabbixProxy] → ${method}`,
    JSON.stringify({ endpoint, params }),
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal as RequestInit["signal"],
    });
    clearTimeout(timer);

    const json = (await upstream.json()) as {
      result?: unknown;
      error?: { code: number; data?: string; message?: string };
    };

    if (json.error) {
      console.error(
        `[ZabbixProxy] ✗ ${method} API error:`,
        JSON.stringify({ error: json.error, endpoint, params }),
      );
    } else {
      console.log(`[ZabbixProxy] ✓ ${method} — HTTP ${upstream.status}`);
    }

    res.status(upstream.ok ? 200 : upstream.status).json(json);
  } catch (err) {
    clearTimeout(timer);
    const name = (err as Error).name;
    const msg = (err as Error).message;
    const isTimeout = name === "AbortError";
    console.error(
      `[ZabbixProxy] ✗ ${method} ${isTimeout ? "TIMEOUT" : "fetch error"}:`,
      JSON.stringify({ error: msg, endpoint, method, params }),
    );
    res.status(502).json({ error: isTimeout ? "TIMEOUT" : msg });
  }
});

export default router;
