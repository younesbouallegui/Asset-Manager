import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  Host,
  HostGroup,
  Incident,
  IncidentEvent,
  ManagedUser,
  ReportRange,
  ReportSeries,
  Severity,
  Template,
} from "./mockData";
import { formatRelative, getReport as getMockReport } from "./mockData";
import {
  extractMetricsFromItems,
  groupItemsByHost,
  ZabbixItemFull,
} from "./zabbix/MetricDiscovery";
import {
  ZabbixHistoryEntry,
  ZabbixProblem,
  ZabbixSeverityCode,
  zabbixClient,
} from "./zabbix/ZabbixClient";

export type {
  Host,
  HostGroup,
  Incident,
  IncidentEvent,
  ManagedUser,
  ReportRange,
  ReportSeries,
  Severity,
  Template,
};
export { formatRelative };

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_MAP: Record<ZabbixSeverityCode, Severity> = {
  "0": "INFO",
  "1": "INFO",
  "2": "WARNING",
  "3": "AVERAGE",
  "4": "HIGH",
  "5": "DISASTER",
};

function mapSeverity(code: ZabbixSeverityCode): Severity {
  return SEVERITY_MAP[code] ?? "INFO";
}

// ─── Adapter: problems → incidents ───────────────────────────────────────────

function adaptProblems(problems: ZabbixProblem[]): Incident[] {
  return problems.map((p): Incident => {
    const acks: IncidentEvent[] = (p.acknowledges ?? []).map((a) => ({
      ts: parseInt(a.clock, 10) * 1000,
      text: a.message || "Acknowledged",
    }));
    const severity = mapSeverity(p.severity);
    const status: Incident["status"] =
      p.acknowledged === "1" ? "acknowledged" : "open";
    return {
      id: `EVT-${p.eventid}`,
      severity,
      title: p.name,
      host: "",
      hostId: p.objectid,
      openedAt: parseInt(p.clock, 10) * 1000,
      status,
      description: `Zabbix trigger event. ID: ${p.eventid}`,
      events: [
        { ts: parseInt(p.clock, 10) * 1000, text: "Trigger fired: PROBLEM" },
        ...acks,
      ],
    };
  });
}

// ─── Adapter: host → Host ─────────────────────────────────────────────────────

function mapZabbixHost(h: import("./zabbix/ZabbixClient").ZabbixHost): Host {
  return {
    id: h.hostid,
    name: h.name || h.host,
    ip:
      h.interfaces?.find((i) => i.main === "1")?.ip ??
      h.interfaces?.[0]?.ip ??
      "",
    group: h.groups?.[0]?.name ?? "",
    groups: (h.groups ?? []).map((g) => ({ id: g.groupid, name: g.name })),
    status:
      h.available === "1" ? "ok" : h.available === "2" ? "down" : "warning",
    os: "Linux",
    agentVersion: "Zabbix Agent",
    lastCheck: Date.now(),
    cpu: 0,
    memory: 0,
    disk: 0,
    uptimeDays: 0,
    ping: null,
    netIn: null,
    netOut: null,
    uptimeSeconds: null,
    metricsLoaded: false,
    interfaces: h.interfaces ?? [],
    triggerCount: 0,
  };
}

