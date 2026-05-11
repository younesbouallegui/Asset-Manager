import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Card } from "@/components/Card";
import { SparkLine } from "@/components/charts/SparkLine";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { Host } from "@/services/dataService";

interface HostRowProps {
  host: Host;
}

function HostRow({ host }: HostRowProps) {
  const colors = useColors();

  const sparkData = useMemo(() => {
    if (!host.metricsLoaded || host.cpu === 0) return [];
    return Array.from({ length: 16 }, (_, i) => {
      const wave = Math.sin(i * 0.7) * 7;
      const noise = ((i * 11 + host.cpu * 5) % 12) - 6;
      return Math.max(2, Math.min(98, host.cpu + wave + noise));
    });
  }, [host.cpu, host.metricsLoaded]);

  const cpuColor =
    host.cpu >= 85
      ? colors.severityHigh
      : host.cpu >= 70
        ? colors.severityAverage
        : colors.success;

  return (
    <Pressable
      onPress={() => router.push(`/(app)/infrastructure/hosts/${host.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginBottom: 10 })}
    >
      <Card>
        <View style={styles.hostHeader}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.onSurface,
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
              }}
            >
              {host.name}
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 11,
                marginTop: 1,
              }}
            >
              {host.group}
              {host.ip ? ` · ${host.ip}` : ""}
            </Text>
          </View>
          {host.metricsLoaded ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {sparkData.length > 0 && (
                <SparkLine data={sparkData} width={50} height={26} color={cpuColor} filled />
              )}
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{ color: cpuColor, fontFamily: "Inter_700Bold", fontSize: 18 }}
                >
                  {host.cpu}%
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 10,
                  }}
                >
                  CPU
                </Text>
              </View>
            </View>
          ) : (
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
              }}
            >
              Loading…
            </Text>
          )}
        </View>

        {host.metricsLoaded && (
          <>
            <View style={{ height: 10 }} />
            <View style={styles.metricsBarRow}>
              {[
                { label: "MEM", value: host.memory, color: colors.severityAverage },
                { label: "DISK", value: host.disk, color: colors.severityInfo },
              ].map((m) => (
                <View key={m.label} style={{ flex: 1 }}>
                  <View style={styles.barLabelRow}>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                        fontSize: 10,
                      }}
                    >
                      {m.label}
                    </Text>
                    <Text
                      style={{
                        color:
                          m.value >= 85 ? colors.severityHigh : colors.onSurface,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 10,
                      }}
                    >
                      {m.value}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.barTrack,
                      {
                        backgroundColor:
                          colors.scheme === "dark"
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.06)",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.min(100, m.value)}%`, backgroundColor: m.color },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </Card>
    </Pressable>
  );
}

interface Props {
  hosts: Host[];
  loading: boolean;
  lastSync: number | null;
  maxItems?: number;
}

export function TopHostsWidget({ hosts, loading, lastSync, maxItems = 4 }: Props) {
  const topHosts = useMemo(
    () =>
      [...hosts]
        .sort((a, b) => b.cpu + b.memory - (a.cpu + a.memory))
        .slice(0, maxItems),
    [hosts, maxItems],
  );

  if (loading && !lastSync) {
    return (
      <>
        <SkeletonCard />
        <SkeletonCard />
      </>
    );
  }

  if (topHosts.length === 0) {
    return (
      <Card>
        <EmptyState variant="hosts" />
      </Card>
    );
  }

  return (
    <>
      {topHosts.map((h, i) => (
        <Animated.View key={h.id} entering={FadeInDown.delay(i * 50).duration(280)}>
          <HostRow host={h} />
        </Animated.View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  hostHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  metricsBarRow: { flexDirection: "row", gap: 14 },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  barTrack: {
    height: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    borderRadius: 4,
  },
});
