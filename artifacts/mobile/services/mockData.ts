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
  status: "ok" | "warning" | "down";
  os: string;
  agentVersion: string;
  lastCheck: number;
  cpu: number;
  memory: number;
  disk: number;
  uptimeDays: number;
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

const NOW = 1745928000000;
const m = (mins: number) => NOW - mins * 60_000;
const h = (hours: number) => NOW - hours * 3_600_000;

export const incidents: Incident[] = [
  {
    id: "INC-1042",
    severity: "DISASTER",
    title: "Database primary unreachable",
    host: "db-prod-01",
    hostId: "h-001",
    openedAt: m(4),
    status: "open",
    description:
      "Primary PostgreSQL node has stopped responding to ICMP and TCP 5432 health probes from three independent pollers.",
    events: [
      { ts: m(4), text: "Trigger fired: PROBLEM" },
      { ts: m(3), text: "Failover candidate elected: db-prod-02" },
      { ts: m(1), text: "ChatOps notification dispatched" },
    ],
  },
  {
    id: "INC-1041",
    severity: "HIGH",
    title: "CPU sustained > 92% for 10m",
    host: "api-edge-04",
    hostId: "h-004",
    openedAt: m(11),
    status: "acknowledged",
    description:
      "Edge API node showing sustained CPU pressure. Suspected runaway worker.",
    events: [
      { ts: m(11), text: "Trigger fired: PROBLEM" },
      { ts: m(8), text: "Acknowledged by samir.b" },
    ],
  },
  {
    id: "INC-1040",
    severity: "HIGH",
    title: "TLS certificate expiring in 5 days",
    host: "lb-prod-02",
    hostId: "h-007",
    openedAt: h(2),
    status: "open",
    description:
      "Wildcard certificate *.poulina-int.tn nearing expiry. Renewal pipeline did not complete.",
    events: [{ ts: h(2), text: "Trigger fired: PROBLEM" }],
  },
  {
    id: "INC-1039",
    severity: "AVERAGE",
    title: "Disk usage on /var > 80%",
    host: "log-collector-01",
    hostId: "h-009",
    openedAt: h(5),
    status: "open",
    description:
      "Log retention policy not catching up with ingestion rate on log-collector-01.",
    events: [{ ts: h(5), text: "Trigger fired: PROBLEM" }],
  },
  {
    id: "INC-1038",
    severity: "AVERAGE",
    title: "Memory pressure on worker fleet",
    host: "worker-pool-2",
    hostId: "h-006",
    openedAt: h(7),
    status: "acknowledged",
    description:
      "Average RSS across worker fleet trending upward over a 6h window.",
    events: [
      { ts: h(7), text: "Trigger fired: PROBLEM" },
      { ts: h(6), text: "Acknowledged by ops.runbook" },
    ],
  },
  {
    id: "INC-1037",
    severity: "WARNING",
    title: "Backup job slower than baseline",
    host: "backup-orch",
    hostId: "h-010",
    openedAt: h(12),
    status: "open",
    description:
      "Nightly backup window extended by 38% versus the rolling 14-day baseline.",
    events: [{ ts: h(12), text: "Trigger fired: PROBLEM" }],
  },
  {
    id: "INC-1036",
    severity: "INFO",
    title: "New host registered",
    host: "edge-cache-12",
    hostId: "h-005",
    openedAt: h(20),
    status: "resolved",
    description: "Auto-discovered host registered against template Linux/Edge.",
    events: [
      { ts: h(20), text: "Auto-discovery: edge-cache-12" },
      { ts: h(19), text: "Template Linux/Edge applied" },
    ],
  },
  {
    id: "INC-1035",
    severity: "WARNING",
    title: "NTP drift > 200ms",
    host: "time-srv-01",
    hostId: "h-008",
    openedAt: h(26),
    status: "resolved",
    description: "Time server reporting drift above SLA. Resolved automatically.",
    events: [
      { ts: h(26), text: "Trigger fired: PROBLEM" },
      { ts: h(24), text: "Resolved" },
    ],
  },
];

