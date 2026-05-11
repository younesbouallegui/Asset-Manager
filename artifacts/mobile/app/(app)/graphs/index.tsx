import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { DataPoint, LineChart } from "@/components/charts/LineChart";
import { EmptyState } from "@/components/EmptyState";
import { useColors } from "@/hooks/useColors";
import { DataSeries, getHosts, getMetricHistory, Host } from "@/services/dataService";

type Metric = "cpu" | "memory" | "disk";
type Range = { label: string; hours: number };

const RANGES: Range[] = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
];

const METRICS: { key: Metric; label: string; icon: string; color: string }[] = [
  { key: "cpu", label: "CPU", icon: "cpu", color: "#e53935" },
  { key: "memory", label: "Memory", icon: "database", color: "#ff9800" },
  { key: "disk", label: "Disk", icon: "hard-drive", color: "#42a5f5" },
];

function MetricStat({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.statBox}>
      <Text style={{ color, fontFamily: "Inter_700Bold", fontSize: 18 }}>{value}</Text>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function computeStats(series: DataSeries | null): { min: string; max: string; avg: string; last: string } {
  if (!series || series.data.length === 0) {
    return { min: "—", max: "—", avg: "—", last: "—" };
  }
  const vals = series.data.map((d) => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const last = vals[vals.length - 1];
  const fmt = (v: number) => `${v.toFixed(1)}%`;
  return { min: fmt(min), max: fmt(max), avg: fmt(avg), last: fmt(last) };
}

export default function GraphExplorerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [hosts, setHosts] = useState<Host[]>([]);
  const [hostsLoading, setHostsLoading] = useState(true);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<Metric>("cpu");
  const [selectedRange, setSelectedRange] = useState<Range>(RANGES[1]);
  const [series, setSeries] = useState<DataSeries | null>(null);
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      return () => { mountedRef.current = false; };
    }, []),
  );

  useEffect(() => {
    mountedRef.current = true;
    setHostsLoading(true);
    getHosts()
      .then((h) => {
        if (!mountedRef.current) return;
        setHosts(h);
        if (h.length > 0 && !selectedHost) setSelectedHost(h[0]);
      })
      .catch(() => { /* ignore */ })
      .finally(() => { if (mountedRef.current) setHostsLoading(false); });
    return () => { mountedRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedHost) return;
    const ctrl = { cancelled: false };
    setGraphLoading(true);
    setGraphError(null);
    setSeries(null);
    setChartData([]);
    getMetricHistory(selectedHost.id, selectedMetric, selectedRange.hours)
      .then((s) => {
        if (ctrl.cancelled) return;
        setSeries(s);
        setChartData(s.data.map((d) => ({ ts: d.ts, value: d.value })));
      })
      .catch((e) => {
        if (ctrl.cancelled) return;
        setGraphError((e as Error).message ?? "Failed to load graph");
      })
      .finally(() => {
        if (!ctrl.cancelled) setGraphLoading(false);
      });
    return () => { ctrl.cancelled = true; };
  }, [selectedHost, selectedMetric, selectedRange]);

  const stats = computeStats(series);
  const activeMetric = METRICS.find((m) => m.key === selectedMetric)!;
  const bottomPad = isWeb ? 84 + 16 : 56 + insets.bottom + 16;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        {/* Host selector */}
        {hostsLoading ? (
          <View style={[styles.section, { justifyContent: "center", alignItems: "center", height: 60 }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : hosts.length === 0 ? (
          <Card>
            <EmptyState variant="hosts" />
          </Card>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>HOST</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {hosts.map((h) => {
                const active = selectedHost?.id === h.id;
                return (
                  <Pressable
                    key={h.id}
                    onPress={() => setSelectedHost(h)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.scheme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? "#fff" : colors.onSurface,
                        fontFamily: "Inter_500Medium",
                        fontSize: 13,
                      }}
                    >
                      {h.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        <View style={{ height: 16 }} />

        {/* Metric selector */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>METRIC</Text>
        <View style={styles.metricRow}>
          {METRICS.map((m) => {
            const active = selectedMetric === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setSelectedMetric(m.key)}
                style={[
                  styles.metricBtn,
                  {
                    backgroundColor: active ? `${m.color}22` : colors.scheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                    borderColor: active ? m.color : colors.border,
                    flex: 1,
                  },
                ]}
              >
                <Feather
                  name={m.icon as React.ComponentProps<typeof Feather>["name"]}
                  size={16}
                  color={active ? m.color : colors.mutedForeground}
                />
                <Text
                  style={{
                    color: active ? m.color : colors.mutedForeground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 13,
                  }}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 16 }} />

        {/* Time range selector */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TIME RANGE</Text>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => {
            const active = selectedRange.hours === r.hours;
            return (
              <Pressable
                key={r.label}
                onPress={() => setSelectedRange(r)}
                style={[
                  styles.rangeBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.scheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                    borderColor: active ? colors.primary : colors.border,
                    flex: 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? "#fff" : colors.mutedForeground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 13,
                  }}
                >
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 24 }} />

        {/* Graph card */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {/* Graph header */}
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.metricDot, { backgroundColor: activeMetric.color }]} />
              <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                {activeMetric.label} Utilization
              </Text>
              {graphLoading && (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 }}>
              {selectedHost?.name ?? "No host selected"} · Last {selectedRange.label}
            </Text>
          </View>

          {/* Stats row */}
          {series && series.data.length > 0 ? (
            <View style={styles.statsRow}>
              <MetricStat label="Current" value={stats.last} color={activeMetric.color} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <MetricStat label="Average" value={stats.avg} color={colors.onSurface} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <MetricStat label="Max" value={stats.max} color={colors.severityHigh} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <MetricStat label="Min" value={stats.min} color={colors.success} />
            </View>
          ) : null}

          {/* Chart area */}
          <View style={{ height: 220, padding: 8 }}>
            {graphLoading ? (
              <View style={styles.graphCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 10 }}>
                  Fetching telemetry…
                </Text>
              </View>
            ) : graphError ? (
              <View style={styles.graphCenter}>
                <Feather name="alert-circle" size={28} color={colors.severityHigh} />
                <Text style={{ color: colors.severityHigh, fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 8, textAlign: "center" }}>
                  {graphError}
                </Text>
              </View>
            ) : chartData.length < 2 ? (
              <View style={styles.graphCenter}>
                <Feather name="bar-chart-2" size={28} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 8, textAlign: "center" }}>
                  No data available for this metric and time range.
                </Text>
              </View>
            ) : (
              <LineChart
                data={chartData}
                height={200}
                color={activeMetric.color}
                unit="%"
              />
            )}
          </View>
        </Card>

        <View style={{ height: 16 }} />

        {/* Navigate to host detail */}
        {selectedHost && (
          <Pressable
            onPress={() => router.push(`/(app)/infrastructure/hosts/${selectedHost.id}`)}
          >
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Feather name="server" size={18} color={colors.primary} />
              <Text style={{ flex: 1, color: colors.onSurface, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                View full host detail
              </Text>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Card>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  section: {
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  metricRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  rangeRow: {
    flexDirection: "row",
    gap: 8,
  },
  rangeBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginVertical: 8,
  },
  graphCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
