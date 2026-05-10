import { Router } from "express";

const router = Router();
const TIMEOUT_MS = 15_000;

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