export const hosts: Host[] = [
  {
    id: "h-001",
    name: "db-prod-01",
    ip: "10.20.4.11",
    group: "Databases",
    status: "down",
    os: "Ubuntu 22.04 LTS",
    agentVersion: "6.4.10",
    lastCheck: m(1),
    cpu: 0,
    memory: 0,
    disk: 64,
    uptimeDays: 0,
  },
  {
    id: "h-002",
    name: "db-prod-02",
    ip: "10.20.4.12",
    group: "Databases",
    status: "ok",
    os: "Ubuntu 22.04 LTS",
    agentVersion: "6.4.10",
    lastCheck: m(0),
    cpu: 41,
    memory: 58,
    disk: 62,
    uptimeDays: 213,
  },
  {
    id: "h-003",
    name: "api-edge-01",
    ip: "10.20.10.21",
    group: "API",
    status: "ok",
    os: "Debian 12",
    agentVersion: "6.4.9",
    lastCheck: m(0),
    cpu: 33,
    memory: 47,
    disk: 38,
    uptimeDays: 92,
  },
  {
    id: "h-004",
    name: "api-edge-04",
    ip: "10.20.10.24",
    group: "API",
    status: "warning",
    os: "Debian 12",
    agentVersion: "6.4.9",
    lastCheck: m(0),
    cpu: 94,
    memory: 71,
    disk: 41,
    uptimeDays: 64,
  },
  {
    id: "h-005",
    name: "edge-cache-12",
    ip: "10.30.7.12",
    group: "Edge",
    status: "ok",
    os: "Alpine 3.20",
    agentVersion: "6.4.10",
    lastCheck: m(0),
    cpu: 18,
    memory: 22,
    disk: 31,
    uptimeDays: 7,
  },
  {
    id: "h-006",
    name: "worker-pool-2",
    ip: "10.40.2.20",
    group: "Workers",
    status: "warning",
    os: "Ubuntu 22.04 LTS",
    agentVersion: "6.4.10",
    lastCheck: m(0),
    cpu: 62,
    memory: 84,
    disk: 49,
    uptimeDays: 121,
  },
  {
    id: "h-007",
    name: "lb-prod-02",
    ip: "10.10.0.12",
    group: "Network",
    status: "ok",
    os: "RHEL 9",
    agentVersion: "6.4.10",
    lastCheck: m(0),
    cpu: 27,
    memory: 33,
    disk: 22,
    uptimeDays: 311,
  },
  {
    id: "h-008",
    name: "time-srv-01",
    ip: "10.10.0.30",
    group: "Network",
    status: "ok",
    os: "RHEL 9",
    agentVersion: "6.4.10",
    lastCheck: m(0),
    cpu: 8,
    memory: 14,
    disk: 12,
    uptimeDays: 412,
  },
  {
    id: "h-009",
    name: "log-collector-01",
    ip: "10.50.1.10",
    group: "Observability",
    status: "warning",
    os: "Ubuntu 22.04 LTS",
    agentVersion: "6.4.10",
    lastCheck: m(0),
    cpu: 51,
    memory: 67,
    disk: 83,
    uptimeDays: 178,
  },
  {
    id: "h-010",
    name: "backup-orch",
    ip: "10.50.1.20",
    group: "Observability",
    status: "ok",
    os: "Ubuntu 22.04 LTS",
    agentVersion: "6.4.10",
    lastCheck: m(0),
    cpu: 24,
    memory: 39,
    disk: 71,
    uptimeDays: 254,
  },
];

export const hostGroups: HostGroup[] = [
  { id: "g-1", name: "Databases", hostCount: 6 },
  { id: "g-2", name: "API", hostCount: 12 },
  { id: "g-3", name: "Workers", hostCount: 18 },
  { id: "g-4", name: "Edge", hostCount: 22 },
  { id: "g-5", name: "Network", hostCount: 9 },
  { id: "g-6", name: "Observability", hostCount: 7 },
];

