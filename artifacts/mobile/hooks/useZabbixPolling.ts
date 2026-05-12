import { useCallback, useEffect, useRef, useState } from "react";

import { useZabbixConfig } from "@/contexts/ZabbixConfigContext";
import { getHosts, getIncidents, Host, Incident } from "@/services/dataService";

export interface ZabbixPollingResult {
  problems: Incident[];
  hosts: Host[];
  loading: boolean;
  error: string | null;
  lastSync: number | null;
  refresh: () => void;
}

function friendlyError(msg: string): string {
  if (msg === "ZABBIX_NOT_CONFIGURED")
    return "Connect Zabbix in Settings to view live data";
  if (msg === "NETWORK_ERROR")
    return "Cannot reach Zabbix server — check connection";
  if (msg === "HTTP_401") return "Unauthorized — check API token in Settings";
  if (msg === "HTTP_403") return "Forbidden — check API token permissions";
  if (msg === "TIMEOUT") return "Connection timed out — check server URL";
  if (msg.startsWith("HTTP_")) return `Server error: ${msg}`;
  return "Failed to load data — tap to retry";
}

export function useZabbixPolling(intervalMs = 60_000): ZabbixPollingResult {
  const { isReady, status } = useZabbixConfig();

  const [problems, setProblems] = useState<Incident[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [p, h] = await Promise.all([getIncidents(), getHosts()]);
      if (!mountedRef.current) return;
      setProblems(p);
      setHosts(h);
      setLastSync(Date.now());
    } catch (e) {
      if (!mountedRef.current) return;
      const msg = (e as Error).message ?? "Unknown error";
      setError(friendlyError(msg));
    } finally {
      if (!mountedRef.current) return;
      if (!silent) setLoading(false);
    }
  }, [isReady]);

  const refresh = useCallback(() => {
    doFetch(false);
  }, [doFetch]);

  useEffect(() => {
    mountedRef.current = true;

    if (!isReady) {
      console.log("[ZabbixPolling] waiting for isReady...");
      return () => {
        mountedRef.current = false;
      };
    }

    console.log("[ZabbixPolling] isReady=true — starting fetch & poll interval");
    doFetch(false);
    intervalRef.current = setInterval(() => doFetch(true), intervalMs);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isReady, doFetch, intervalMs]);

  return { problems, hosts, loading, error, lastSync, refresh };
}
