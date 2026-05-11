import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

import { Card } from "@/components/Card";
import { SeverityBadge } from "@/components/SeverityBadge";
import { LiveDashboardStats, Severity } from "@/services/dataService";

interface Props {
  stats: LiveDashboardStats | null;
  loading: boolean;
  lastSync: number | null;
}

const SEV_ORDER: Severity[] = ["DISASTER", "HIGH", "AVERAGE", "WARNING", "INFO"];

export function SeverityWidget({ stats, loading, lastSync }: Props) {
  if (loading && !lastSync) return null;
  if (!stats) return null;

  const counts = stats.severityCounts as Record<Severity, number>;
  const hasAny = SEV_ORDER.some((s) => counts[s] > 0);
  if (!hasAny) return null;

  return (
    <Card>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {SEV_ORDER.map((sev) => (
          <Pressable
            key={sev}
            onPress={() => router.push("/(app)/(tabs)/incidents")}
          >
            <SeverityBadge severity={sev} count={counts[sev]} compact />
          </Pressable>
        ))}
      </View>
    </Card>
  );
}
