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
  hostCount: number | null;
  problemCount: number | null;
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
  const [hostCount, setHostCount] = useState<number | null>(null);
  const [problemCount, setProblemCount] = useState<number | null>(null);
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
    if (mounted.current) {
      setStatus(v && apiToken ? "disconnected" : "not_configured");
    }
  }, [apiToken]);

  const setApiToken = useCallback(async (v: string) => {
    setApiTokenState(v);
    await AsyncStorage.setItem(ZABBIX_STORAGE.apiToken, v);
    if (mounted.current) {
      setStatus(serverUrl && v ? "disconnected" : "not_configured");
    }
  }, [serverUrl]);

  const testConnection = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!serverUrl || !apiToken) {
      return { ok: false, message: "Server URL and API token are required" };
    }
    setStatus("testing");
    try {
      const { version, hostCount: hc, problemCount: pc } = await zabbixClient.testConnection();
      if (mounted.current) {
        setZabbixVersion(version);
        setHostCount(hc);
        setProblemCount(pc);
        setStatus("connected");
        const now = Date.now();
        setLastSync(now);
        await AsyncStorage.setItem(ZABBIX_STORAGE.lastSync, String(now));
      }
      return { ok: true, message: `Connected — Zabbix v${version}` };
    } catch (e) {
      if (mounted.current) setStatus("disconnected");
      const msg = (e as Error).message;
      if (msg === "TIMEOUT") return { ok: false, message: "Connection timed out" };
      if (msg === "NETWORK_ERROR") return { ok: false, message: "Cannot reach server" };
      if (msg === "HTTP_401") return { ok: false, message: "Invalid API token" };
      if (msg === "HTTP_403") return { ok: false, message: "Insufficient permissions" };
      if (msg === "HTTP_404") return { ok: false, message: "Server URL not found" };
      if (msg.startsWith("HTTP_")) return { ok: false, message: `Server error: ${msg}` };
      return { ok: false, message: `Error: ${msg}` };
    }
  }, [serverUrl, apiToken]);

  const markSynced = useCallback(() => {
    const now = Date.now();
    setLastSync(now);
    if (mounted.current) setStatus("connected");
    AsyncStorage.setItem(ZABBIX_STORAGE.lastSync, String(now)).catch(() => {});
  }, []);

  return (
    <ZabbixConfigContext.Provider
      value={{
        serverUrl,
        apiToken,
        status,
        zabbixVersion,
        hostCount,
        problemCount,
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
