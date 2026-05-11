export type MetricCategory =
  | "cpu"
  | "memory"
  | "disk"
  | "ping"
  | "netIn"
  | "netOut"
  | "uptime"
  | "unknown";

interface KeyPattern {
  substrings: string[];
  category: MetricCategory;
  // Higher priority = preferred when multiple items match same category
  priority: number;
}

const KEY_PATTERNS: KeyPattern[] = [
  { substrings: ["system.cpu.util", "cpu.util", "proc.cpu"], category: "cpu", priority: 10 },
  { substrings: ["vm.memory.size[pused]"], category: "memory", priority: 20 },
  { substrings: ["vm.memory.size[pavailable]", "vm.memory.size[available]"], category: "memory", priority: 15 },
  { substrings: ["vm.memory.size[used]", "memory.util", "mem.util"], category: "memory", priority: 5 },
  { substrings: ["vfs.fs.size[/,pused]"], category: "disk", priority: 20 },
  { substrings: ["vfs.fs.size[/home,pused]", "vfs.fs.size[/var,pused]"], category: "disk", priority: 15 },
  { substrings: ["vfs.fs.size[pused]", "vfs.fs.size[used]", "disk.util"], category: "disk", priority: 5 },
  { substrings: ["icmpping["], category: "ping", priority: 10 },
  { substrings: ["icmpping"], category: "ping", priority: 5 },
  { substrings: ["net.if.in[", "ifHCInOctets", "if_octets.rx"], category: "netIn", priority: 10 },
  { substrings: ["net.if.in"], category: "netIn", priority: 5 },
  { substrings: ["net.if.out[", "ifHCOutOctets", "if_octets.tx"], category: "netOut", priority: 10 },
  { substrings: ["net.if.out"], category: "netOut", priority: 5 },
  { substrings: ["system.uptime", "agent.uptime", "sysUpTime"], category: "uptime", priority: 10 },
];

export interface ZabbixItemFull {
  itemid: string;
  name: string;
  key_: string;
  lastvalue: string;
  units: string;
  lastclock: string;
  hostid: string;
  value_type: string; // "0"=float "1"=char "2"=log "3"=uint "4"=text
}

export interface ZabbixTrend {
  clock: string;
  num: string;
  value_min: string;
  value_avg: string;
  value_max: string;
  itemid: string;
}

export interface NormalizedMetrics {
  cpu: number | null;         // 0-100 %
  memory: number | null;      // 0-100 %
  disk: number | null;        // 0-100 %
  ping: number | null;        // 1=up 0=down null=unknown
  netIn: number | null;       // bytes/s
  netOut: number | null;      // bytes/s
  uptimeSeconds: number | null;
}

interface ScoredItem {
  item: ZabbixItemFull;
  priority: number;
}

export function categorizeItem(key: string): { category: MetricCategory; priority: number } {
  let best: { category: MetricCategory; priority: number } = { category: "unknown", priority: 0 };
  for (const { substrings, category, priority } of KEY_PATTERNS) {
    for (const sub of substrings) {
      if (key.includes(sub) && priority > best.priority) {
        best = { category, priority };
      }
    }
  }
  return best;
}

export function extractMetricsFromItems(items: ZabbixItemFull[]): NormalizedMetrics {
  const metrics: NormalizedMetrics = {
    cpu: null, memory: null, disk: null,
    ping: null, netIn: null, netOut: null, uptimeSeconds: null,
  };

  const byCategory = new Map<MetricCategory, ScoredItem[]>();

  for (const item of items) {
    const { category, priority } = categorizeItem(item.key_);
    if (category === "unknown") continue;
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push({ item, priority });
  }

  function best(cat: MetricCategory): ZabbixItemFull | null {
    const scored = byCategory.get(cat);
    if (!scored || scored.length === 0) return null;
    return scored.sort((a, b) => b.priority - a.priority)[0].item;
  }

  function parseVal(item: ZabbixItemFull | null): number | null {
    if (!item) return null;
    const v = parseFloat(item.lastvalue);
    return isNaN(v) ? null : v;
  }

  // CPU
  const cpuItem = best("cpu");
  const cpu = parseVal(cpuItem);
  if (cpu !== null) metrics.cpu = Math.min(100, Math.max(0, Math.round(cpu * 10) / 10));

  // Memory — check if key says "pavailable" and invert
  const memItem = best("memory");
  if (memItem) {
    const v = parseVal(memItem);
    if (v !== null) {
      if (memItem.key_.includes("pavailable") || memItem.key_.includes("available")) {
        metrics.memory = Math.min(100, Math.max(0, Math.round((100 - v) * 10) / 10));
      } else {
        metrics.memory = Math.min(100, Math.max(0, Math.round(v * 10) / 10));
      }
    }
  }

  // Disk
  const diskItem = best("disk");
  const disk = parseVal(diskItem);
  if (disk !== null) metrics.disk = Math.min(100, Math.max(0, Math.round(disk * 10) / 10));

  // Ping (0=down, 1=up)
  const pingItem = best("ping");
  const ping = parseVal(pingItem);
  if (ping !== null) metrics.ping = ping;

  // Network
  const netIn = parseVal(best("netIn"));
  if (netIn !== null) metrics.netIn = Math.max(0, netIn);

  const netOut = parseVal(best("netOut"));
  if (netOut !== null) metrics.netOut = Math.max(0, netOut);

  // Uptime
  const uptime = parseVal(best("uptime"));
  if (uptime !== null) metrics.uptimeSeconds = Math.max(0, uptime);

  return metrics;
}

export function groupItemsByHost(items: ZabbixItemFull[]): Map<string, ZabbixItemFull[]> {
  const map = new Map<string, ZabbixItemFull[]>();
  for (const item of items) {
    if (!map.has(item.hostid)) map.set(item.hostid, []);
    map.get(item.hostid)!.push(item);
  }
  return map;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 0) bytes = Math.abs(bytes);
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatUptime(seconds: number): string {
  if (seconds < 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function metricColor(value: number, warn = 70, danger = 85): "ok" | "warn" | "danger" {
  if (value >= danger) return "danger";
  if (value >= warn) return "warn";
  return "ok";
}

// Key patterns used in item.get search (Zabbix substring match)
export const METRIC_SEARCH_KEYS = [
  "system.cpu.util",
  "vm.memory.size[p",
  "vfs.fs.size[",
  "icmpping",
  "net.if.in[",
  "net.if.out[",
  "system.uptime",
];
