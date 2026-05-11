export type Severity =
  | "DISASTER"
  | "HIGH"
  | "AVERAGE"
  | "WARNING"
  | "INFO"
  | "OK";

export interface IncidentEvent {
  ts: number;
  text: string;
}

export interface Incident {
  id: string;
  severity: Severity;
  title: string;
  host: string;
  hostId: string;
  openedAt: number;
  status: "open" | "acknowledged" | "resolved";
  description: string;
  events: IncidentEvent[];
}

export interface Host {
  id: string;
  name: string;
  ip: string;
  group: string;
  groups: { id: string; name: string }[];
  status: "ok" | "warning" | "down";
  os: string;
  agentVersion: string;
  lastCheck: number;
  cpu: number;
  memory: number;
  disk: number;
  uptimeDays: number;
  // Real metric fields — null means not yet loaded or unavailable
  ping: number | null;
  netIn: number | null;
  netOut: number | null;
  uptimeSeconds: number | null;
  metricsLoaded: boolean;
  interfaces: { ip: string; type: string; main: string; dns?: string; port?: string }[];
  triggerCount: number;
}

export interface HostGroup {
  id: string;
  name: string;
  hostCount: number;
}

export interface Template {
  id: string;
  name: string;
  appliedTo: number;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "DevOps" | "Operator" | "Viewer";
  active: boolean;
}

export type ReportRange = "1d" | "7d" | "30d";

export interface ReportSeries {
  range: ReportRange;
  labels: string[];
  incidents: number[];
  availability: number[];
  mttr: number[];
}

const NOW = Date.now();
const m = (mins: number) => NOW - mins * 60_000;
const h = (hours: number) => NOW - hours * 3_600_000;

export const incidents: Incident[] = [];

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const hr = Math.floor(m / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export function getReport(range: ReportRange): ReportSeries | null {
  const now = Date.now();
  const labels7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now - (6 - i) * 86_400_000);
    return d.toLocaleDateString(undefined, { weekday: "short" });
  });
  const labels30 = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(now - (29 - i) * 86_400_000);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });
  const labels1 = Array.from({ length: 24 }).map((_, i) => {
    const d = new Date(now - (23 - i) * 3_600_000);
    return `${String(d.getHours()).padStart(2, "0")}:00`;
  });

  if (range === "1d") {
    return {
      range,
      labels: labels1,
      incidents: labels1.map(() => Math.floor(Math.random() * 3)),
      availability: labels1.map(() => 98 + Math.random() * 2),
      mttr: labels1.map(() => Math.floor(5 + Math.random() * 20)),
    };
  }
  if (range === "7d") {
    return {
      range,
      labels: labels7,
      incidents: [2, 5, 1, 3, 4, 2, 1],
      availability: [99.8, 99.2, 100, 99.7, 98.9, 99.5, 100],
      mttr: [12, 18, 8, 22, 15, 10, 7],
    };
  }
  return {
    range,
    labels: labels30,
    incidents: labels30.map(() => Math.floor(Math.random() * 8)),
    availability: labels30.map(() => 98 + Math.random() * 2),
    mttr: labels30.map(() => Math.floor(5 + Math.random() * 25)),
  };
}
