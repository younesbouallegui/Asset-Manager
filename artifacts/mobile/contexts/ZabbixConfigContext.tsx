import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { ZABBIX_STORAGE, zabbixClient } from "@/services/zabbix/ZabbixClient";

export type ConnectionStatus = "connected" | "disconnected" | "not_configured" | "testing";

interface ZabbixConfigValue {
  serverUrl: string;
  apiToken: string;
  status: ConnectionStatus;
  zabbixVersion: string;
  lastSync: number | null;
  setServerUrl: (v: string) => Promise<void>;
  setApiToken: (v: string) => Promise<void>;
  testConnection: () => Promise<{ ok: boolean; message: string }>;
  markSynced: () => void;
  isReady: boolean;
}

const ZabbixConfigContext = createContext<ZabbixConfigValue | null>(null);

export function ZabbixConfigProvider({ children }: { children: React.ReactNode }) {
  const [serverUrl, setServerUrlState] = useState("");
  const [apiToken, setApiTokenState] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("not_configured");
  const [zabbixVersion, setZabbixVersion] = useState("");
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const [url, token, sync] = await Promise.all([
        AsyncStorage.getItem(ZABBIX_STORAGE.serverUrl),
        AsyncStorage.getItem(ZABBIX_STORAGE.apiToken),
        AsyncStorage.getItem(ZABBIX_STORAGE.lastSync),
      ]);
      if (!mounted.current) return;
      setServerUrlState(url ?? "");
      setApiTokenState(token ?? "");
      setLastSync(sync ? parseInt(sync, 10) : null);
      setStatus(url && token ? "disconnected" : "not_configured");
      setIsReady(true);
    })();
    return () => { mounted.current = false; };
  }, []);

  const setServerUrl = useCallback(async (v: string) => {
    setServerUrlState(v);
    await AsyncStorage.setItem(ZABBIX_STORAGE.serverUrl, v);
    setStatus(v && apiToken ? "disconnected" : "not_configured");
  }, [apiToken]);

  const setApiToken = useCallback(async (v: string) => {
    setApiTokenState(v);
    await AsyncStorage.setItem(ZABBIX_STORAGE.apiToken, v);
    setStatus(serverUrl && v ? "disconnected" : "not_configured");
  }, [serverUrl]);

  const testConnection = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!serverUrl || !apiToken) {
      return { ok: false, message: "Server URL and API token are required" };
    }
    setStatus("testing");
    try {
      const version = await zabbixClient.testConnection();
      if (mounted.current) {
        setZabbixVersion(version);
        setStatus("connected");
        setLastSync(Date.now());
        await AsyncStorage.setItem(ZABBIX_STORAGE.lastSync, String(Date.now()));
      }
      return { ok: true, message: `Connected — Zabbix v${version}` };
    } catch (e) {
      if (mounted.current) setStatus("disconnected");
      const msg = (e as Error).message;
      if (msg === "TIMEOUT") return { ok: false, message: "Connection timed out — check the server URL" };
      if (msg === "NETWORK_ERROR") return { ok: false, message: "Cannot reach server — check URL and internet connection" };
      if (msg === "HTTP_401") return { ok: false, message: "Unauthorized — API token is invalid or expired" };
      if (msg === "HTTP_403") return { ok: false, message: "Forbidden — check API token permissions in Zabbix" };
      if (msg === "HTTP_404") return { ok: false, message: "Server URL not found — check the URL path" };
      if (msg.startsWith("HTTP_")) return { ok: false, message: `Server error: ${msg}` };
      if (msg === "API_TOKEN_MISSING") return { ok: false, message: "API token is required" };
      return { ok: false, message: `Error: ${msg}` };
    }
  }, [serverUrl, apiToken]);

  const markSynced = useCallback(() => {
    const now = Date.now();
    setLastSync(now);
    AsyncStorage.setItem(ZABBIX_STORAGE.lastSync, String(now)).catch(() => {});
  }, []);

  return (
    <ZabbixConfigContext.Provider
      value={{
        serverUrl,
        apiToken,
        status,
        zabbixVersion,
        lastSync,
        setServerUrl,
        setApiToken,
        testConnection,
        markSynced,
        isReady,
      }}
    >
      {children}
    </ZabbixConfigContext.Provider>
  );
}

export function useZabbixConfig(): ZabbixConfigValue {
  const ctx = useContext(ZabbixConfigContext);
  if (!ctx) throw new Error("useZabbixConfig must be used within ZabbixConfigProvider");
  return ctx;
}
