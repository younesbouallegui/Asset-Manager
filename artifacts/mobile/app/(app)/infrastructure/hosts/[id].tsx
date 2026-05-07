import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Card } from "@/components/Card";
import { SectionHeader } from "@/components/SectionHeader";
import { useColors } from "@/hooks/useColors";
import { getHosts, Host } from "@/services/dataService";

function MiniSpark({ values, color }: { values: number[]; color: string }) {
  return (
    <View style={styles.spark}>
      {values.map((v, i) => (
        <View
          key={i}
          style={[
            styles.sparkBar,
            {
              height: `${Math.max(8, v)}%`,
              backgroundColor: color,
              opacity: 0.5 + (i / values.length) * 0.5,
            },
          ]}
        />
      ))}
    </View>
  );
}

function MetricBlock({
  label,
  value,
  trend,
  color,
}: {
  label: string;
  value: string;
  trend: number[];
  color: string;
}) {
  const colors = useColors();
  return (
    <Card style={{ flex: 1 }}>
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.onSurface,
          fontFamily: "Inter_700Bold",
          fontSize: 22,
          marginTop: 6,
        }}
      >
        {value}
      </Text>
      <View style={{ height: 10 }} />
      <MiniSpark values={trend} color={color} />
    </Card>
  );
}

export default function HostDetail() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [host, setHost] = useState<Host | null>(null);

  useEffect(() => {
    getHosts().then((items) => {
      const found = items.find((h) => h.id === id) ?? items[0] ?? null;
      setHost(found);
    });
  }, [id]);

  const trends = useMemo(() => {
    if (!host) return { cpu: [], mem: [], disk: [] };
    const gen = (base: number) =>
      Array.from({ length: 16 }).map((_, i) => {
        const wave = Math.sin(i * 0.7) * 8;
        const noise = (i * 13 + base * 7) % 10;
        return Math.max(8, Math.min(98, base + wave + noise - 5));
      });
    return {
      cpu: gen(host.cpu),
      mem: gen(host.memory),
      disk: gen(host.disk),
    };
  }, [host]);

  if (!host) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, flex: 1 },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const statusColor =
    host.status === "ok"
      ? colors.success
      : host.status === "warning"
        ? colors.severityAverage
        : colors.severityHigh;
  const statusLabel =
    host.status === "ok"
      ? "Operational"
      : host.status === "warning"
        ? "Degraded"
        : "Down";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
    >
      <View style={styles.headerRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.onBackground,
              fontFamily: "Inter_700Bold",
              fontSize: 22,
            }}
          >
            {host.name}
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {host.group} · {host.ip}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: `${statusColor}1A` },
          ]}
        >
          <Text
            style={{
              color: statusColor,
              fontFamily: "Inter_600SemiBold",
              fontSize: 11,
              letterSpacing: 0.4,
            }}
          >
            {statusLabel.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={{ height: 18 }} />
      <SectionHeader title="Live metrics" />
      <View style={styles.metricsRow}>
        <MetricBlock
          label="CPU"
          value={`${host.cpu}%`}
          trend={trends.cpu}
          color={colors.severityHigh}
        />
        <MetricBlock
          label="MEMORY"
          value={`${host.memory}%`}
          trend={trends.mem}
          color={colors.severityAverage}
        />
      </View>
      <View style={{ height: 12 }} />
      <View style={styles.metricsRow}>
        <MetricBlock
          label="DISK"
          value={`${host.disk}%`}
          trend={trends.disk}
          color={colors.severityInfo}
        />
        <MetricBlock
          label="UPTIME"
          value="42d"
          trend={Array.from({ length: 16 }).fill(80) as number[]}
          color={colors.success}
        />
      </View>

      <View style={{ height: 18 }} />
      <SectionHeader title="System info" />
      <Card>
        <View style={styles.kv}>
          <Text style={[styles.k, { color: colors.mutedForeground }]}>OS</Text>
          <Text style={[styles.v, { color: colors.onSurface }]}>
            {host.os}
          </Text>
        </View>
        <View style={styles.kv}>
          <Text style={[styles.k, { color: colors.mutedForeground }]}>
            Group
          </Text>
          <Text style={[styles.v, { color: colors.onSurface }]}>
            {host.group}
          </Text>
        </View>
        <View style={styles.kv}>
          <Text style={[styles.k, { color: colors.mutedForeground }]}>
            Agent version
          </Text>
          <Text style={[styles.v, { color: colors.onSurface }]}>
            {host.agentVersion}
          </Text>
        </View>
        <View style={styles.kv}>
          <Text style={[styles.k, { color: colors.mutedForeground }]}>
            Uptime
          </Text>
          <Text style={[styles.v, { color: colors.onSurface }]}>
            {host.uptimeDays}d
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  spark: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 36,
    gap: 3,
  },
  sparkBar: {
    flex: 1,
    borderRadius: 2,
  },
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  k: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  v: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
