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
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SkeletonCard } from "@/components/Skeleton";
import { useZabbixConfig } from "@/contexts/ZabbixConfigContext";
import { useColors } from "@/hooks/useColors";
import {
  getHostGroups,
  getHosts,
  getTemplates,
  Host,
  HostGroup,
  Template,
} from "@/services/dataService";

type Mode = "hosts" | "groups" | "templates";

function useTabBarPad() {
  const insets = useSafeAreaInsets();
  return (Platform.OS === "web" ? 84 : 56 + insets.bottom) + 16;
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
        marginHorizontal: 20,
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

function MetricBar({
  value,
  label,
  warn = 70,
  danger = 85,
}: {
  value: number;
  label: string;
  warn?: number;
  danger?: number;
}) {
  const colors = useColors();
  const tint =
    value >= danger
      ? colors.severityHigh
      : value >= warn
        ? colors.severityAverage
        : colors.success;
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.metricRow}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11 }}>
          {label}
        </Text>
        <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
          {value}%
        </Text>
      </View>
      <View
        style={[
          styles.track,
          { backgroundColor: colors.scheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,25,35,0.06)" },
        ]}
      >
        <View style={[styles.fill, { width: `${Math.min(100, value)}%`, backgroundColor: tint }]} />
      </View>
    </View>
  );
}

function HostCard({ host, index }: { host: Host; index: number }) {
  const colors = useColors();
  const statusColor =
    host.status === "ok"
      ? colors.success
      : host.status === "warning"
        ? colors.severityAverage
        : colors.severityHigh;
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(280)} style={{ marginBottom: 10 }}>
      <Pressable
        onPress={() => router.push(`/(app)/infrastructure/hosts/${host.id}`)}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card>
          <View style={styles.hostHeader}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
                {host.name}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                {host.group} · {host.ip}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
          <View style={{ height: 14 }} />
          <View style={styles.metrics}>
            <MetricBar value={host.cpu} label="CPU" />
            <MetricBar value={host.memory} label="MEM" />
            <MetricBar value={host.disk} label="DISK" warn={80} danger={92} />
          </View>
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
              {group.hostCount} hosts
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: `${colors.primary}1A` }]}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 12 }}>
              {group.hostCount}
            </Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

function TemplateCard({ template, index }: { template: Template; index: number }) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(280)} style={{ marginBottom: 10 }}>
      <Card>
        <View style={styles.row}>
          <View style={[styles.iconBubble, { backgroundColor: `${colors.severityInfo}1A` }]}>
            <Feather name="layers" size={16} color={colors.severityInfo} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
              {template.name}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              Applied to {template.appliedTo} hosts
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </View>
      </Card>
    </Animated.View>
  );
}

function friendlyError(msg: string): string {
  if (msg === "ZABBIX_NOT_CONFIGURED") return "Connect Zabbix in Settings to view infrastructure";
  if (msg === "NETWORK_ERROR") return "Cannot reach Zabbix server — check connection";
  if (msg === "HTTP_401") return "Unauthorized — check API token in Settings";
  if (msg === "TIMEOUT") return "Connection timed out — check server URL";
  return "Failed to load data — tap to retry";
}

export default function InfrastructureScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const tabPad = useTabBarPad();
  const { isReady, status } = useZabbixConfig();

  const [mode, setMode] = useState<Mode>("hosts");
  const [query, setQuery] = useState("");
  const [hosts, setHosts] = useState<Host[]>([]);
  const [groups, setGroups] = useState<HostGroup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    console.log("[Infrastructure] load() — isReady:", isReady, "status:", status);
    setError(null);
    try {
      const [h, g, t] = await Promise.all([getHosts(), getHostGroups(), getTemplates()]);
      console.log("[Infrastructure] result — hosts:", h.length, "groups:", g.length);
      setHosts(h);
      setGroups(g);
      setTemplates(t);
    } catch (e) {
      const msg = (e as Error).message ?? "Unknown error";
      console.log("[Infrastructure] error:", msg);
      setError(friendlyError(msg));
    } finally {
      setLoading(false);
    }
  }, [isReady, status]);

  // Wait for isReady before first load — fixes the AsyncStorage race condition
  useEffect(() => {
    if (!isReady) {
      console.log("[Infrastructure] waiting for isReady...");
      return;
    }
    load();
  }, [isReady, load]);

  // Re-fetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("[Infrastructure] focused — isReady:", isReady);
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
    if (!q) return hosts;
    return hosts.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.ip.toLowerCase().includes(q) ||
        h.group.toLowerCase().includes(q),
    );
  }, [hosts, query]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, query]);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.name.toLowerCase().includes(q));
  }, [templates, query]);

  const headerTopPad = isWeb ? 67 + 12 : insets.top + 8;

  const renderList = () => {
    if (loading) {
      return (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: tabPad }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      );
    }
    if (mode === "hosts") {
      return (
        <FlatList
          data={filteredHosts}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: tabPad, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Card style={{ marginTop: 8 }}><EmptyState variant="hosts" /></Card>}
          renderItem={({ item, index }) => <HostCard host={item} index={index} />}
        />
      );
    }
    if (mode === "groups") {
      return (
        <FlatList
          data={filteredGroups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: tabPad, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Card style={{ marginTop: 8 }}><EmptyState variant="hosts" /></Card>}
          renderItem={({ item, index }) => <GroupCard group={item} index={index} />}
        />
      );
    }
    return (
      <FlatList
        data={filteredTemplates}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: tabPad, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Card style={{ marginTop: 8 }}><EmptyState variant="hosts" /></Card>}
        renderItem={({ item, index }) => <TemplateCard template={item} index={index} />}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: headerTopPad }}>
        <Text style={{ color: colors.onBackground, fontFamily: "Inter_700Bold", fontSize: 28 }}>
          Infrastructure
        </Text>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 }}>
          Hosts, groups and templates
        </Text>
        <View style={{ height: 14 }} />
        <SegmentedControl<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { label: "Hosts", value: "hosts" },
            { label: "Groups", value: "groups" },
            { label: "Templates", value: "templates" },
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
      </View>

      {error ? (
        <View style={{ marginTop: 12 }}>
          <ErrorBanner message={error} onRetry={() => { setLoading(true); load(); }} />
        </View>
      ) : null}

      {renderList()}
    </View>
  );
}

const styles = StyleSheet.create({
  hostHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  metrics: { flexDirection: "row", gap: 12 },
  metricRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  track: { width: "100%", height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  iconBubble: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});
