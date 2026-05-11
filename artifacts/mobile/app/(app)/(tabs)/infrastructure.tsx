import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { SparkLine } from "@/components/charts/SparkLine";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SkeletonCard } from "@/components/Skeleton";
import { useZabbixConfig } from "@/contexts/ZabbixConfigContext";
import { useColors } from "@/hooks/useColors";
import {
  formatBytes,
  formatUptime,
  metricColor,
} from "@/services/zabbix/MetricDiscovery";
import {
  getHostGroups,
  getHosts,
  Host,
  HostGroup,
} from "@/services/dataService";

type Mode = "hosts" | "groups";
type SortMode = "name" | "cpu" | "memory" | "status";

function useTabBarPad() {
  const insets = useSafeAreaInsets();
  return (Platform.OS === "web" ? 84 : 56 + insets.bottom) + 16;
}

function MetricBar({ value, label }: { value: number; label: string }) {
  const colors = useColors();
  const tone = metricColor(value);
  const tint =
    tone === "danger" ? colors.severityHigh
      : tone === "warn" ? colors.severityAverage
        : colors.success;
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.metricLabelRow}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 10 }}>
          {label}
        </Text>
        <Text style={{ color: tint, fontFamily: "Inter_600SemiBold", fontSize: 10 }}>
          {value}%
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.scheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}>
        <View style={[styles.fill, { width: `${Math.min(100, value)}%`, backgroundColor: tint }]} />
      </View>
    </View>
  );
}

function HostCard({ host, index }: { host: Host; index: number }) {
  const colors = useColors();
  const statusColor =
    host.status === "ok" ? colors.success
      : host.status === "warning" ? colors.severityAverage
        : colors.severityHigh;

  // Generate fake sparkline from cpu value for mini chart (real data would need history)
  const sparkData = useMemo(() => {
    if (!host.metricsLoaded || host.cpu === 0) return [];
    // Generate a plausible sparkline around current value
    return Array.from({ length: 12 }, (_, i) => {
      const wave = Math.sin(i * 0.8) * 8;
      const noise = ((i * 7 + host.cpu * 3) % 14) - 7;
      return Math.max(2, Math.min(98, host.cpu + wave + noise));
    });
  }, [host.cpu, host.metricsLoaded]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 35).duration(280)} style={{ marginBottom: 10 }}>
      <Pressable
        onPress={() => router.push(`/(app)/infrastructure/hosts/${host.id}`)}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        <Card>
          {/* Host header */}
          <View style={styles.hostHeader}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                {host.name}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 1 }}>
                {host.group}{host.ip ? ` · ${host.ip}` : ""}
              </Text>
            </View>
            {/* Mini sparkline */}
            {sparkData.length > 0 ? (
              <SparkLine
                data={sparkData}
                width={56}
                height={28}
                color={colors.primary}
                filled
                strokeWidth={1.5}
              />
            ) : null}
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </View>

          {/* Metric bars */}
          {host.metricsLoaded ? (
            <>
              <View style={{ height: 12 }} />
              <View style={styles.metricsRow}>
                <MetricBar value={host.cpu} label="CPU" />
                <MetricBar value={host.memory} label="MEM" />
                <MetricBar value={host.disk} label="DISK" />
              </View>
            </>
          ) : (
            <View style={{ height: 6 }} />
          )}

          {/* Bottom row: uptime + network */}
          {host.metricsLoaded && (host.uptimeSeconds !== null || host.netIn !== null) && (
            <View style={[styles.bottomRow, { borderTopColor: colors.border }]}>
              {host.uptimeSeconds !== null && (
                <View style={styles.metaItem}>
                  <Feather name="clock" size={11} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                    {formatUptime(host.uptimeSeconds)}
                  </Text>
                </View>
              )}
              {host.netIn !== null && (
                <View style={styles.metaItem}>
                  <Feather name="arrow-down" size={11} color={colors.success} />
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                    {formatBytes(host.netIn)}
                  </Text>
                </View>
              )}
              {host.netOut !== null && (
                <View style={styles.metaItem}>
                  <Feather name="arrow-up" size={11} color={colors.primary} />
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                    {formatBytes(host.netOut)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>
      </Pressable>
    </Animated.View>
  );
}

function GroupCard({ group, index }: { group: HostGroup; index: number }) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(280)} style={{ marginBottom: 10 }}>
      <Card>
        <View style={styles.row}>
          <View style={[styles.iconBubble, { backgroundColor: `${colors.primary}1A` }]}>
            <Feather name="grid" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
              {group.name}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
              {group.hostCount} {group.hostCount === 1 ? "host" : "hosts"}
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: `${colors.primary}1A` }]}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 13 }}>
              {group.hostCount}
            </Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

function SortButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sortChip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={{
          color: active ? colors.primaryForeground : colors.onSurface,
          fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
          fontSize: 11,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function friendlyError(msg: string): string {
  if (msg === "ZABBIX_NOT_CONFIGURED") return "Connect Zabbix in Settings to view infrastructure";
  if (msg === "NETWORK_ERROR") return "Cannot reach Zabbix server";
  if (msg === "HTTP_401") return "Unauthorized — check API token";
  if (msg === "TIMEOUT") return "Connection timed out";
  return "Failed to load — tap to retry";
}

export default function InfrastructureScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const tabPad = useTabBarPad();
  const { isReady, status } = useZabbixConfig();

  const [mode, setMode] = useState<Mode>("hosts");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("status");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "warning" | "down">("all");
  const [hosts, setHosts] = useState<Host[]>([]);
  const [groups, setGroups] = useState<HostGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (mode === "hosts") {
        const h = await getHosts();
        setHosts(h);
      } else {
        const g = await getHostGroups();
        setGroups(g);
      }
    } catch (e) {
      const msg = (e as Error).message ?? "Unknown error";
      setError(friendlyError(msg));
    } finally {
      setLoading(false);
    }
  }, [isReady, status, mode]);

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    load();
  }, [isReady, mode]);

  useFocusEffect(
    useCallback(() => {
      if (isReady) {
        setLoading(true);
        load();
      }
    }, [isReady, load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filteredHosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = hosts;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((h) => h.status === statusFilter);
    }

    // Search
    if (q) {
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.ip.toLowerCase().includes(q) ||
          h.group.toLowerCase().includes(q) ||
          h.groups.some((g) => g.name.toLowerCase().includes(q)),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "cpu") return b.cpu - a.cpu;
      if (sort === "memory") return b.memory - a.memory;
      if (sort === "status") {
        const order = { down: 0, warning: 1, ok: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      }
      return 0;
    });

    return result;
  }, [hosts, query, sort, statusFilter]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, query]);

  const headerTopPad = isWeb ? 67 + 12 : insets.top + 8;

  const statusCounts = useMemo(() => ({
    ok: hosts.filter((h) => h.status === "ok").length,
    warning: hosts.filter((h) => h.status === "warning").length,
    down: hosts.filter((h) => h.status === "down").length,
  }), [hosts]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: headerTopPad }}>
        <Text style={{ color: colors.onBackground, fontFamily: "Inter_700Bold", fontSize: 28 }}>
          Infrastructure
        </Text>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 }}>
          {hosts.length > 0 ? `${hosts.length} hosts · ${statusCounts.ok} up · ${statusCounts.down} down` : "Hosts and groups"}
        </Text>

        <View style={{ height: 14 }} />
        <SegmentedControl<Mode>
          value={mode}
          onChange={(m) => { setMode(m); setLoading(true); }}
          options={[
            { label: "Hosts", value: "hosts" },
            { label: "Groups", value: "groups" },
          ]}
        />
        <View style={{ height: 12 }} />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${mode}…`}
          leftIcon="search"
          autoCapitalize="none"
        />

        {/* Sort + Filter row (hosts only) */}
        {mode === "hosts" && !loading && (
          <>
            <View style={{ height: 10 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
              <SortButton label="Status" active={sort === "status"} onPress={() => setSort("status")} />
              <SortButton label="CPU ↓" active={sort === "cpu"} onPress={() => setSort("cpu")} />
              <SortButton label="Memory ↓" active={sort === "memory"} onPress={() => setSort("memory")} />
              <SortButton label="Name" active={sort === "name"} onPress={() => setSort("name")} />
              <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 2 }} />
              <SortButton label="All" active={statusFilter === "all"} onPress={() => setStatusFilter("all")} />
              <SortButton
                label={`Up (${statusCounts.ok})`}
                active={statusFilter === "ok"}
                onPress={() => setStatusFilter("ok")}
              />
              <SortButton
                label={`Warn (${statusCounts.warning})`}
                active={statusFilter === "warning"}
                onPress={() => setStatusFilter("warning")}
              />
              <SortButton
                label={`Down (${statusCounts.down})`}
                active={statusFilter === "down"}
                onPress={() => setStatusFilter("down")}
              />
            </ScrollView>
          </>
        )}
      </View>

      {error ? (
        <Pressable
          onPress={() => { setLoading(true); load(); }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginHorizontal: 20,
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            backgroundColor: `${colors.severityHigh}14`,
            borderWidth: 1,
            borderColor: colors.severityHigh,
          }}
        >
          <Feather name="alert-circle" size={16} color={colors.severityHigh} />
          <Text style={{ color: colors.severityHigh, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>
            {error}
          </Text>
          <Feather name="refresh-cw" size={14} color={colors.severityHigh} />
        </Pressable>
      ) : null}

      {loading ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: tabPad }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      ) : mode === "hosts" ? (
        <FlatList
          data={filteredHosts}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: tabPad, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Card style={{ marginTop: 8 }}>
              <EmptyState variant="hosts" />
            </Card>
          }
          renderItem={({ item, index }) => <HostCard host={item} index={index} />}
        />
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: tabPad, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Card style={{ marginTop: 8 }}>
              <EmptyState variant="hosts" />
            </Card>
          }
          renderItem={({ item, index }) => <GroupCard group={item} index={index} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hostHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  metricsRow: { flexDirection: "row", gap: 10 },
  metricLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  track: { width: "100%", height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: 5, borderRadius: 3 },
  bottomRow: { flexDirection: "row", gap: 14, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBubble: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
});
