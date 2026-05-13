import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ZabbixItemFull, ZabbixTrend } from "./MetricDiscovery";

export const ZABBIX_STORAGE = {
  serverUrl: "poulina.zabbix.serverUrl",
  apiToken: "poulina.zabbix.apiToken",
  lastSync: "poulina.zabbix.lastSync",
};

export const ANTHROPIC_STORAGE = {
  apiKey: "poulina.anthropic.apiKey",
};

const TIMEOUT_MS = 15_000;

export type ZabbixSeverityCode = "0" | "1" | "2" | "3" | "4" | "5";

export interface ZabbixProblem {
  eventid: string;
  objectid: string;
  severity: ZabbixSeverityCode;
  clock: string;
  name: string;
  acknowledged: "0" | "1";
  acknowledges?: { clock: string; message: string; alias?: string; name?: string }[];
  tags?: { tag: string; value: string }[];
}

export interface ZabbixHost {
  hostid: string;
  host: string;
  name: string;
  available: "0" | "1" | "2";
  status: "0" | "1";
  interfaces?: { ip: string; type: string; main: string; dns?: string; port?: string }[];
  groups?: { groupid: string; name: string }[];
  triggers?: string;
  items?: string;
}

export interface ZabbixTrigger {
  triggerid: string;
  description: string;
  priority: ZabbixSeverityCode;
  lastchange: string;
  value: string; // "0"=OK "1"=PROBLEM
  hosts: {
    hostid: string;
    host: string;
    name: string;
    interfaces?: { ip: string }[];
  }[];
  items?: { itemid: string; name: string; lastvalue: string; units: string }[];
}

export interface ZabbixItem {
  itemid: string;
  name: string;
  lastvalue: string;
  units: string;
  lastclock: string;
}

export interface ZabbixUser {
  userid: string;
  username: string;
  name: string;
  surname: string;
  roleid: string;
}

export interface ZabbixHistoryEntry {
  clock: string;
  value: string;
  itemid?: string;
}

export interface ZabbixService {
  serviceid: string;
  name: string;
  status: string;
  goodsla: string;
}

export interface ZabbixApiInfo {
  version: string;
}

export type { ZabbixItemFull, ZabbixTrend };

