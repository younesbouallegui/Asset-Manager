import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { NotificationsSheet } from "@/components/NotificationsSheet";
import { SectionHeader } from "@/components/SectionHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  dashboardStats,
  formatRelative,
  getHosts,
  getIncidents,
  Host,
  Incident,
  Severity,
  severityCounts,
} from "@/services/mockData";

type FeatherIcon = React.ComponentProps<typeof Feather>["name"];

const greeting = (name: string): { line: string; icon: FeatherIcon } => {
  const h = new Date().getHours();
  const first = name.trim().split(/\s+/)[0] || name;
  if (h >= 6 && h < 12) return { line: `Good morning, ${first}`, icon: "sun" };
  if (h >= 12 && h < 18)
    return { line: `Good afternoon, ${first}`, icon: "cloud" };
  if (h >= 18 && h < 24)
    return { line: `Good evening, ${first}`, icon: "moon" };
  return { line: `Working late, ${first}`, icon: "moon" };
};

const dateLine = (): string => {
  const d = new Date();
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

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
    tone === "success"
      ? colors.success
      : tone === "warning"
        ? colors.severityAverage
        : tone === "danger"
          ? colors.severityHigh
          : colors.primary;
  return (
    <Card style={styles.statCardInner}>
      <View
        style={[
          styles.iconBubble,
          { backgroundColor: `${tint}1A` },
        ]}
      >
        <Feather name={icon} size={16} color={tint} />
      </View>
      <View style={styles.statValueWrap}>
        <Text
          style={{
            color: colors.onSurface,
            fontFamily: "Inter_700Bold",
            fontSize: 28,
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
      </View>
      <Text
        style={{
          color: "#9d9d9d",
          fontFamily: "Inter_400Regular",
          fontSize: 12,
        }}
        numberOfLines={1}
      >
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
        const tone =
          v > 80
            ? colors.severityHigh
            : v > 60
              ? colors.severityAverage
              : colors.success;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: 28,
              borderRadius: 4,
              backgroundColor:
                colors.scheme === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(15,25,35,0.05)",
              overflow: "hidden",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                height: `${Math.max(8, v)}%`,
                backgroundColor: tone,
                borderRadius: 4,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

function SafeBottomPad() {
  const insets = useSafeAreaInsets();
  const h = (Platform.OS === "web" ? 84 : 56 + insets.bottom) + 16;
  return <View style={{ height: h }} />;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getIncidents(), getHosts()]).then(([i, h]) => {
      if (cancelled) return;
      setIncidents(i);
      setHosts(h);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recentIncidents = useMemo(
    () => incidents.filter((i) => i.status !== "resolved").slice(0, 3),
    [incidents],
  );
  const topHosts = useMemo(
    () =>
      [...hosts]
        .sort((a, b) => b.cpu + b.memory - (a.cpu + a.memory))
        .slice(0, 3),
    [hosts],
  );

  const g = greeting(session?.displayName ?? "Operator");
  const headerTopPad = isWeb ? 67 + 12 : insets.top + 8;

  const severities: { sev: Severity; count: number }[] = [
    { sev: "DISASTER", count: severityCounts.DISASTER },
    { sev: "HIGH", count: severityCounts.HIGH },
    { sev: "AVERAGE", count: severityCounts.AVERAGE },
    { sev: "WARNING", count: severityCounts.WARNING },
    { sev: "INFO", count: severityCounts.INFO },
    { sev: "OK", count: severityCounts.OK },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: headerTopPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.greetingRow}>
            <Feather name={g.icon} size={16} color={colors.primary} />
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 13,
              }}
            >
              {dateLine()}
            </Text>
          </View>
          <Text
            style={{
              color: colors.onBackground,
              fontFamily: "Inter_700Bold",
              fontSize: 26,
              lineHeight: 32,
              marginTop: 6,
            }}
          >
            {g.line}
          </Text>
        </View>
        <View style={styles.headerActions}>
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
                style={[styles.notifDot, { backgroundColor: colors.severityHigh }]}
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
          <ThemeToggleButton />
        </View>
      </View>

      <View style={{ height: 18 }} />

      <View style={styles.statsGrid}>
        {loading ? (
          <>
            <View style={styles.statCard}><Skeleton height={120} radius={16} /></View>
            <View style={styles.statCard}><Skeleton height={120} radius={16} /></View>
            <View style={styles.statCard}><Skeleton height={120} radius={16} /></View>
            <View style={styles.statCard}><Skeleton height={120} radius={16} /></View>
          </>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(0).duration(300)} style={styles.statCard}>
              <StatCard
                icon="alert-triangle"
                value={String(dashboardStats.activeIncidents)}
                label="Active incidents"
                tone="danger"
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.statCard}>
              <StatCard
                icon="server"
                value={`${dashboardStats.hostsUp}/${dashboardStats.totalHosts}`}
                label="Hosts up"
                tone="success"
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.statCard}>
              <StatCard
                icon="zap"
                value={dashboardStats.avgResponse}
                label="Avg. response"
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.statCard}>
              <StatCard
                icon="trending-up"
                value={dashboardStats.uptime}
                label="Uptime"
                tone="success"
              />
            </Animated.View>
          </>
        )}
      </View>

      <View style={{ height: 24 }} />
      <SectionHeader title="Severity overview" />
      <Card>
        <View style={styles.severityRow}>
          {severities.map((s) => (
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
      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : recentIncidents.length === 0 ? (
        <Card>
          <EmptyState variant="incidents" />
        </Card>
      ) : (
        recentIncidents.map((inc, i) => (
          <Animated.View
            key={inc.id}
            entering={FadeInDown.delay(i * 50).duration(280)}
          >
            <Pressable
              onPress={() => router.push(`/(app)/incidents/${inc.id}`)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                marginBottom: 10,
              })}
            >
              <Card>
                <View style={styles.incRow}>
                  <SeverityBadge severity={inc.severity} compact />
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                    }}
                  >
                    {formatRelative(inc.openedAt)}
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.onSurface,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 16,
                    marginTop: 8,
                  }}
                  numberOfLines={2}
                >
                  {inc.title}
                </Text>
                <View style={styles.hostRow}>
                  <Feather
                    name="server"
                    size={12}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_500Medium",
                      fontSize: 12,
                    }}
                  >
                    {inc.host}
                  </Text>
                </View>
              </Card>
            </Pressable>
          </Animated.View>
        ))
      )}

      <View style={{ height: 16 }} />
      <SectionHeader title="Top hosts at risk" />
      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        topHosts.map((h, i) => {
          const cpuBars = Array.from({ length: 8 }).map((_, idx) => {
            const seed = (h.cpu + idx * 11) % 100;
            return Math.max(20, seed);
          });
          return (
            <Animated.View
              key={h.id}
              entering={FadeInDown.delay(i * 50).duration(280)}
            >
              <Pressable
                onPress={() =>
                  router.push(`/(app)/infrastructure/hosts/${h.id}`)
                }
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  marginBottom: 10,
                })}
              >
                <Card>
                  <View style={styles.hostHeader}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.onSurface,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 16,
                        }}
                      >
                        {h.name}
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {h.group} · {h.ip}
                      </Text>
                    </View>
                    <View style={styles.metricCol}>
                      <Text
                        style={{
                          color: colors.onSurface,
                          fontFamily: "Inter_700Bold",
                          fontSize: 18,
                        }}
                      >
                        {h.cpu}%
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontFamily: "Inter_500Medium",
                          fontSize: 11,
                        }}
                      >
                        CPU
                      </Text>
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
          <View
            style={[
              styles.iconBubble,
              {
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor:
                  colors.scheme === "dark"
                    ? "rgba(66,165,245,0.14)"
                    : "rgba(66,165,245,0.10)",
              },
            ]}
          >
            <MaterialCommunityIcons
              name="chart-areaspline"
              size={22}
              color={colors.severityInfo}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.onSurface,
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
              }}
            >
              Weekly performance report
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                marginTop: 2,
              }}
            >
              MTTR, availability and noisy hosts
            </Text>
          </View>
          <Feather
            name="chevron-right"
            size={20}
            color={colors.mutedForeground}
          />
        </Card>
      </Pressable>

      <SafeBottomPad />
      <NotificationsSheet
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    height: 120,
  },
  statCardInner: {
    flex: 1,
    padding: 16,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  statValueWrap: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  severityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  severityChip: {
    marginRight: 4,
  },
  incRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  hostHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricCol: {
    alignItems: "flex-end",
  },
  barsRow: {
    flexDirection: "row",
    gap: 4,
    height: 28,
  },
});
