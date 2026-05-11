import React, { useMemo } from "react";
import { Text, View } from "react-native";

import { Card } from "@/components/Card";
import { GaugeRing } from "@/components/charts/GaugeRing";
import { useColors } from "@/hooks/useColors";
import { Host } from "@/services/dataService";

interface Props {
  hosts: Host[];
  loading: boolean;
  lastSync: number | null;
}

export function GaugeOverviewWidget({ hosts, loading, lastSync }: Props) {
  const colors = useColors();
  const isDark = colors.scheme === "dark";

  const avgs = useMemo(() => {
    const loaded = hosts.filter((h) => h.metricsLoaded);
    if (loaded.length === 0) return { cpu: 0, memory: 0, disk: 0 };
    const sum = loaded.reduce(
      (acc, h) => ({ cpu: acc.cpu + h.cpu, memory: acc.memory + h.memory, disk: acc.disk + h.disk }),
      { cpu: 0, memory: 0, disk: 0 },
    );
    return {
      cpu: Math.round(sum.cpu / loaded.length),
      memory: Math.round(sum.memory / loaded.length),
      disk: Math.round(sum.disk / loaded.length),
    };
  }, [hosts]);

  if (loading && !lastSync) return null;

  const trackColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const valueColor = colors.onSurface;
  const labelColor = colors.mutedForeground;

  return (
    <Card>
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          letterSpacing: 0.5,
          marginBottom: 16,
        }}
      >
        INFRASTRUCTURE AVERAGES
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "center" }}>
        <GaugeRing
          value={avgs.cpu}
          size={90}
          strokeWidth={8}
          label="CPU"
          colorOk="#43a047"
          colorWarn="#ff9800"
          colorDanger="#e53935"
          trackColor={trackColor}
          valueColor={valueColor}
          labelColor={labelColor}
        />
        <GaugeRing
          value={avgs.memory}
          size={90}
          strokeWidth={8}
          label="Memory"
          colorOk="#43a047"
          colorWarn="#ff9800"
          colorDanger="#e53935"
          trackColor={trackColor}
          valueColor={valueColor}
          labelColor={labelColor}
        />
        <GaugeRing
          value={avgs.disk}
          size={90}
          strokeWidth={8}
          label="Disk"
          colorOk="#43a047"
          colorWarn="#ff9800"
          colorDanger="#e53935"
          trackColor={trackColor}
          valueColor={valueColor}
          labelColor={labelColor}
        />
      </View>
      {hosts.filter((h) => h.metricsLoaded).length === 0 && (
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Metrics loading…
        </Text>
      )}
    </Card>
  );
}