function normalizeServerUrl(serverUrl: string): string {
  let url = serverUrl.trim();
  if (url.endsWith("/api_jsonrpc.php")) {
    url = url.slice(0, -"/api_jsonrpc.php".length);
  }
  url = url.replace(/\/+$/, "");
  return url;
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

async function rpc<T>(
  serverUrl: string,
  method: string,
  params: unknown,
  token: string | null,
  useBearer: boolean,
): Promise<T> {
  const normalizedUrl = normalizeServerUrl(serverUrl);
  const endpoint = `${normalizedUrl}/api_jsonrpc.php`;

  const body: Record<string, unknown> = {
    jsonrpc: "2.0",
    method,
    params,
    id: 1,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    if (useBearer) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      body.auth = token;
    }
  }

  console.log(`[ZabbixRPC] → ${method}`, JSON.stringify({ endpoint, params }));

  let res: Response;
  try {
    res = await withTimeout(
      fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
    );
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[ZabbixRPC] ✗ ${method} fetch error:`, JSON.stringify({ endpoint, error: msg }));
    if (e instanceof TypeError) throw new Error("NETWORK_ERROR");
    throw e;
  }

  if (!res.ok) {
    console.error(`[ZabbixRPC] ✗ ${method} HTTP ${res.status}`, JSON.stringify({ endpoint }));
    throw new Error(`HTTP_${res.status}`);
  }

  const json = (await res.json()) as { result?: T; error?: { code: number; data?: string; message?: string } };

  if (json.error) {
    console.error(
      `[ZabbixRPC] ✗ ${method} API error:`,
      JSON.stringify({ error: json.error, endpoint, params }),
    );
    const e = new Error(json.error.data ?? json.error.message ?? "Zabbix error") as Error & { code: number };
    e.code = json.error.code;
    throw e;
  }

  console.log(`[ZabbixRPC] ✓ ${method} OK`);
  return json.result as T;
}

class ZabbixClient {
  async getServerUrl(): Promise<string | null> {
    const v = await AsyncStorage.getItem(ZABBIX_STORAGE.serverUrl);
    return v?.trim() || null;
  }

  async getApiToken(): Promise<string | null> {
    const v = await AsyncStorage.getItem(ZABBIX_STORAGE.apiToken);
    return v?.trim() || null;
  }

  async isConfigured(): Promise<boolean> {
    const url = await this.getServerUrl();
    const token = await this.getApiToken();
    return !!(url && token);
  }

  private async callViaBackend<T>(method: string, params: unknown): Promise<T> {
    // Priority: explicit API URL → Replit dev domain → Android-emulator localhost fallback
    // Set EXPO_PUBLIC_API_URL in your EAS build profile to point to the deployed backend.
    const apiBase =
      process.env.EXPO_PUBLIC_API_URL?.trim() ??
      (process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : null) ??
      "http://10.0.2.2:8080"; // 10.0.2.2 = host machine from Android emulator

    const backendUrl = `${apiBase}/api/zabbix/rpc`;

    console.log(`[ZabbixClient] → ${method} (via backend)`, JSON.stringify({ backendUrl, params }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, params }),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      const name = (e as Error).name;
      const msg = (e as Error).message;
      console.error(`[ZabbixClient] ✗ ${method} fetch error:`, JSON.stringify({ backendUrl, error: msg }));
      if (name === "AbortError") throw new Error("TIMEOUT");
      if (e instanceof TypeError) throw new Error("NETWORK_ERROR");
      throw e;
    }
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[ZabbixClient] ✗ ${method} HTTP ${res.status}:`, errText);
      throw new Error(`HTTP_${res.status}`);
    }

    const json = (await res.json()) as {
      result?: T;
      error?: { code: number; data?: string; message?: string };
    };

    if (json.error) {
      console.error(
        `[ZabbixClient] ✗ ${method} API error:`,
        JSON.stringify({ error: json.error, backendUrl, params }),
      );
      const e = new Error(json.error.data ?? json.error.message ?? "Zabbix error") as Error & { code: number };
      e.code = json.error.code;
      throw e;
    }

    console.log(`[ZabbixClient] ✓ ${method} OK`);
    return json.result as T;
  }

  private async call<T>(method: string, params: unknown): Promise<T> {
    return this.callViaBackend<T>(method, params);
  }

  // ─── Auth (direct calls, no CORS issues since they use session tokens) ─────

  async userLogin(serverUrl: string, username: string, password: string): Promise<string> {
    return rpc<string>(serverUrl.trim(), "user.login", { username, password }, null, false);
  }

  async getUserProfile(serverUrl: string, username: string, sessionToken: string): Promise<ZabbixUser> {
    const users = await rpc<ZabbixUser[]>(
      serverUrl,
      "user.get",
      { output: ["userid", "username", "name", "surname", "roleid"], filter: { username: [username] } },
      sessionToken,
      false,
    );
    if (!users.length) throw new Error("USER_NOT_FOUND");
    return users[0];
  }

  async userLogout(serverUrl: string, sessionToken: string): Promise<void> {
    try {
      await rpc<boolean>(serverUrl, "user.logout", [], sessionToken, false);
    } catch {
      // best-effort
    }
  }

  async testConnection(): Promise<{ version: string; hostCount: number; problemCount: number }> {
    const serverUrl = await this.getServerUrl();
    const apiToken = await this.getApiToken();
    if (!serverUrl) throw new Error("ZABBIX_NOT_CONFIGURED");
    if (!apiToken) throw new Error("API_TOKEN_MISSING");

    // Route through the backend proxy instead of calling Zabbix directly.
    // This avoids SSL/TLS certificate rejections and CORS issues on Android.
    // The backend validates the env-configured Zabbix credentials.
    const apiBase =
      process.env.EXPO_PUBLIC_API_URL?.trim() ??
      (process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : null) ??
      "http://10.0.2.2:8080";

    const healthUrl = `${apiBase}/api/zabbix/health`;
    console.log(`[ZabbixClient] testConnection via backend health check`, JSON.stringify({ healthUrl }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(healthUrl, { signal: controller.signal as RequestInit["signal"] });
    } catch (e) {
      clearTimeout(timer);
      const name = (e as Error).name;
      const msg = (e as Error).message ?? "";
      console.error(`[ZabbixClient] testConnection health fetch error:`, JSON.stringify({ healthUrl, error: msg }));
      if (name === "AbortError") throw new Error("TIMEOUT");
      if (e instanceof TypeError) throw new Error("NETWORK_ERROR");
      throw e;
    }
    clearTimeout(timer);

    const json = (await res.json()) as {
      ok: boolean;
      reason?: string;
      zabbixVersion?: string;
      zabbixError?: { code: number; data?: string };
      serverUrlConfigured?: boolean;
      apiTokenConfigured?: boolean;
    };

    if (!json.ok) {
      const reason = json.reason ?? "network_error";
      if (reason === "env_not_configured") throw new Error("ZABBIX_NOT_CONFIGURED");
      if (reason === "auth_error") throw new Error(`AUTH_ERROR:${json.zabbixError?.data ?? "Invalid token"}`);
      if (reason === "ssl_error") throw new Error("SSL_ERROR");
      if (reason === "dns_error") throw new Error("DNS_ERROR");
      if (reason === "timeout") throw new Error("TIMEOUT");
      throw new Error("NETWORK_ERROR");
    }

    // Fetch live counts in parallel through proxy
    const [hosts, problems] = await Promise.all([
      this.callViaBackend<ZabbixHost[]>("host.get", { output: ["hostid"], limit: 1000 }),
      this.callViaBackend<ZabbixProblem[]>("problem.get", { output: ["eventid"], limit: 1000 }),
    ]);

    return {
      version: json.zabbixVersion ?? "?",
      hostCount: hosts.length,
      problemCount: problems.length,
    };
  }

  // ─── Core data methods (all via backend proxy) ────────────────────────────

  async getProblems(extra?: Record<string, unknown>): Promise<ZabbixProblem[]> {
    return this.call("problem.get", {
      output: ["eventid", "objectid", "severity", "clock", "name", "acknowledged"],
      selectAcknowledges: "extend",
      selectTags: "extend",
      sortfield: "eventid",
      sortorder: "DESC",
      limit: 200,
      ...(extra ?? {}),
    });
  }

  async getHosts(extra?: Record<string, unknown>): Promise<ZabbixHost[]> {
    return this.call("host.get", {
      output: ["hostid", "host", "name", "available", "status"],
      selectInterfaces: ["ip", "type", "main", "dns", "port"],
      selectGroups: ["groupid", "name"],
      ...(extra ?? {}),
    });
  }

  async getTriggers(triggerids: string[]): Promise<ZabbixTrigger[]> {
    const ids = triggerids.filter((id) => id && id !== "0");
    if (ids.length === 0) return [];
    return this.call("trigger.get", {
      output: ["triggerid", "description", "priority", "lastchange", "value"],
      selectHosts: ["hostid", "host", "name"],
      triggerids: ids,
    });
  }

  async getTriggersForHost(hostid: string): Promise<ZabbixTrigger[]> {
    return this.call("trigger.get", {
      output: ["triggerid", "description", "priority", "lastchange", "value"],
      selectHosts: ["hostid", "host", "name"],
      hostids: [hostid],
      only_true: 1,
      filter: { value: "1" },
      sortfield: "priority",
      sortorder: "DESC",
      limit: 50,
    });
  }

  // ─── Items / Metrics ──────────────────────────────────────────────────────

  async getItemsForHosts(hostids: string[]): Promise<ZabbixItemFull[]> {
    if (hostids.length === 0) return [];
    return this.call("item.get", {
      output: ["itemid", "name", "key_", "lastvalue", "units", "lastclock", "hostid", "value_type"],
      hostids,
      monitored: true,
      search: {
        key_: [
          "system.cpu.util",
          "vm.memory.size",
          "vfs.fs.size",
          "icmpping",
          "net.if.in",
          "net.if.out",
          "system.uptime",
        ],
      },
      searchByAny: true,
    });
  }

  async getHostAllItems(hostid: string): Promise<ZabbixItemFull[]> {
    return this.call("item.get", {
      output: ["itemid", "name", "key_", "lastvalue", "units", "lastclock", "hostid", "value_type"],
      hostids: [hostid],
      monitored: true,
      sortfield: "name",
      sortorder: "ASC",
      limit: 200,
    });
  }

  async getItems(hostids: string[]): Promise<ZabbixItem[]> {
    return this.call("item.get", {
      output: ["itemid", "name", "lastvalue", "units", "lastclock"],
      hostids,
      monitored: true,
      limit: 50,
    });
  }

  // ─── History / Trends ─────────────────────────────────────────────────────

  async getHistory(
    itemids: string[],
    timeFrom: number,
    valueType: 0 | 3 = 0,
  ): Promise<ZabbixHistoryEntry[]> {
    if (itemids.length === 0) return [];
    return this.call("history.get", {
      output: "extend",
      history: valueType,
      itemids,
      time_from: timeFrom,
      time_till: Math.floor(Date.now() / 1000),
      sortfield: "clock",
      sortorder: "ASC",
      limit: 500,
    });
  }

  async getTrends(
    itemids: string[],
    timeFrom: number,
    timeTill?: number,
  ): Promise<ZabbixTrend[]> {
    if (itemids.length === 0) return [];
    return this.call("trend.get", {
      output: ["clock", "num", "value_min", "value_avg", "value_max", "itemid"],
      itemids,
      time_from: timeFrom,
      time_till: timeTill ?? Math.floor(Date.now() / 1000),
    });
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async getUsers(): Promise<ZabbixUser[]> {
    return this.call("user.get", {
      output: ["userid", "username", "name", "surname", "roleid"],
      selectRole: ["roleid", "name"],
    });
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  async acknowledgeEvent(eventids: string[]): Promise<void> {
    await this.call("event.acknowledge", {
      eventids,
      action: 6,
      message: "Acknowledged via Poulina AI OpsHub",
    });
  }
}

export const zabbixClient = new ZabbixClient();
