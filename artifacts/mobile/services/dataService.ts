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

// ─── adapter ─────────────────────────────────────────────────────────────────

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

async function assertConfigured(): Promise<void> {
  const configured = await zabbixClient.isConfigured();
  if (!configured) throw new Error("ZABBIX_NOT_CONFIGURED");
}

// ─── public API ───────────────────────────────────────────────────────────────

export async function getIncidents(): Promise<Incident[]> {
  await assertConfigured();
  const problems = await zabbixClient.getProblems({ recent: true });
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
    } catch {
      // enrichment is best-effort
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
  const zbxHosts = await zabbixClient.getHosts();
  return zbxHosts.map(
    (h): Host => ({
      id: h.hostid,
      name: h.name || h.host,
      ip:
        h.interfaces?.find((i) => i.main === "1")?.ip ??
        h.interfaces?.[0]?.ip ??
        "",
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
}

export async function getHostById(id: string): Promise<Host | undefined> {
  const all = await getHosts();
  return all.find((h) => h.id === id);
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
        u.type === "3" ? "Admin" : u.type === "2" ? "DevOps" : "Operator",
      active: true,
    }),
  );
}

export async function getReport(
  range: ReportRange,
): Promise<ReportSeries | null> {
  return getMockReport(range);
}

// ─── dashboard stats ──────────────────────────────────────────────────────────

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
    DISASTER: 0,
    HIGH: 0,
    AVERAGE: 0,
    WARNING: 0,
    INFO: 0,
    OK: 0,
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
    uptime:
      totalHosts > 0
        ? `${((hostsUp / totalHosts) * 100).toFixed(2)}%`
        : "—",
    severityCounts,
    usingLiveData: true,
  };
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

// ─── free AI (Pollinations — no API key required) ─────────────────────────────

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
