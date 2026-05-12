import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NotificationsSheet } from "@/components/NotificationsSheet";
import { SectionHeader } from "@/components/SectionHeader";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { WidgetPickerModal } from "@/components/WidgetPickerModal";
import { GaugeOverviewWidget } from "@/components/widgets/GaugeOverviewWidget";
import { IncidentsWidget } from "@/components/widgets/IncidentsWidget";
import { KpiGridWidget } from "@/components/widgets/KpiGridWidget";
import { ReportShortcutWidget } from "@/components/widgets/ReportShortcutWidget";
import { SeverityWidget } from "@/components/widgets/SeverityWidget";
import { TopHostsWidget } from "@/components/widgets/TopHostsWidget";
import { useAuth } from "@/contexts/AuthContext";
import { useZabbixConfig } from "@/contexts/ZabbixConfigContext";
import { useColors } from "@/hooks/useColors";
import { useZabbixPolling } from "@/hooks/useZabbixPolling";
import {
  loadDashboardLayout,
  saveDashboardLayout,
  WidgetConfig,
  WidgetType,
  getDefaultLayout,
} from "@/services/dashboardConfig";
import { formatRelative, Incident, LiveDashboardStats, Severity } from "@/services/dataService";

type FeatherIcon = React.ComponentProps<typeof Feather>["name"];

const REFRESH_INTERVAL = 30_000;

const greeting = (name: string): { line: string; icon: FeatherIcon } => {
  const h = new Date().getHours();
  const first = name.trim().split(/\s+/)[0] || name;
  if (h >= 6 && h < 12) return { line: `Good morning, ${first}`, icon: "sun" };
  if (h >= 12 && h < 18) return { line: `Good afternoon, ${first}`, icon: "cloud" };
  if (h >= 18 && h < 24) return { line: `Good evening, ${first}`, icon: "moon" };
  return { line: `Working late, ${first}`, icon: "moon" };
};

const dateLine = (): string =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

function LiveIndicator({ live, connecting }: { live: boolean; connecting?: boolean }) {
  const colors = useColors();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (live || connecting) {
      opacity.value = withRepeat(
        withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        false,
      );
    } else {
      opacity.value = 1;
    }
  }, [live, connecting, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const color = live
    ? colors.success
    : connecting
      ? colors.severityAverage
      : colors.mutedForeground;
  const label = live ? "Live" : connecting ? "Connecting…" : "Not connected";

  return (
    <View style={styles.liveRow}>
      <Animated.View style={[styles.liveDot, { backgroundColor: color }, style]} />
      <Text style={{ color, fontFamily: "Inter_500Medium", fontSize: 11 }}>{label}</Text>
    </View>
  );
}

function NotConfiguredBanner() {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => router.push("/(app)/settings/zabbix")}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: `${colors.severityAverage}14`,
        borderWidth: 1,
        borderColor: colors.severityAverage,
      }}
    >
      <Feather name="link" size={16} color={colors.severityAverage} />
      <Text
        style={{
          color: colors.severityAverage,
          fontFamily: "Inter_500Medium",
          fontSize: 13,
          flex: 1,
        }}
      >
        Zabbix not configured — tap to connect
      </Text>
      <Feather name="chevron-right" size={14} color={colors.severityAverage} />
    </Pressable>
  );
}

