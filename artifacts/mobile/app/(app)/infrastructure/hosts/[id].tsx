import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { GaugeRing } from "@/components/charts/GaugeRing";
import { LineChart } from "@/components/charts/LineChart";
import { SectionHeader } from "@/components/SectionHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Skeleton } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import {
  formatBytes,
  formatUptime,
  metricColor,
} from "@/services/zabbix/MetricDiscovery";
import { getHostDetail, HostDetail, DataSeries } from "@/services/dataService";
import type { ZabbixSeverityCode } from "@/services/zabbix/ZabbixClient";

const SEVERITY_COLORS: Record<ZabbixSeverityCode, string> = {
  "0": "#9e9e9e",
  "1": "#42a5f5",
  "2": "#fdd835",
  "3": "#ff9800",
  "4": "#e53935",
  "5": "#b71c1c",
};
const SEVERITY_LABELS: Record<ZabbixSeverityCode, string> = {
  "0": "Not classified",
  "1": "Info",
  "2": "Warning",
  "3": "Average",
  "4": "High",
  "5": "Disaster",
};

function MetricGauge({
  label,
  value,
  loaded,
  colors,
}: {
  label: string;
  value: number;
  loaded: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  if (!loaded) {
    return (
      <View style={{ alignItems: "center", gap: 6 }}>
        <Skeleton width={72} height={72} radius={36} />
        <Skeleton width={40} height={10} radius={4} />
      </View>
    );
  }
  const tone = metricColor(value);
  const color =
    tone === "danger" ? colors.severityHigh
      : tone === "warn" ? colors.severityAverage
        : colors.success;
  return (
    <GaugeRing
      value={value}
      size={72}
      strokeWidth={7}
      label={label}
      colorOk={colors.success}
      colorWarn={colors.severityAverage}
      colorDanger={colors.severityHigh}
      labelColor={colors.mutedForeground}
      valueColor={colors.onSurface}
      trackColor={colors.scheme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}
    />
  );
}

function HistoryChart({
  series,
  width,
  colors,
}: {
  series: DataSeries;
  width: number;
  colors: ReturnType<typeof useColors>;
}) {
  if (series.data.length < 2) {
    return (
      <View style={{ height: 110, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
          No history available
        </Text>
      </View>
    );
  }
  return (
    <LineChart
      data={series.data}
      width={width}
      height={110}
      color={series.color}
      unit="%"
      threshold={80}
      thresholdColor={colors.severityHigh}
    />
  );
}

export default function HostDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<HostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(300);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getHostDetail(id)
      .then((d) => {
        setDetail(d);
        setLoading(false);
      })
      .catch((e) => {
        setError((e as Error).message);
        setLoading(false);
      });
  }, [id]);

  const headerTopPad = Platform.OS === "web" ? 67 + 12 : insets.top + 8;

  if (loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 20, paddingTop: headerTopPad, paddingBottom: 60 }}
      >
        <Skeleton width={200} height={28} radius={8} />
        <View style={{ height: 8 }} />
        <Skeleton width={140} height={16} radius={6} />
        <View style={{ height: 24 }} />
        <View style={{ flexDirection: "row", gap: 16, justifyContent: "center" }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ alignItems: "center", gap: 8 }}>
              <Skeleton width={72} height={72} radius={36} />
              <Skeleton width={40} height={10} radius={4} />
            </View>
          ))}
        </View>
        <View style={{ height: 24 }} />
        <Skeleton width="100%" height={130} radius={16} />
        <View style={{ height: 12 }} />
        <Skeleton width="100%" height={130} radius={16} />
      </ScrollView>
    );
  }

  if (error || !detail) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Feather name="alert-circle" size={40} color={colors.severityHigh} />
        <Text style={{ color: colors.onBackground, fontFamily: "Inter_600SemiBold", fontSize: 17, marginTop: 16 }}>
          {error ?? "Host not found"}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 20, padding: 14, backgroundColor: colors.primary, borderRadius: 12 }}
        >
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const statusColor =
    detail.status === "ok" ? colors.success
      : detail.status === "warning" ? colors.severityAverage
        : colors.severityHigh;

  const statusLabel =
    detail.status === "ok" ? "Operational"
      : detail.status === "warning" ? "Degraded"
        : "Down";

  const activeTriggers = detail.triggers.filter((t) => t.value === "1");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: headerTopPad, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 20 }}>
        <View style={styles.headerRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.onBackground, fontFamily: "Inter_700Bold", fontSize: 22 }} numberOfLines={2}>
              {detail.name}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 }}>
              {detail.group}
              {detail.ip ? ` · ${detail.ip}` : ""}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A` }]}>
            <Text style={{ color: statusColor, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.4 }}>
              {statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Groups */}
        {detail.groups.length > 1 && (
          <View style={styles.groupsRow}>
            {detail.groups.map((g) => (
              <View key={g.id} style={[styles.groupChip, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}25` }]}>
                <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", fontSize: 11 }}>
                  {g.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ height: 24 }} />

      {/* Live Metric Gauges */}
      <View style={{ paddingHorizontal: 20 }}>
        <SectionHeader title="Live metrics" />
      </View>
      <Card style={{ marginHorizontal: 20 }}>
        <View style={styles.gaugesRow}>
          <MetricGauge label="CPU" value={detail.cpu} loaded={detail.metricsLoaded} colors={colors} />
          <MetricGauge label="Memory" value={detail.memory} loaded={detail.metricsLoaded} colors={colors} />
          <MetricGauge label="Disk" value={detail.disk} loaded={detail.metricsLoaded} colors={colors} />
        </View>

        {/* Network row */}
        {(detail.netIn !== null || detail.netOut !== null || detail.uptimeSeconds !== null) && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.metaMetrics}>
              {detail.netIn !== null && (
                <View style={styles.metaMeta}>
                  <Feather name="arrow-down" size={12} color={colors.success} />
                  <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    {formatBytes(detail.netIn)}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>In</Text>
                </View>
              )}
              {detail.netOut !== null && (
                <View style={styles.metaMeta}>
                  <Feather name="arrow-up" size={12} color={colors.primary} />
                  <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    {formatBytes(detail.netOut)}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>Out</Text>
                </View>
              )}
              {detail.uptimeSeconds !== null && (
                <View style={styles.metaMeta}>
                  <Feather name="clock" size={12} color={colors.severityInfo} />
                  <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    {formatUptime(detail.uptimeSeconds)}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>Uptime</Text>
                </View>
              )}
            </View>
          </>
        )}
      </Card>

      <View style={{ height: 24 }} />

      {/* History Charts */}
      <View
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width - 40 - 32)}
        style={{ paddingHorizontal: 20 }}
      >
        <SectionHeader title="1-hour history" />
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <Card>
            <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 10 }}>
              CPU Utilization
            </Text>
            <HistoryChart series={detail.cpuHistory} width={Math.max(200, chartWidth)} colors={colors} />
          </Card>
        </Animated.View>

        <View style={{ height: 12 }} />
        <Animated.View entering={FadeInDown.delay(150).duration(300)}>
          <Card>
            <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 10 }}>
              Memory Usage
            </Text>
            <HistoryChart series={detail.memHistory} width={Math.max(200, chartWidth)} colors={colors} />
          </Card>
        </Animated.View>

        <View style={{ height: 12 }} />
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <Card>
            <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 10 }}>
              Disk Usage
            </Text>
            <HistoryChart series={detail.diskHistory} width={Math.max(200, chartWidth)} colors={colors} />
          </Card>
        </Animated.View>

        {/* Active Triggers */}
        {activeTriggers.length > 0 && (
          <>
            <View style={{ height: 24 }} />
            <SectionHeader title={`Active triggers (${activeTriggers.length})`} />
            {activeTriggers.map((t, i) => {
              const prio = t.priority as ZabbixSeverityCode;
              const tColor = SEVERITY_COLORS[prio] ?? "#9e9e9e";
              return (
                <Animated.View
                  key={t.triggerid}
                  entering={FadeInDown.delay(i * 40).duration(280)}
                  style={{ marginBottom: 8 }}
                >
                  <Card>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={[styles.triggerDot, { backgroundColor: tColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.onSurface, fontFamily: "Inter_500Medium", fontSize: 14 }} numberOfLines={2}>
                          {t.description}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>
                          {SEVERITY_LABELS[prio]} ·{" "}
                          {t.lastchange
                            ? new Date(parseInt(t.lastchange, 10) * 1000).toLocaleTimeString()
                            : ""}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </Animated.View>
              );
            })}
          </>
        )}

        {/* Interfaces */}
        {detail.interfaces.length > 0 && (
          <>
            <View style={{ height: 24 }} />
            <SectionHeader title="Interfaces" />
            <Card>
              {detail.interfaces.map((iface, i) => (
                <View
                  key={i}
                  style={[
                    styles.ifaceRow,
                    i > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 },
                  ]}
                >
                  <View style={[styles.ifaceIcon, { backgroundColor: `${colors.primary}14` }]}>
                    <Feather name="wifi" size={13} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.onSurface, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                      {iface.ip || iface.dns || "—"}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }}>
                      {iface.type === "1" ? "Agent" : iface.type === "2" ? "SNMP" : iface.type === "3" ? "IPMI" : "JMX"}
                      {iface.port ? ` · Port ${iface.port}` : ""}
                      {iface.main === "1" ? " · Default" : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Groups */}
        <View style={{ height: 24 }} />
        <SectionHeader title="System info" />
        <Card>
          {[
            ["Host", detail.name],
            ["Host ID", detail.id],
            ["Groups", detail.groups.map((g) => g.name).join(", ") || "—"],
            ["Agent", detail.agentVersion],
            ["Uptime", detail.uptimeSeconds ? formatUptime(detail.uptimeSeconds) : `${detail.uptimeDays}d`],
            ["Last check", new Date(detail.lastCheck).toLocaleTimeString()],
          ].map(([k, v], i) => (
            <View
              key={k}
              style={[
                styles.kvRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <Text style={[styles.kvKey, { color: colors.mutedForeground }]}>{k}</Text>
              <Text style={[styles.kvVal, { color: colors.onSurface }]} numberOfLines={2}>{v}</Text>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  groupsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  groupChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  gaugesRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingVertical: 8 },
  divider: { height: 1, marginVertical: 14 },
  metaMetrics: { flexDirection: "row", justifyContent: "space-around" },
  metaMeta: { alignItems: "center", gap: 2 },
  triggerDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  ifaceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ifaceIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  kvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 10, gap: 16 },
  kvKey: { fontFamily: "Inter_500Medium", fontSize: 13 },
  kvVal: { fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "right", flex: 1 },
});
