import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
import { SeverityBadge } from "@/components/SeverityBadge";
import { SkeletonCard } from "@/components/Skeleton";
import { useZabbixConfig } from "@/contexts/ZabbixConfigContext";
import { useColors } from "@/hooks/useColors";
import { useZabbixPolling } from "@/hooks/useZabbixPolling";
import { formatRelative, Severity } from "@/services/dataService";

const FILTERS: ("ALL" | Severity)[] = [
  "ALL",
  "DISASTER",
  "HIGH",
  "AVERAGE",
  "WARNING",
  "INFO",
  "OK",
];

function useTabBarPad(): number {
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

export default function IncidentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const tabPad = useTabBarPad();
  const zabbix = useZabbixConfig();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | Severity>("ALL");

  const { problems, loading, error, lastSync, refresh } = useZabbixPolling(60_000);

  // Re-fetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("[Incidents] focused — isReady:", zabbix.isReady, "status:", zabbix.status);
      if (zabbix.isReady) refresh();
    }, [zabbix.isReady, refresh]),
  );

  const onRefresh = () => {
    console.log("[Incidents] manual refresh");
    refresh();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter((i) => {
      if (filter !== "ALL" && i.severity !== filter) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.host.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      );
    });
  }, [problems, query, filter]);

  const headerTopPad = isWeb ? 67 + 12 : insets.top + 8;
  const isFirstLoad = loading && !lastSync;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: headerTopPad }}>
        <Text style={{ color: colors.onBackground, fontFamily: "Inter_700Bold", fontSize: 28 }}>
          Incidents
        </Text>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 }}>
          Live triggers across all monitored hosts
        </Text>
        <View style={{ height: 14 }} />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search by host, title or ID"
          leftIcon="search"
          autoCapitalize="none"
        />
        <View style={{ height: 12 }} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 20 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? colors.primaryForeground : colors.onSurface,
                    fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                    fontSize: 12,
                    letterSpacing: 0.4,
                  }}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <ErrorBanner message={error} onRetry={refresh} />
      ) : null}

      {isFirstLoad ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: tabPad }}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: tabPad, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={loading && !!lastSync} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Card style={{ marginTop: 8 }}>
              <EmptyState variant="incidents" />
            </Card>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(280)} style={{ marginBottom: 10 }}>
              <Pressable
                onPress={() => router.push(`/(app)/incidents/${item.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Card>
                  <View style={styles.row}>
                    <SeverityBadge severity={item.severity} compact />
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                      {item.id} · {formatRelative(item.openedAt)}
                    </Text>
                  </View>
                  <Text
                    style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 8 }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <View style={styles.metaRow}>
                    <Feather name="server" size={12} color={colors.mutedForeground} />
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                      {item.host || "Unknown host"}
                    </Text>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            item.status === "open"
                              ? colors.severityHigh
                              : item.status === "acknowledged"
                                ? colors.severityAverage
                                : colors.success,
                        },
                      ]}
                    />
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, textTransform: "capitalize" }}>
                      {item.status}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 6 },
});