async function assertConfigured(): Promise<void> {
  const configured = await zabbixClient.isConfigured();
  if (!configured) throw new Error("ZABBIX_NOT_CONFIGURED");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getIncidents(): Promise<Incident[]> {
  await assertConfigured();
  console.log("[dataService] getIncidents: calling problem.get");
  const problems = await zabbixClient.getProblems();
  console.log("[dataService] getIncidents: got", problems.length, "problems");
  const incidents = adaptProblems(problems);

  const triggerIds = [...new Set(incidents.map((i) => i.hostId))];
  if (triggerIds.length > 0) {
    try {
      const triggers = await zabbixClient.getTriggers(triggerIds);
      const byId = new Map(triggers.map((t) => [t.triggerid, t]));
      incidents.forEach((inc) => {
        const trig = byId.get(inc.hostId);
        if (trig) {
          const h = trig.hosts[0];
          if (h) {
            inc.host = h.name || h.host;
            inc.hostId = h.hostid;
          }
          if (!inc.title || inc.title === inc.id) {
            inc.title = trig.description;
          }
        }
      });
    } catch (e) {
      console.warn("[dataService] trigger enrichment failed:", (e as Error).message);
    }
  }
  return incidents;
}

export async function getIncidentById(id: string): Promise<Incident | undefined> {
  const all = await getIncidents();
  return all.find((i) => i.id === id);
}

export async function acknowledgeIncident(eventId: string): Promise<void> {
  await assertConfigured();
  const rawId = eventId.startsWith("EVT-") ? eventId.slice(4) : eventId;
  await zabbixClient.acknowledgeEvent([rawId]);
}

export async function getHosts(): Promise<Host[]> {
  await assertConfigured();
  console.log("[dataService] getHosts: calling host.get");
  const zbxHosts = await zabbixClient.getHosts();
  console.log("[dataService] getHosts: got", zbxHosts.length, "hosts");
  const hosts = zbxHosts.map(mapZabbixHost);

  // Bulk-fetch metrics for all hosts in one item.get call
  if (zbxHosts.length > 0) {
    try {
      const hostids = zbxHosts.map((h) => h.hostid);
      const items = await zabbixClient.getItemsForHosts(hostids);
      console.log("[dataService] getHosts: got", items.length, "items for metrics");
      const byHost = groupItemsByHost(items);
      hosts.forEach((host) => {
        const hostItems = byHost.get(host.id) ?? [];
        if (hostItems.length > 0) {
          const metrics = extractMetricsFromItems(hostItems);
          host.cpu = metrics.cpu ?? 0;
          host.memory = metrics.memory ?? 0;
          host.disk = metrics.disk ?? 0;
          host.ping = metrics.ping;
          host.netIn = metrics.netIn;
          host.netOut = metrics.netOut;
          host.uptimeSeconds = metrics.uptimeSeconds;
          host.uptimeDays = metrics.uptimeSeconds ? Math.floor(metrics.uptimeSeconds / 86400) : 0;
          host.metricsLoaded = true;
        }
      });
    } catch (e) {
      console.warn("[dataService] metrics fetch failed:", (e as Error).message);
    }
  }

  return hosts;
}

export async function getHostById(id: string): Promise<Host | undefined> {
  const all = await getHosts();
  return all.find((h) => h.id === id);
}

export interface HostDetail extends Host {
  allItems: ZabbixItemFull[];
  triggers: import("./zabbix/ZabbixClient").ZabbixTrigger[];
  cpuHistory: DataSeries;
  memHistory: DataSeries;
  diskHistory: DataSeries;
}

export interface DataSeries {
  label: string;
  color: string;
  data: { ts: number; value: number }[];
}

function historyToSeries(
  entries: ZabbixHistoryEntry[],
  label: string,
  color: string,
): DataSeries {
  return {
    label,
    color,
    data: entries.map((e) => ({
      ts: parseInt(e.clock, 10) * 1000,
      value: parseFloat(e.value),
    })).filter((p) => !isNaN(p.value)),
  };
}

export async function getHostDetail(hostid: string): Promise<HostDetail | null> {
  await assertConfigured();

  const [zbxHosts, allItems, triggers] = await Promise.all([
    zabbixClient.getHosts({ hostids: [hostid] }),
    zabbixClient.getHostAllItems(hostid),
    zabbixClient.getTriggersForHost(hostid),
  ]);

  if (zbxHosts.length === 0) return null;
  const host = mapZabbixHost(zbxHosts[0]);
  host.triggerCount = triggers.length;

  // Extract live metrics from items
  const metrics = extractMetricsFromItems(allItems);
  host.cpu = metrics.cpu ?? 0;
  host.memory = metrics.memory ?? 0;
  host.disk = metrics.disk ?? 0;
  host.ping = metrics.ping;
  host.netIn = metrics.netIn;
  host.netOut = metrics.netOut;
  host.uptimeSeconds = metrics.uptimeSeconds;
  host.uptimeDays = metrics.uptimeSeconds ? Math.floor(metrics.uptimeSeconds / 86400) : 0;
  host.metricsLoaded = true;

  // Find key item IDs for history fetch
  const timeFrom = Math.floor(Date.now() / 1000) - 3600; // last 1 hour

  function findItem(key: string): ZabbixItemFull | undefined {
    return allItems.find((i) => i.key_.includes(key));
  }

  const cpuItem = findItem("system.cpu.util") ?? findItem("cpu.util");
  const memItem = findItem("vm.memory.size[pused]") ?? findItem("vm.memory.size") ?? findItem("memory.util");
  const diskItem = findItem("vfs.fs.size[/,pused]") ?? findItem("vfs.fs.size[/,p") ?? findItem("vfs.fs.size[");

  const [cpuHist, memHist, diskHist] = await Promise.all([
    cpuItem ? zabbixClient.getHistory([cpuItem.itemid], timeFrom) : Promise.resolve([]),
    memItem ? zabbixClient.getHistory([memItem.itemid], timeFrom) : Promise.resolve([]),
    diskItem ? zabbixClient.getHistory([diskItem.itemid], timeFrom) : Promise.resolve([]),
  ]);

  // If history is sparse (< 2 points), try trends instead
  async function enrichWithTrends(
    item: ZabbixItemFull | undefined,
    hist: ZabbixHistoryEntry[],
    fallbackHours = 24,
  ): Promise<ZabbixHistoryEntry[]> {
    if (hist.length >= 2 || !item) return hist;
    try {
      const trendFrom = Math.floor(Date.now() / 1000) - fallbackHours * 3600;
      const trends = await zabbixClient.getTrends([item.itemid], trendFrom);
      return trends.map((t) => ({ clock: t.clock, value: t.value_avg, itemid: t.itemid }));
    } catch {
      return hist;
    }
  }

  const [finalCpu, finalMem, finalDisk] = await Promise.all([
    enrichWithTrends(cpuItem, cpuHist),
    enrichWithTrends(memItem, memHist),
    enrichWithTrends(diskItem, diskHist),
  ]);

  return {
    ...host,
    allItems,
    triggers,
    cpuHistory: historyToSeries(finalCpu, "CPU", "#e53935"),
    memHistory: historyToSeries(finalMem, "Memory", "#ff9800"),
    diskHistory: historyToSeries(finalDisk, "Disk", "#42a5f5"),
  };
}

export async function getHostGroups(): Promise<HostGroup[]> {
  await assertConfigured();
  const zbxHosts = await zabbixClient.getHosts();
  const seen = new Map<string, HostGroup>();
  zbxHosts.forEach((h) => {
    (h.groups ?? []).forEach((g) => {
      if (!seen.has(g.groupid)) {
        seen.set(g.groupid, { id: g.groupid, name: g.name, hostCount: 0 });
      }
      seen.get(g.groupid)!.hostCount++;
    });
  });
  return [...seen.values()];
}

export async function getTemplates(): Promise<Template[]> {
  return [];
}

export async function getManagedUsers(): Promise<ManagedUser[]> {
  await assertConfigured();
  const zbxUsers = await zabbixClient.getUsers();
  return zbxUsers.map(
    (u): ManagedUser => ({
      id: u.userid,
      name: `${u.name} ${u.surname}`.trim() || u.username,
      email: `${u.username}@zabbix`,
      role:
        u.roleid === "3" ? "Admin" : u.roleid === "2" ? "DevOps" : "Operator",
      active: true,
    }),
  );
}

export async function getReport(range: ReportRange): Promise<ReportSeries | null> {
  return getMockReport(range);
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export interface LiveDashboardStats {
  activeIncidents: number;
  hostsUp: number;
  totalHosts: number;
  avgResponse: string;
  uptime: string;
  severityCounts: Record<Severity, number>;
  usingLiveData: boolean;
}

export async function getDashboardStats(): Promise<LiveDashboardStats> {
  await assertConfigured();
  const [problems, hosts] = await Promise.all([
    zabbixClient.getProblems(),
    zabbixClient.getHosts(),
  ]);

  const severityCounts: Record<Severity, number> = {
    DISASTER: 0, HIGH: 0, AVERAGE: 0, WARNING: 0, INFO: 0, OK: 0,
  };
  problems.forEach((p) => {
    const sev = mapSeverity(p.severity);
    severityCounts[sev] = (severityCounts[sev] ?? 0) + 1;
  });

  const hostsUp = hosts.filter((h) => h.available === "1").length;
  const totalHosts = hosts.length;
  const activeIncidents = problems.filter((p) => p.acknowledged === "0").length;

  return {
    activeIncidents,
    hostsUp,
    totalHosts,
    avgResponse: "—",
    uptime: totalHosts > 0 ? `${((hostsUp / totalHosts) * 100).toFixed(2)}%` : "—",
    severityCounts,
    usingLiveData: true,
  };
}

export async function getMetricHistory(
  hostId: string,
  metric: "cpu" | "memory" | "disk",
  timeRangeHours: number,
): Promise<DataSeries> {
  await assertConfigured();

  const allItems = await zabbixClient.getHostAllItems(hostId);
  const timeFrom = Math.floor(Date.now() / 1000) - timeRangeHours * 3600;

  function findItem(keys: string[]): ZabbixItemFull | undefined {
    for (const key of keys) {
      const item = allItems.find((i) => i.key_.includes(key));
      if (item) return item;
    }
    return undefined;
  }

  const itemKeyMap: Record<string, string[]> = {
    cpu: ["system.cpu.util", "cpu.util"],
    memory: ["vm.memory.size[pused]", "vm.memory.size", "memory.util"],
    disk: ["vfs.fs.size[/,pused]", "vfs.fs.size[/,p", "vfs.fs.size["],
  };

  const item = findItem(itemKeyMap[metric] ?? []);
  const colorMap = { cpu: "#e53935", memory: "#ff9800", disk: "#42a5f5" };
  const labelMap = { cpu: "CPU %", memory: "Memory %", disk: "Disk %" };

  if (!item) {
    return { label: labelMap[metric], color: colorMap[metric], data: [] };
  }

  let history = await zabbixClient.getHistory([item.itemid], timeFrom);

  if (history.length < 2 && timeRangeHours >= 24) {
    try {
      const trends = await zabbixClient.getTrends([item.itemid], timeFrom);
      history = trends.map((t) => ({ clock: t.clock, value: t.value_avg, itemid: t.itemid }));
    } catch {
      // best effort
    }
  }

  return historyToSeries(history, labelMap[metric], colorMap[metric]);
}

// ─── Anthropic / Claude ───────────────────────────────────────────────────────

export async function getAnthropicKey(): Promise<string | null> {
  const { ANTHROPIC_STORAGE } = await import("./zabbix/ZabbixClient");
  const v = await AsyncStorage.getItem(ANTHROPIC_STORAGE.apiKey);
  return v?.trim() || null;
}

export async function saveAnthropicKey(key: string): Promise<void> {
  const { ANTHROPIC_STORAGE } = await import("./zabbix/ZabbixClient");
  await AsyncStorage.setItem(ANTHROPIC_STORAGE.apiKey, key);
}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendClaude(
  apiKey: string,
  messages: ClaudeMessage[],
  systemPrompt: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("INVALID_API_KEY");
    if (res.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    content: { type: string; text: string }[];
  };
  const block = data.content?.find((b) => b.type === "text");
  if (!block) throw new Error("Empty response");
  return block.text;
}

export async function sendFreeAI(
  messages: { role: "user" | "assistant"; content: string }[],
  systemPrompt: string,
): Promise<string> {
  const payload = {
    model: "openai-large",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    private: true,
    seed: Math.floor(Math.random() * 1_000_000),
  };

  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`AI service error ${res.status}: ${txt}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return content;
}