function NewIncidentBanner({
  incident,
  onDismiss,
}: {
  incident: Incident;
  onDismiss: () => void;
}) {
  const colors = useColors();
  const y = useSharedValue(-80);

  useEffect(() => {
    y.value = withTiming(0, { duration: 320 });
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [y, onDismiss]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View
      style={[styles.newIncidentBanner, { backgroundColor: colors.severityHigh }, style]}
    >
      <Pressable
        style={styles.bannerContent}
        onPress={() => {
          onDismiss();
          router.push(`/(app)/incidents/${incident.id}`);
        }}
      >
        <Feather name="alert-triangle" size={14} color="#fff" />
        <Text style={styles.bannerText} numberOfLines={1}>
          {incident.severity}: {incident.title}
        </Text>
      </Pressable>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Feather name="x" size={14} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

// ─── Widget wrapper (edit mode controls) ─────────────────────────────────────

function WidgetWrapper({
  widget,
  editMode,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  children,
}: {
  widget: WidgetConfig;
  editMode: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const meta = widget.type;
  const WIDGET_META_MAP: Record<WidgetType, { removable: boolean }> = {
    "kpi-grid": { removable: false },
    "severity-breakdown": { removable: true },
    "recent-incidents": { removable: true },
    "top-hosts": { removable: true },
    "gauge-overview": { removable: true },
    "report-shortcut": { removable: true },
  };
  const removable = WIDGET_META_MAP[meta]?.removable ?? true;

  if (!editMode) return <>{children}</>;

  return (
    <View
      style={[
        styles.editWrapper,
        {
          borderColor: colors.border,
          backgroundColor:
            colors.scheme === "dark"
              ? "rgba(255,255,255,0.02)"
              : "rgba(0,0,0,0.02)",
        },
      ]}
    >
      <View style={styles.editControls}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pressable
            onPress={onMoveUp}
            disabled={isFirst}
            style={[
              styles.editBtn,
              {
                backgroundColor:
                  colors.scheme === "dark"
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.05)",
                opacity: isFirst ? 0.3 : 1,
              },
            ]}
          >
            <Feather name="chevron-up" size={14} color={colors.onSurface} />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={isLast}
            style={[
              styles.editBtn,
              {
                backgroundColor:
                  colors.scheme === "dark"
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.05)",
                opacity: isLast ? 0.3 : 1,
              },
            ]}
          >
            <Feather name="chevron-down" size={14} color={colors.onSurface} />
          </Pressable>
        </View>
        {removable && (
          <Pressable
            onPress={onRemove}
            style={[
              styles.editBtn,
              { backgroundColor: `${colors.severityHigh}18` },
            ]}
          >
            <Feather name="trash-2" size={14} color={colors.severityHigh} />
          </Pressable>
        )}
      </View>
      <View style={{ opacity: 0.85 }}>{children}</View>
    </View>
  );
}

// ─── Section title map ────────────────────────────────────────────────────────

function WidgetSectionHeader({
  type,
}: {
  type: WidgetType;
}) {
  const TITLES: Partial<Record<WidgetType, { title: string; action?: string; route?: string }>> = {
    "severity-breakdown": { title: "Severity breakdown" },
    "recent-incidents": {
      title: "Active incidents",
      action: "View all",
      route: "/(app)/(tabs)/incidents",
    },
    "top-hosts": {
      title: "Top hosts by load",
      action: "View all",
      route: "/(app)/(tabs)/infrastructure",
    },
    "gauge-overview": { title: "Infrastructure gauges" },
    "report-shortcut": { title: "Reports" },
  };

  const meta = TITLES[type];
  if (!meta) return null;

  return (
    <SectionHeader
      title={meta.title}
      actionLabel={meta.action}
      onActionPress={meta.route ? () => router.push(meta.route as never) : undefined}
    />
  );
}

function SafeBottomPad() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height: (Platform.OS === "web" ? 84 : 56 + insets.bottom) + 16 }} />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { session } = useAuth();
  const zabbix = useZabbixConfig();

  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newIncident, setNewIncident] = useState<Incident | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [layout, setLayout] = useState<WidgetConfig[]>(getDefaultLayout());
  const prevIncidentIds = useRef<Set<string>>(new Set());

  const { problems, hosts, loading, error, lastSync, refresh } =
    useZabbixPolling(REFRESH_INTERVAL);

  const { markSynced } = zabbix;

  // Load saved layout on mount
  useEffect(() => {
    loadDashboardLayout().then(setLayout);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (zabbix.isReady) refresh();
    }, [zabbix.isReady, refresh]),
  );

  // Detect new incidents
  useEffect(() => {
    if (loading) return;
    if (prevIncidentIds.current.size === 0) {
      prevIncidentIds.current = new Set(problems.map((i) => i.id));
      return;
    }
    const incoming = problems.filter((i) => !prevIncidentIds.current.has(i.id));
    const urgent = incoming.find(
      (i) => i.severity === "DISASTER" || i.severity === "HIGH",
    );
    if (urgent) setNewIncident(urgent);
    if (incoming.length > 0) setUnreadCount((c) => c + incoming.length);
    prevIncidentIds.current = new Set(problems.map((i) => i.id));
  }, [problems, loading]);

  useEffect(() => {
    if (lastSync) markSynced();
  }, [lastSync, markSynced]);

  // Build stats
  const stats = useMemo<LiveDashboardStats | null>(() => {
    if (loading && !lastSync) return null;
    const severityCounts: Record<Severity, number> = {
      DISASTER: 0,
      HIGH: 0,
      AVERAGE: 0,
      WARNING: 0,
      INFO: 0,
      OK: 0,
    };
    problems.forEach((p) => {
      severityCounts[p.severity] = (severityCounts[p.severity] ?? 0) + 1;
    });
    const hostsUp = hosts.filter((h) => h.status === "ok").length;
    const totalHosts = hosts.length;
    const activeIncidents = problems.filter((p) => p.status !== "resolved").length;
    const loadedHosts = hosts.filter((h) => h.metricsLoaded);
    const avgCpu =
      loadedHosts.length > 0
        ? Math.round(loadedHosts.reduce((s, h) => s + h.cpu, 0) / loadedHosts.length)
        : 0;
    return {
      activeIncidents,
      hostsUp,
      totalHosts,
      avgResponse: loadedHosts.length > 0 ? `${avgCpu}%` : "—",
      uptime:
        totalHosts > 0 ? `${((hostsUp / totalHosts) * 100).toFixed(1)}%` : "—",
      severityCounts,
      usingLiveData: !error && lastSync !== null,
    };
  }, [problems, hosts, loading, lastSync, error]);

  // ─── Layout management ──────────────────────────────────────────────────────

  const visibleWidgets = useMemo(
    () => layout.filter((w) => w.visible),
    [layout],
  );

  const applyLayout = useCallback((next: WidgetConfig[]) => {
    setLayout(next);
    saveDashboardLayout(next);
  }, []);

  const moveWidget = useCallback(
    (index: number, dir: -1 | 1) => {
      const allVisible = layout.filter((w) => w.visible);
      const targetVisible = allVisible[index + dir];
      if (!targetVisible) return;
      // Swap in the full layout array
      const full = [...layout];
      const idxA = full.findIndex((w) => w.id === allVisible[index].id);
      const idxB = full.findIndex((w) => w.id === targetVisible.id);
      [full[idxA], full[idxB]] = [full[idxB], full[idxA]];
      applyLayout(full);
    },
    [layout, applyLayout],
  );

  const removeWidget = useCallback(
    (id: string) => {
      applyLayout(layout.map((w) => (w.id === id ? { ...w, visible: false } : w)));
    },
    [layout, applyLayout],
  );

  const handlePickerChange = useCallback(
    (next: WidgetConfig[]) => {
      applyLayout(next);
    },
    [applyLayout],
  );

  // ─── Widget renderer ─────────────────────────────────────────────────────────

  const sharedProps = { loading, lastSync };

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.type) {
      case "kpi-grid":
        return <KpiGridWidget stats={stats} {...sharedProps} />;
      case "severity-breakdown":
        return <SeverityWidget stats={stats} {...sharedProps} />;
      case "recent-incidents":
        return <IncidentsWidget problems={problems} {...sharedProps} />;
      case "top-hosts":
        return <TopHostsWidget hosts={hosts} {...sharedProps} />;
      case "gauge-overview":
        return <GaugeOverviewWidget hosts={hosts} {...sharedProps} />;
      case "report-shortcut":
        return <ReportShortcutWidget />;
      default:
        return null;
    }
  };

  const g = greeting(session?.username ?? "Operator");
  const headerTopPad = isWeb ? 67 + 12 : insets.top + 8;
  const isLive =
    zabbix.status === "connected" || (lastSync !== null && !error);
  const isConnecting = zabbix.isReady && loading && !lastSync && !error;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {newIncident ? (
        <View
          style={{
            position: "absolute",
            top: headerTopPad + 60,
            left: 16,
            right: 16,
            zIndex: 100,
          }}
        >
          <NewIncidentBanner
            incident={newIncident}
            onDismiss={() => setNewIncident(null)}
          />
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: headerTopPad,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.greetingRow}>
              <Feather name={g.icon} size={14} color={colors.primary} />
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                }}
              >
                {dateLine()}
              </Text>
            </View>
            <Text
              style={{
                color: colors.onBackground,
                fontFamily: "Inter_700Bold",
                fontSize: 24,
                lineHeight: 30,
                marginTop: 5,
              }}
            >
              {g.line}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {editMode ? (
              <>
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor:
                        colors.scheme === "dark"
                          ? "rgba(74,144,217,0.12)"
                          : "rgba(32,78,143,0.07)",
                    },
                  ]}
                >
                  <Feather name="plus" size={18} color={colors.primary} />
                </Pressable>
                <Pressable
                  onPress={() => setEditMode(false)}
                  style={[
                    styles.doneBtn,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 13,
                    }}
                  >
                    Done
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    setNotifOpen(true);
                    setUnreadCount(0);
                  }}
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor:
                        colors.scheme === "dark"
                          ? "rgba(74,144,217,0.10)"
                          : "rgba(32,78,143,0.06)",
                    },
                  ]}
                >
                  <Feather name="bell" size={18} color={colors.primary} />
                  {unreadCount > 0 ? (
                    <View
                      style={[
                        styles.notifDot,
                        { backgroundColor: colors.severityHigh },
                      ]}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 9,
                          fontFamily: "Inter_700Bold",
                        }}
                      >
                        {unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => setEditMode(true)}
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor:
                        colors.scheme === "dark"
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <Feather name="sliders" size={18} color={colors.mutedForeground} />
                </Pressable>
                <ThemeToggleButton />
              </>
            )}
          </View>
        </View>

        <View style={{ height: 10 }} />

        {/* ── Live status bar ── */}
        <View style={styles.liveBar}>
          <LiveIndicator live={isLive} connecting={isConnecting} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {lastSync ? (
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 11,
                }}
              >
                Updated {formatRelative(lastSync)}
              </Text>
            ) : null}
            <Pressable
              onPress={() => router.push("/(app)/graphs")}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Feather name="bar-chart-2" size={13} color={colors.primary} />
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: "Inter_500Medium",
                  fontSize: 11,
                }}
              >
                Graphs
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Error / Not configured banners ── */}
        {zabbix.isReady && zabbix.status === "not_configured" ? (
          <View style={{ marginTop: 12 }}>
            <NotConfiguredBanner />
          </View>
        ) : error ? (
          <Pressable
            onPress={refresh}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              marginBottom: 4,
              padding: 12,
              borderRadius: 12,
              backgroundColor: `${colors.severityHigh}14`,
              borderWidth: 1,
              borderColor: colors.severityHigh,
            }}
          >
            <Feather name="alert-circle" size={16} color={colors.severityHigh} />
            <Text
              style={{
                color: colors.severityHigh,
                fontFamily: "Inter_500Medium",
                fontSize: 13,
                flex: 1,
              }}
            >
              {error}
            </Text>
            <Feather name="refresh-cw" size={14} color={colors.severityHigh} />
          </Pressable>
        ) : null}

        {/* ── Edit mode hint ── */}
        {editMode && (
          <View
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 10,
              backgroundColor:
                colors.scheme === "dark"
                  ? "rgba(74,144,217,0.10)"
                  : "rgba(32,78,143,0.07)",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Feather name="info" size={14} color={colors.primary} />
            <Text
              style={{
                color: colors.primary,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                flex: 1,
              }}
            >
              Use arrows to reorder widgets. Tap the sliders icon (
              <Feather name="plus" size={11} color={colors.primary} />
              ) to add hidden sections.
            </Text>
          </View>
        )}

        {/* ── Widget list ── */}
        <View style={{ height: 14 }} />
        {visibleWidgets.map((widget, index) => {
          const content = renderWidget(widget);
          if (!content) return null;
          return (
            <View key={widget.id}>
              {widget.type !== "kpi-grid" && (
                <View style={{ marginTop: 8 }}>
                  <WidgetSectionHeader type={widget.type} />
                </View>
              )}
              <WidgetWrapper
                widget={widget}
                editMode={editMode}
                isFirst={index === 0}
                isLast={index === visibleWidgets.length - 1}
                onMoveUp={() => moveWidget(index, -1)}
                onMoveDown={() => moveWidget(index, 1)}
                onRemove={() => removeWidget(widget.id)}
              >
                {content}
              </WidgetWrapper>
            </View>
          );
        })}

        <SafeBottomPad />
      </ScrollView>

      <NotificationsSheet visible={notifOpen} onClose={() => setNotifOpen(false)} />

      <WidgetPickerModal
        visible={pickerOpen}
        layout={layout}
        onClose={() => setPickerOpen(false)}
        onChange={(next) => {
          handlePickerChange(next);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  liveBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  newIncidentBanner: {
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  bannerContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  bannerText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  editWrapper: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 4,
  },
  editControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
