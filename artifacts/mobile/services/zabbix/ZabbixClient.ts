import AsyncStorage from "@react-native-async-storage/async-storage";

export const ZABBIX_STORAGE = {
  serverUrl: "poulina.zabbix.serverUrl",
  apiToken: "poulina.zabbix.apiToken",
  lastSync: "poulina.zabbix.lastSync",
};

export const ANTHROPIC_STORAGE = {
  apiKey: "poulina.anthropic.apiKey",
};

const TIMEOUT_MS = 10_000;

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
  interfaces?: { ip: string; type: string; main: string }[];
  groups?: { groupid: string; name: string }[];
  triggers?: string;
  items?: string;
}

export interface ZabbixTrigger {
  triggerid: string;
  description: string;
  priority: ZabbixSeverityCode;
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
    if (e instanceof TypeError) throw new Error("NETWORK_ERROR");
    throw e;
  }

  if (!res.ok) {
    throw new Error(`HTTP_${res.status}`);
  }

  const json = (await res.json()) as { result?: T; error?: { code: number; data?: string; message?: string } };

  if (json.error) {
    console.error("[ZabbixRPC] API error:", JSON.stringify(json.error), "method:", method);
    const e = new Error(json.error.data ?? json.error.message ?? "Zabbix error") as Error & { code: number };
    e.code = json.error.code;
    throw e;
  }

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

  private async call<T>(method: string, params: unknown): Promise<T> {
    const serverUrl = await this.getServerUrl();
    const apiToken = await this.getApiToken();
    if (!serverUrl) throw new Error("ZABBIX_NOT_CONFIGURED");
    if (!apiToken) throw new Error("ZABBIX_NOT_CONFIGURED");
    return rpc<T>(serverUrl, method, params, apiToken, true);
  }

  async userLogin(serverUrl: string, username: string, password: string): Promise<string> {
    return rpc<string>(serverUrl.trim(), "user.login", { username, password }, null, false);
  }

  async getUserProfile(serverUrl: string, username: string, sessionToken: string): Promise<ZabbixUser> {
    const users = await rpc<ZabbixUser[]>(
      serverUrl,
      "user.get",
      { output: ["userid", "username", "name", "surname", "roleid", "type"], filter: { username: [username] } },
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

  async testConnection(): Promise<string> {
    const serverUrl = await this.getServerUrl();
    const apiToken = await this.getApiToken();
    if (!serverUrl) throw new Error("ZABBIX_NOT_CONFIGURED");
    if (!apiToken) throw new Error("API_TOKEN_MISSING");
    // apiinfo.version is a public method — must NOT send Authorization header
    const version = await rpc<string>(serverUrl, "apiinfo.version", {}, null, false);
    // Verify the bearer token actually works with a lightweight authenticated call
    await rpc<ZabbixHost[]>(serverUrl, "host.get", { output: ["hostid"], limit: 1 }, apiToken, true);
    return version;
  }

  async getProblems(extra?: Record<string, unknown>): Promise<ZabbixProblem[]> {
    return this.call("problem.get", {
      output: ["eventid", "objectid", "severity", "clock", "name", "acknowledged"],
      selectAcknowledges: "extend",
      selectTags: "extend",
      sortfield: ["severity", "clock"],
      sortorder: ["DESC", "DESC"],
      limit: 100,
      ...(extra ?? {}),
    });
  }

  async getHosts(extra?: Record<string, unknown>): Promise<ZabbixHost[]> {
    return this.call("host.get", {
      output: ["hostid", "host", "name", "available", "status"],
      selectInterfaces: ["ip", "type", "main"],
      selectGroups: ["groupid", "name"],
      ...(extra ?? {}),
    });
  }

  async getTriggers(triggerids: string[]): Promise<ZabbixTrigger[]> {
    const ids = triggerids.filter((id) => id && id !== "0");
    if (ids.length === 0) return [];
    return this.call("trigger.get", {
      output: ["triggerid", "description", "priority"],
      selectHosts: ["hostid", "host", "name"],
      triggerids: ids,
    });
  }

  async getItems(hostids: string[]): Promise<ZabbixItem[]> {
    return this.call("item.get", {
      output: ["itemid", "name", "lastvalue", "units", "lastclock"],
      hostids,
      monitored: true,
      limit: 30,
    });
  }

  async getHistory(itemids: string[], timeFrom: number): Promise<ZabbixHistoryEntry[]> {
    return this.call("history.get", {
      output: "extend",
      history: 0,
      itemids,
      time_from: timeFrom,
      time_till: Math.floor(Date.now() / 1000),
      limit: 100,
    });
  }

  async getUsers(): Promise<ZabbixUser[]> {
    return this.call("user.get", {
      output: ["userid", "username", "name", "surname", "roleid"],
      selectRole: ["roleid", "name"],
    });
  }

  async acknowledgeEvent(eventids: string[]): Promise<void> {
    await this.call("event.acknowledge", {
      eventids,
      action: 6,
      message: "Acknowledged via Poulina AI OpsHub",
    });
  }
}

export const zabbixClient = new ZabbixClient();
