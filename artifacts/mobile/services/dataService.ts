/**
 * Unified data service — uses real Zabbix API when configured,
 * falls back to mock data transparently so the app always works.
 */
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
import * as mock from "./mockData";
import {
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
export { formatRelative } from "./mockData";

// ─── severity helpers ────────────────────────────────────────────────────────

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

// ─── adapters ────────────────────────────────────────────────────────────────

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

// ─── public API (same signatures as mockData.ts) ─────────────────────────────

async function usingZabbix(): Promise<boolean> {
  return zabbixClient.isConfigured();
}

export async function getIncidents(): Promise<Incident[]> {
  if (!(await usingZabbix())) return mock.getIncidents();
  try {
    const problems = await zabbixClient.getProblems({ recent: true });
    const incidents = adaptProblems(problems);

    // Enrich with host name via trigger lookup (batch)
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
      } catch {
        // enrichment best-effort
      }
    }

    return incidents;
  } catch {
    return mock.getIncidents();
  }
}

export async function getIncidentById(id: string): Promise<Incident | undefined> {
  if (!(await usingZabbix())) return mock.getIncidentById(id);
  try {
    const all = await getIncidents();
    return all.find((i) => i.id === id);
  } catch {
    return mock.getIncidentById(id);
  }
}

export async function acknowledgeIncident(eventId: string): Promise<void> {
  if (!(await usingZabbix())) return;
  const rawId = eventId.startsWith("EVT-") ? eventId.slice(4) : eventId;
  await zabbixClient.acknowledgeEvent([rawId]);
}

export async function getHosts(): Promise<Host[]> {
  if (!(await usingZabbix())) return mock.getHosts();
  try {
    const zbxHosts = await zabbixClient.getHosts();
    return zbxHosts.map(
      (h): Host => ({
        id: h.hostid,
        name: h.name || h.host,
        ip: h.interfaces?.find((i) => i.main === "1")?.ip ?? h.interfaces?.[0]?.ip ?? "",
        group: h.groups?.[0]?.name ?? "",
        status:
          h.available === "1" ? "ok" : h.available === "2" ? "down" : "warning",
        os: "Linux",
        agentVersion: "Zabbix",
        lastCheck: Date.now(),
        cpu: 0,
        memory: 0,
        disk: 0,
        uptimeDays: 0,
      }),
    );
  } catch {
    return mock.getHosts();
  }
}

export async function getHostById(id: string): Promise<Host | undefined> {
  if (!(await usingZabbix())) return mock.getHostById(id);
  try {
    const all = await getHosts();
    return all.find((h) => h.id === id);
  } catch {
    return mock.getHostById(id);
  }
}

export async function getHostGroups(): Promise<HostGroup[]> {
  if (!(await usingZabbix())) return mock.getHostGroups();
  try {
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
  } catch {
    return mock.getHostGroups();
  }
}

export async function getTemplates(): Promise<Template[]> {
  return mock.getTemplates();
}

export async function getManagedUsers(): Promise<ManagedUser[]> {
  if (!(await usingZabbix())) return mock.getManagedUsers();
  try {
    const zbxUsers = await zabbixClient.getUsers();
    return zbxUsers.map(
      (u): ManagedUser => ({
        id: u.userid,
        name: `${u.name} ${u.surname}`.trim() || u.username,
        email: `${u.username}@zabbix`,
        role:
          u.type === "3" ? "Admin" : u.type === "2" ? "DevOps" : "Operator",
        active: true,
      }),
    );
  } catch {
    return mock.getManagedUsers();
  }
}

export async function getReport(range: ReportRange): Promise<ReportSeries | null> {
  return mock.getReport(range);
}

// ─── dashboard stats ─────────────────────────────────────────────────────────

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
  const live = await usingZabbix();
  if (!live) {
    return {
      ...mock.dashboardStats,
      severityCounts: { ...mock.severityCounts },
      usingLiveData: false,
    };
  }
  try {
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
  } catch {
    return {
      ...mock.dashboardStats,
      severityCounts: { ...mock.severityCounts },
      usingLiveData: false,
    };
  }
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

interface ClaudeMessage { role: "user" | "assistant"; content: string }

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

  const data = (await res.json()) as { content: { type: string; text: string }[] };
  const block = data.content?.find((b) => b.type === "text");
  if (!block) throw new Error("Empty response");
  return block.text;
}
