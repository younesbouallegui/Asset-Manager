import AsyncStorage from "@react-native-async-storage/async-storage";

export type WidgetType =
  | "kpi-grid"
  | "severity-breakdown"
  | "recent-incidents"
  | "top-hosts"
  | "gauge-overview"
  | "report-shortcut";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  visible: boolean;
}

export interface WidgetMeta {
  label: string;
  description: string;
  icon: string;
  removable: boolean;
}

export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  "kpi-grid": {
    label: "KPI Overview",
    description: "4 key cards: incidents, hosts, CPU, availability",
    icon: "grid",
    removable: false,
  },
  "severity-breakdown": {
    label: "Severity Breakdown",
    description: "Incident counts grouped by severity level",
    icon: "bar-chart-2",
    removable: true,
  },
  "recent-incidents": {
    label: "Active Incidents",
    description: "Latest open incidents with severity badges",
    icon: "alert-triangle",
    removable: true,
  },
  "top-hosts": {
    label: "Top Hosts by Load",
    description: "Hosts sorted by CPU + memory utilization",
    icon: "server",
    removable: true,
  },
  "gauge-overview": {
    label: "Infrastructure Gauges",
    description: "Avg CPU, Memory, and Disk as ring gauges",
    icon: "activity",
    removable: true,
  },
  "report-shortcut": {
    label: "Performance Report",
    description: "Quick link to MTTR and availability report",
    icon: "trending-up",
    removable: true,
  },
};

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: "kpi-grid", type: "kpi-grid", visible: true },
  { id: "severity-breakdown", type: "severity-breakdown", visible: true },
  { id: "recent-incidents", type: "recent-incidents", visible: true },
  { id: "top-hosts", type: "top-hosts", visible: true },
  { id: "gauge-overview", type: "gauge-overview", visible: false },
  { id: "report-shortcut", type: "report-shortcut", visible: true },
];

export function getDefaultLayout(): WidgetConfig[] {
  return DEFAULT_LAYOUT.map((w) => ({ ...w }));
}

const STORAGE_KEY = "@dashboard_layout_v3";

export async function loadDashboardLayout(): Promise<WidgetConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultLayout();
    const parsed = JSON.parse(raw) as WidgetConfig[];
    const savedTypes = new Set(parsed.map((w) => w.type));
    const merged = [...parsed];
    for (const def of DEFAULT_LAYOUT) {
      if (!savedTypes.has(def.type)) {
        merged.push({ ...def });
      }
    }
    return merged;
  } catch {
    return getDefaultLayout();
  }
}

export async function saveDashboardLayout(layout: WidgetConfig[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // best effort
  }
}
