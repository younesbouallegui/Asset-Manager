import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Card } from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { LiveDashboardStats, Severity } from "@/services/dataService";

type FeatherIcon = React.ComponentProps<typeof Feather>["name"];

function StatCard({
  icon,
  value,
  label,
  tone = "primary",
  sub,
  delay = 0,
}: {
  icon: FeatherIcon;
  value: string;
  label: string;
  tone?: "primary" | "success" | "warning" | "danger";
  sub?: string;
  delay?: number;
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
    <Animated.View entering={FadeInDown.delay(delay).duration(300)} style={styles.statCard}>
      <Card style={styles.statCardInner}>
        <View style={[styles.iconBubble, { backgroundColor: `${tint}18` }]}>
          <Feather name={icon} size={15} color={tint} />
        </View>
        <View style={styles.statValueWrap}>
          <Text
            style={{ color: colors.onSurface, fontFamily: "Inter_700Bold", fontSize: 26 }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {value}
          </Text>
          {sub ? (
            <Text
              style={{
                color: tint,
                fontFamily: "Inter_500Medium",
                fontSize: 11,
                marginTop: 2,
              }}
            >
              {sub}
            </Text>
          ) : null}
        </View>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 12,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Card>
    </Animated.View>
  );
}

interface Props {
  stats: LiveDashboardStats | null;
  loading: boolean;
  lastSync: number | null;
}

export function KpiGridWidget({ stats, loading, lastSync }: Props) {
  if (loading && !lastSync) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((k) => (
          <View key={k} style={styles.statCard}>
            <Skeleton height={120} radius={16} />
          </View>
        ))}
      </View>
    );
  }

  const avgCpuNum = stats?.avgResponse !== "—" ? parseInt(stats?.avgResponse ?? "0") : 0;

  return (
    <View style={styles.grid}>
      <StatCard
        icon="alert-triangle"
        value={String(stats?.activeIncidents ?? 0)}
        label="Active incidents"
        tone={stats && stats.activeIncidents > 0 ? "danger" : "success"}
        sub={
          stats && (stats.severityCounts as Record<Severity, number>).DISASTER > 0
            ? `${(stats.severityCounts as Record<Severity, number>).DISASTER} disaster`
            : undefined
        }
        delay={0}
      />
      <StatCard
        icon="server"
        value={`${stats?.hostsUp ?? 0}/${stats?.totalHosts ?? 0}`}
        label="Hosts online"
        tone="success"
        sub={stats && stats.totalHosts > 0 ? stats.uptime : undefined}
        delay={50}
      />
      <StatCard
        icon="cpu"
        value={stats?.avgResponse ?? "—"}
        label="Avg CPU"
        tone={avgCpuNum > 80 ? "danger" : avgCpuNum > 60 ? "warning" : "primary"}
        delay={100}
      />
      <StatCard
        icon="trending-up"
        value={stats?.uptime ?? "—"}
        label="Availability"
        tone="success"
        delay={150}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
  },
  statCardInner: {
    gap: 6,
    minHeight: 110,
    justifyContent: "space-between",
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValueWrap: {
    flex: 1,
    justifyContent: "center",
  },
});
