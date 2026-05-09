import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { NotificationsSheet } from "@/components/NotificationsSheet";
import { SectionHeader } from "@/components/SectionHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { useAuth } from "@/contexts/AuthContext";
import { useZabbixConfig } from "@/contexts/ZabbixConfigContext";
import { useColors } from "@/hooks/useColors";
import { useZabbixPolling } from "@/hooks/useZabbixPolling";
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
  new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

function StatCard({
  icon,
  value,
  label,
  tone = "primary",
}: {
  icon: FeatherIcon;
  value: string;
  label: string;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const colors = useColors();
  const tint =
    tone === "success" ? colors.success
      : tone === "warning" ? colors.severityAverage
        : tone === "danger" ? colors.severityHigh
          : colors.primary;
  return (
    <Card style={styles.statCardInner}>
      <View style={[styles.iconBubble, { backgroundColor: `${tint}1A` }]}>
        <Feather name={icon} size={16} color={tint} />
      </View>
      <View style={styles.statValueWrap}>
        <Text style={{ color: colors.onSurface, fontFamily: "Inter_700Bold", fontSize: 28 }} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
      <Text style={{ color: "#9d9d9d", fontFamily: "Inter_400Regular", fontSize: 12 }} numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

function MiniBars({ values }: { values: number[] }) {
  const colors = useColors();
  return (
    <View style={styles.barsRow}>
      {values.map((v, i) => {
        const tone = v > 80 ? colors.severityHigh : v > 60 ? colors.severityAverage : colors.success;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: 28,
              borderRadius: 4,
              backgroundColor: colors.scheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,25,35,0.05)",
              overflow: "hidden",
              justifyContent: "flex-end",
            }}
          >
            <View style={{ height: `${Math.max(8, v)}%`, backgroundColor: tone, borderRadius: 4 }} />
          </View>
        );
      })}
    </View>
  );
}

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
  const color = live ? colors.success : connecting ? colors.severityAverage : colors.mutedForeground;
  const label = live ? "Live" : connecting ? "Connecting…" : "Not connected";

  return (
    <View style={styles.liveRow}>
      <Animated.View style={[styles.liveDot, { backgroundColor: color }, style]} />
      <Text style={{ color, fontFamily: "Inter_500Medium", fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onRetry}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: `${colors.severityHigh}14`,
        borderWidth: 1,
        borderColor: colors.severityHigh,
      }}
    >
      <Feather name="alert-circle" size={16} color={colors.severityHigh} />
      <Text style={{ color: colors.severityHigh, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>
        {message}
      </Text>
      <Feather name="refresh-cw" size={14} color={colors.severityHigh} />
    </Pressable>
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
      <Text style={{ color: colors.severityAverage, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>
        Zabbix not configured — tap to set up connection
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
    <Animated.View style={[styles.newIncidentBanner, { backgroundColor: colors.severityHigh }, style]}>
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

function SafeBottomPad() {
  const insets = useSafeAreaInsets();
  return <View style={{ height: (Platform.OS === "web" ? 84 : 56 + insets.bottom) + 16 }} />;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { session } = useAuth();
  const zabbix = useZabbixConfig();

  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newIncident, setNewIncident] = useState<Incident | null>(null);

  const { problems, hosts, loading, error, lastSync, refresh } = useZabbixPolling(REFRESH_INTERVAL);
  const prevIncidentIds = useRef<Set<string>>(new Set());

  // Re-fetch when dashboard comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("[Dashboard] focused — isReady:", zabbix.isReady, "status:", zabbix.status);
      if (zabbix.isReady) refresh();
    }, [zabbix.isReady, refresh]),
  );

  useEffect(() => {
    if (loading) return;
    if (prevIncidentIds.current.size === 0) {
      prevIncidentIds.current = new Set(problems.map((i) => i.id));
      return;
    }
    const incoming = problems.filter((i) => !prevIncidentIds.current.has(i.id));
    const urgent = incoming.find((i) => i.severity === "DISASTER" || i.severity === "HIGH");
    if (urgent) setNewIncident(urgent);
    if (incoming.length > 0) setUnreadCount((c) => c + incoming.length);
    prevIncidentIds.current = new Set(problems.map((i) => i.id));
  }, [problems, loading]);

  useEffect(() => {
    if (lastSync) zabbix.markSynced();
  }, [lastSync, zabbix]);

  const stats = useMemo<LiveDashboardStats | null>(() => {
    if (loading && !lastSync) return null;
    const severityCounts: Record<Severity, number> = {
      DISASTER: 0, HIGH: 0, AVERAGE: 0, WARNING: 0, INFO: 0, OK: 0,
    };
    problems.forEach((p) => {
      severityCounts[p.severity] = (severityCounts[p.severity] ?? 0) + 1;
    });
    const hostsUp = hosts.filter((h) => h.status === "ok").length;
    const totalHosts = hosts.length;
    const activeIncidents = problems.filter((p) => p.status !== "resolved").length;
    return {
      activeIncidents,
      hostsUp,
      totalHosts,
      avgResponse: "—",
      uptime: totalHosts > 0 ? `${((hostsUp / totalHosts) * 100).toFixed(2)}%` : "—",
      severityCounts,
      usingLiveData: !error && lastSync !== null,
    };
  }, [problems, hosts, loading, lastSync, error]);

  const recentIncidents = problems.filter((i) => i.status !== "resolved").slice(0, 3);
  const topHosts = [...hosts].sort((a, b) => b.cpu + b.memory - (a.cpu + a.memory)).slice(0, 3);

  const g = greeting(session?.displayName ?? "Operator");
  const headerTopPad = isWeb ? 67 + 12 : insets.top + 8;

  // isLive: true if we got data successfully, or if context confirms connected
  const isLive = zabbix.status === "connected" || (lastSync !== null && !error);
  // connecting: isReady=true and still loading first batch
  const isConnecting = zabbix.isReady && loading && !lastSync && !error;

  const severities: { sev: Severity; count: number }[] = stats
    ? [
        { sev: "DISASTER", count: stats.severityCounts.DISASTER },
        { sev: "HIGH", count: stats.severityCounts.HIGH },
        { sev: "AVERAGE", count: stats.severityCounts.AVERAGE },
        { sev: "WARNING", count: stats.severityCounts.WARNING },
        { sev: "INFO", count: stats.severityCounts.INFO },
        { sev: "OK", count: stats.severityCounts.OK },
      ]
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {newIncident ? (
        <View style={{ position: "absolute", top: headerTopPad + 60, left: 16, right: 16, zIndex: 100 }}>
          <NewIncidentBanner incident={newIncident} onDismiss={() => setNewIncident(null)} />
        </View>
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: headerTopPad }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.greetingRow}>
              <Feather name={g.icon} size={16} color={colors.primary} />
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                {dateLine()}
              </Text>
            </View>
            <Text style={{ color: colors.onBackground, fontFamily: "Inter_700Bold", fontSize: 26, lineHeight: 32, marginTop: 6 }}>
              {g.line}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => { setNotifOpen(true); setUnreadCount(0); }}
              style={[styles.iconBtn, { backgroundColor: colors.scheme === "dark" ? "rgba(74,144,217,0.10)" : "rgba(32,78,143,0.06)" }]}
            >
              <Feather name="bell" size={18} color={colors.primary} />
              {unreadCount > 0 ? (
                <View style={[styles.notifDot, { backgroundColor: colors.severityHigh }]}>
                  <Text style={{ color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" }}>{unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <ThemeToggleButton />
          </View>
        </View>

        <View style={{ height: 10 }} />
        <View style={styles.liveBar}>
          <LiveIndicator live={isLive} connecting={isConnecting} />
          {lastSync ? (
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>
              Updated {formatRelative(lastSync)}
            </Text>
          ) : null}
        </View>

        {zabbix.isReady && zabbix.status === "not_configured" ? (
          <View style={{ marginTop: 12 }}>
            <NotConfiguredBanner />
          </View>
        ) : error ? (
          <View style={{ marginTop: 12 }}>
            <ErrorBanner message={error} onRetry={refresh} />
          </View>
        ) : null}

        <View style={{ height: 12 }} />
        <View style={styles.statsGrid}>
          {loading && !lastSync ? (
            <>
              <View style={styles.statCard}><Skeleton height={120} radius={16} /></View>
              <View style={styles.statCard}><Skeleton height={120} radius={16} /></View>
              <View style={styles.statCard}><Skeleton height={120} radius={16} /></View>
              <View style={styles.statCard}><Skeleton height={120} radius={16} /></View>
            </>
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(0).duration(300)} style={styles.statCard}>
                <StatCard icon="alert-triangle" value={String(stats?.activeIncidents ?? 0)} label="Active incidents" tone="danger" />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.statCard}>
                <StatCard icon="server" value={`${stats?.hostsUp ?? 0}/${stats?.totalHosts ?? 0}`} label="Hosts up" tone="success" />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.statCard}>
                <StatCard icon="zap" value={stats?.avgResponse ?? "—"} label="Avg. response" />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.statCard}>
                <StatCard icon="trending-up" value={stats?.uptime ?? "—"} label="Uptime" tone="success" />
              </Animated.View>
            </>
          )}
        </View>

        <View style={{ height: 24 }} />
        <SectionHeader title="Severity overview" />
        <Card>
          <View style={styles.severityRow}>
            {loading && !lastSync
              ? [0, 1, 2, 3, 4, 5].map((k) => <Skeleton key={k} height={26} width={60} radius={8} />)
              : severities.map((s) => (
                  <View key={s.sev} style={styles.severityChip}>
                    <SeverityBadge severity={s.sev} count={s.count} compact />
                  </View>
                ))}
          </View>
        </Card>

        <View style={{ height: 24 }} />
        <SectionHeader
          title="Recent incidents"
          actionLabel="View all"
          onActionPress={() => router.push("/(app)/(tabs)/incidents")}
        />
        {loading && !lastSync ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : recentIncidents.length === 0 ? (
          <Card><EmptyState variant="incidents" /></Card>
        ) : (
          recentIncidents.map((inc, i) => (
            <Animated.View key={inc.id} entering={FadeInDown.delay(i * 50).duration(280)}>
              <Pressable
                onPress={() => router.push(`/(app)/incidents/${inc.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginBottom: 10 })}
              >
                <Card>
                  <View style={styles.incRow}>
                    <SeverityBadge severity={inc.severity} compact />
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                      {formatRelative(inc.openedAt)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 8 }} numberOfLines={2}>
                    {inc.title}
                  </Text>
                  <View style={styles.hostRow}>
                    <Feather name="server" size={12} color={colors.mutedForeground} />
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                      {inc.host || "Unknown host"}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            </Animated.View>
          ))
        )}

        <View style={{ height: 16 }} />
        <SectionHeader title="Top hosts at risk" />
        {loading && !lastSync ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : topHosts.length === 0 ? (
          <Card><EmptyState variant="hosts" /></Card>
        ) : (
          topHosts.map((h, i) => {
            const cpuBars = Array.from({ length: 8 }).map((_, idx) => Math.max(20, (h.cpu + idx * 11) % 100));
            return (
              <Animated.View key={h.id} entering={FadeInDown.delay(i * 50).duration(280)}>
                <Pressable
                  onPress={() => router.push(`/(app)/infrastructure/hosts/${h.id}`)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginBottom: 10 })}
                >
                  <Card>
                    <View style={styles.hostHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>{h.name}</Text>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                          {h.group || "Zabbix"} · {h.ip || "—"}
                        </Text>
                      </View>
                      <View style={styles.metricCol}>
                        <Text style={{ color: colors.onSurface, fontFamily: "Inter_700Bold", fontSize: 18 }}>
                          {h.cpu || "—"}{h.cpu ? "%" : ""}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11 }}>CPU</Text>
                      </View>
                    </View>
                    <View style={{ height: 12 }} />
                    <MiniBars values={cpuBars} />
                  </Card>
                </Pressable>
              </Animated.View>
            );
          })
        )}

        <View style={{ height: 16 }} />
        <Pressable onPress={() => router.push("/(app)/reports")}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={[styles.iconBubble, { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.scheme === "dark" ? "rgba(66,165,245,0.14)" : "rgba(66,165,245,0.10)" }]}>
              <MaterialCommunityIcons name="chart-areaspline" size={22} color={colors.severityInfo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Weekly performance report</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 }}>MTTR, availability and noisy hosts</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Card>
        </Pressable>

        <SafeBottomPad />
        <NotificationsSheet visible={notifOpen} onClose={() => setNotifOpen(false)} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: 4, right: 4, minWidth: 14, height: 14, borderRadius: 7, paddingHorizontal: 3, alignItems: "center", justifyContent: "center" },
  liveBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "48%", height: 120 },
  statCardInner: { flex: 1, padding: 16, alignItems: "flex-start", justifyContent: "space-between" },
  statValueWrap: { width: "100%", flex: 1, justifyContent: "center" },
  iconBubble: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  severityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  severityChip: { marginRight: 4 },
  incRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  hostHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metricCol: { alignItems: "flex-end" },
  barsRow: { flexDirection: "row", gap: 4, height: 28 },
  newIncidentBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  bannerContent: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  bannerText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
});
