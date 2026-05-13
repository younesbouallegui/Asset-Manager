import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { SeverityBadge } from "@/components/SeverityBadge";
import { SkeletonCard } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { formatRelative, Incident } from "@/services/dataService";

interface Props {
  problems: Incident[];
  loading: boolean;
  lastSync: number | null;
  maxItems?: number;
}

export function IncidentsWidget({ problems, loading, lastSync, maxItems = 3 }: Props) {
  const colors = useColors();

  if (loading && !lastSync) {
    return (
      <>
        <SkeletonCard />
        <SkeletonCard />
      </>
    );
  }

  const active = problems.filter((i) => i.status !== "resolved").slice(0, maxItems);

  if (active.length === 0) {
    return (
      <Card>
        <EmptyState variant="incidents" />
      </Card>
    );
  }

  return (
    <>
      {active.map((inc, i) => (
        <Animated.View key={inc.id} entering={FadeInDown.delay(i * 50).duration(280)}>
          <Pressable
            onPress={() => router.push(`/(app)/incidents/${inc.id}`)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginBottom: 10 })}
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
                  fontSize: 15,
                  marginTop: 8,
                }}
                numberOfLines={2}
              >
                {inc.title}
              </Text>
              <View style={styles.incMeta}>
                <Feather name="server" size={12} color={colors.mutedForeground} />
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {inc.host || "Unknown host"}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({
                      pathname: "/(app)/(tabs)/chatops",
                      params: { incident_id: inc.id },
                    });
                  }}
                  hitSlop={6}
                  style={[styles.analyzeBtn, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}30` }]}
                >
                  <Feather name="cpu" size={11} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                    Analyze
                  </Text>
                </Pressable>
              </View>
            </Card>
          </Pressable>
        </Animated.View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  incRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  incMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
});
