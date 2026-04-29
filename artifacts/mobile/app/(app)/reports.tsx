import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Skeleton } from "@/components/Skeleton";
import { SeverityBadge } from "@/components/SeverityBadge";
import { useColors } from "@/hooks/useColors";
import {
  getReport,
  ReportRange,
  ReportSeries,
} from "@/services/mockData";

function StatLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.statLine}>
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_500Medium",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.onSurface,
          fontFamily: "Inter_700Bold",
          fontSize: 18,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function HourlyBars({ data }: { data: number[] }) {
  const colors = useColors();
  const max = Math.max(...data, 1);
  return (
    <View style={styles.bars}>
      {data.map((v, i) => (
        <View key={i} style={styles.barCol}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                width: "100%",
                height: `${(v / max) * 100}%`,
                backgroundColor: colors.primary,
                opacity: 0.55 + (v / max) * 0.45,
                borderRadius: 3,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function generateHourly(seed: number): number[] {
  return Array.from({ length: 24 }).map((_, i) => {
    const wave = Math.sin((i / 24) * Math.PI * 2 - 1) * 6 + 8;
    const noise = ((i + 1) * (seed % 7) + 3) % 7;
    return Math.max(1, Math.round(wave + noise));
  });
}

export default function ReportsScreen() {
  const colors = useColors();
  const [range, setRange] = useState<ReportRange>("7d");
  const [report, setReport] = useState<ReportSeries | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setReport(null);
    getReport(range).then((r) => {
      setReport(r);
      setLoading(false);
    });
  }, [range]);

  const hourly = useMemo(
    () => (report ? generateHourly(report.totalIncidents) : []),
    [report],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
    >
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_500Medium",
          fontSize: 13,
          marginBottom: 8,
        }}
      >
        Performance overview
      </Text>
      <SegmentedControl<ReportRange>
        value={range}
        onChange={setRange}
        options={[
          { label: "24 hours", value: "24h" },
          { label: "7 days", value: "7d" },
          { label: "30 days", value: "30d" },
        ]}
      />

      {loading ? (
        <View style={{ marginTop: 16 }}>
          <Skeleton height={120} radius={16} />
          <View style={{ height: 12 }} />
          <Skeleton height={180} radius={16} />
          <View style={{ height: 12 }} />
          <Skeleton height={120} radius={16} />
        </View>
      ) : !report ? (
        <Card style={{ marginTop: 16 }}>
          <EmptyState variant="reports" />
        </Card>
      ) : (
        <>
          <View style={{ height: 16 }} />
          <SectionHeader title="Key indicators" />
          <Card>
            <StatLine
              label="Mean time to recovery"
              value={`${report.mttrMinutes} min`}
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <StatLine
              label="Availability"
              value={`${report.availability.toFixed(2)}%`}
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <StatLine
              label="Total incidents"
              value={String(report.totalIncidents)}
            />
          </Card>

          <View style={{ height: 18 }} />
          <SectionHeader title="Incidents by hour" />
          <Card>
            <HourlyBars data={hourly} />
            <View style={styles.axisRow}>
              <Text style={[styles.axis, { color: colors.mutedForeground }]}>
                00
              </Text>
              <Text style={[styles.axis, { color: colors.mutedForeground }]}>
                06
              </Text>
              <Text style={[styles.axis, { color: colors.mutedForeground }]}>
                12
              </Text>
              <Text style={[styles.axis, { color: colors.mutedForeground }]}>
                18
              </Text>
              <Text style={[styles.axis, { color: colors.mutedForeground }]}>
                24
              </Text>
            </View>
          </Card>

          <View style={{ height: 18 }} />
          <SectionHeader title="Severity distribution" />
          <Card>
            <View style={styles.distRow}>
              {report.distribution.map((d) => (
                <View key={d.severity} style={{ alignItems: "center", gap: 6 }}>
                  <SeverityBadge severity={d.severity} compact />
                  <Text
                    style={{
                      color: colors.onSurface,
                      fontFamily: "Inter_700Bold",
                      fontSize: 16,
                    }}
                  >
                    {d.weight}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <View style={{ height: 18 }} />
          <SectionHeader title="Noisiest hosts" />
          <Card>
            {report.noisyHosts.map((h, idx) => (
              <View
                key={h.host}
                style={[
                  styles.noisyRow,
                  idx > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                  },
                ]}
              >
                <Feather
                  name="server"
                  size={14}
                  color={colors.mutedForeground}
                />
                <Text
                  style={{
                    color: colors.onSurface,
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    flex: 1,
                  }}
                >
                  {h.host}
                </Text>
                <View
                  style={[
                    styles.countPill,
                    { backgroundColor: `${colors.severityAverage}1A` },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.severityAverage,
                      fontFamily: "Inter_700Bold",
                      fontSize: 12,
                    }}
                  >
                    {h.count}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  divider: { height: StyleSheet.hairlineWidth },
  bars: {
    flexDirection: "row",
    height: 120,
    gap: 4,
  },
  barCol: { flex: 1 },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  axis: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  distRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  noisyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
