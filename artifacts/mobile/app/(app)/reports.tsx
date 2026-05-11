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
import { useColors } from "@/hooks/useColors";
import {
  getReport,
  ReportRange,
  ReportSeries,
} from "@/services/dataService";

function StatLine({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.statLine}>
      <Text
        style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}
      >
        {label}
      </Text>
      <Text
        style={{ color: colors.onSurface, fontFamily: "Inter_700Bold", fontSize: 18 }}
      >
        {value}
      </Text>
    </View>
  );
}

function TrendBars({ labels, values, color }: { labels: string[]; values: number[]; color: string }) {
  const colors = useColors();
  const max = Math.max(...values, 1);
  const step = Math.max(1, Math.floor(labels.length / 5));
  const axisTicks = labels.filter((_, i) => i % step === 0 || i === labels.length - 1);

  return (
    <>
      <View style={styles.bars}>
        {values.map((v, i) => (
          <View key={i} style={styles.barCol}>
            <View style={{ flex: 1, justifyContent: "flex-end" }}>
              <View
                style={{
                  width: "100%",
                  height: `${Math.max(4, (v / max) * 100)}%`,
                  backgroundColor: color,
                  opacity: 0.45 + (v / max) * 0.55,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.axisRow}>
        {axisTicks.map((l, i) => (
          <Text
            key={i}
            style={[styles.axis, { color: colors.mutedForeground }]}
          >
            {l}
          </Text>
        ))}
      </View>
    </>
  );
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

  const kpis = useMemo(() => {
    if (!report) return null;
    const totalIncidents = report.incidents.reduce((a, b) => a + b, 0);
    const avgAvailability =
      report.availability.reduce((a, b) => a + b, 0) / Math.max(1, report.availability.length);
    const avgMttr =
      report.mttr.reduce((a, b) => a + b, 0) / Math.max(1, report.mttr.length);
    const minAvail = Math.min(...report.availability);
    return { totalIncidents, avgAvailability, avgMttr, minAvail };
  }, [report]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
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
          { label: "24h", value: "1d" },
          { label: "7 days", value: "7d" },
          { label: "30 days", value: "30d" },
        ]}
      />

      {loading ? (
        <View style={{ marginTop: 16, gap: 12 }}>
          <Skeleton height={120} radius={16} />
          <Skeleton height={160} radius={16} />
          <Skeleton height={120} radius={16} />
        </View>
      ) : !report || !kpis ? (
        <Card style={{ marginTop: 16 }}>
          <EmptyState variant="reports" />
        </Card>
      ) : (
        <>
          {/* KPI Summary */}
          <View style={{ height: 18 }} />
          <SectionHeader title="Key indicators" />
          <Card>
            <StatLine label="Mean time to recovery" value={`${Math.round(kpis.avgMttr)} min`} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StatLine label="Avg availability" value={`${kpis.avgAvailability.toFixed(2)}%`} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StatLine label="Min availability" value={`${kpis.minAvail.toFixed(2)}%`} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StatLine label="Total incidents" value={String(kpis.totalIncidents)} />
          </Card>

          {/* Incident trend */}
          <View style={{ height: 18 }} />
          <SectionHeader title="Incident trend" />
          <Card>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 11,
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              INCIDENTS PER PERIOD
            </Text>
            <TrendBars
              labels={report.labels}
              values={report.incidents}
              color={colors.severityHigh}
            />
          </Card>

          {/* Availability trend */}
          <View style={{ height: 18 }} />
          <SectionHeader title="Availability" />
          <Card>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 11,
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              UPTIME % PER PERIOD
            </Text>
            <TrendBars
              labels={report.labels}
              values={report.availability.map((v) => v - 98)}
              color={colors.success}
            />
            <View style={styles.availRow}>
              {report.availability.slice(-5).map((v, i) => (
                <View key={i} style={styles.availChip}>
                  <Text
                    style={{
                      color:
                        v < 99
                          ? colors.severityHigh
                          : v < 99.9
                            ? colors.severityAverage
                            : colors.success,
                      fontFamily: "Inter_700Bold",
                      fontSize: 12,
                    }}
                  >
                    {v.toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {/* MTTR trend */}
          <View style={{ height: 18 }} />
          <SectionHeader title="Recovery time" />
          <Card>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 11,
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              MTTR (MINUTES) PER PERIOD
            </Text>
            <TrendBars
              labels={report.labels}
              values={report.mttr}
              color={colors.severityAverage}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
              <Feather name="clock" size={13} color={colors.mutedForeground} />
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                }}
              >
                Target: under 15 min · Current avg: {Math.round(kpis.avgMttr)} min
              </Text>
            </View>
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
    height: 100,
    gap: 3,
  },
  barCol: { flex: 1 },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  axis: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  availRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap",
  },
  availChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
});