export const templates: Template[] = [
  { id: "t-1", name: "Linux/Server", appliedTo: 84 },
  { id: "t-2", name: "Linux/Edge", appliedTo: 22 },
  { id: "t-3", name: "PostgreSQL/Primary", appliedTo: 6 },
  { id: "t-4", name: "Nginx/Frontline", appliedTo: 14 },
  { id: "t-5", name: "Java/JVM", appliedTo: 18 },
];

export const managedUsers: ManagedUser[] = [
  {
    id: "u-1",
    name: "Samir Ben Ali",
    email: "samir.b@poulina.tn",
    role: "Admin",
    active: true,
  },
  {
    id: "u-2",
    name: "Lina Trabelsi",
    email: "lina.t@poulina.tn",
    role: "DevOps",
    active: true,
  },
  {
    id: "u-3",
    name: "Mehdi Saad",
    email: "mehdi.s@poulina.tn",
    role: "Operator",
    active: true,
  },
  {
    id: "u-4",
    name: "Yasmine Khelifi",
    email: "yasmine.k@poulina.tn",
    role: "Viewer",
    active: false,
  },
];

export const severityCounts = {
  DISASTER: 1,
  HIGH: 3,
  AVERAGE: 5,
  WARNING: 8,
  INFO: 12,
  OK: 142,
};

export const dashboardStats = {
  activeIncidents: incidents.filter((i) => i.status !== "resolved").length,
  hostsUp: hosts.filter((h) => h.status !== "down").length,
  totalHosts: hosts.length + 146,
  avgResponse: "182 ms",
  uptime: "99.94%",
};

export type ReportRange = "24h" | "7d" | "30d";

export interface ReportSeries {
  totalIncidents: number;
  mttrMinutes: number;
  availability: number;
  noisyHosts: { host: string; count: number }[];
  distribution: { severity: Severity; weight: number }[];
}

export const reportSeries: Record<ReportRange, ReportSeries | null> = {
  "24h": null,
  "7d": {
    totalIncidents: 38,
    mttrMinutes: 24,
    availability: 99.91,
    noisyHosts: [
      { host: "api-edge-04", count: 11 },
      { host: "log-collector-01", count: 8 },
      { host: "worker-pool-2", count: 6 },
      { host: "db-prod-01", count: 4 },
    ],
    distribution: [
      { severity: "DISASTER", weight: 2 },
      { severity: "HIGH", weight: 6 },
      { severity: "AVERAGE", weight: 11 },
      { severity: "WARNING", weight: 9 },
      { severity: "INFO", weight: 10 },
    ],
  },
  "30d": {
    totalIncidents: 162,
    mttrMinutes: 31,
    availability: 99.86,
    noisyHosts: [
      { host: "api-edge-04", count: 41 },
      { host: "log-collector-01", count: 28 },
      { host: "worker-pool-2", count: 22 },
      { host: "db-prod-01", count: 14 },
      { host: "backup-orch", count: 11 },
    ],
    distribution: [
      { severity: "DISASTER", weight: 5 },
      { severity: "HIGH", weight: 24 },
      { severity: "AVERAGE", weight: 47 },
      { severity: "WARNING", weight: 38 },
      { severity: "INFO", weight: 48 },
    ],
  },
};

// --- Helpers ---------------------------------------------------------------

const delay = <T,>(value: T, ms = 700): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const getIncidents = (): Promise<Incident[]> => delay(incidents);
export const getIncidentById = (id: string): Promise<Incident | undefined> =>
  delay(incidents.find((i) => i.id === id));

export const getHosts = (): Promise<Host[]> => delay(hosts);
export const getHostById = (id: string): Promise<Host | undefined> =>
  delay(hosts.find((h) => h.id === id));

export const getHostGroups = (): Promise<HostGroup[]> => delay(hostGroups);
export const getTemplates = (): Promise<Template[]> => delay(templates);
export const getManagedUsers = (): Promise<ManagedUser[]> =>
  delay(managedUsers);

export const getReport = (
  range: ReportRange,
): Promise<ReportSeries | null> => delay(reportSeries[range]);

export const formatRelative = (ts: number): string => {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};
