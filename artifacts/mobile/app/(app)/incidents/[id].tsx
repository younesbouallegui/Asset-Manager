import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SectionHeader } from "@/components/SectionHeader";
import { SeverityBadge } from "@/components/SeverityBadge";
import { useColors } from "@/hooks/useColors";
import {
  acknowledgeIncident,
  formatRelative,
  getIncidents,
  Incident,
} from "@/services/dataService";

type FeatherIcon = React.ComponentProps<typeof Feather>["name"];

function TimelineStep({ icon, title, time, isFirst }: { icon: FeatherIcon; title: string; time: string; isFirst: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        <View style={[styles.dot, { backgroundColor: isFirst ? colors.severityHigh : colors.primary }]} />
      </View>
      <View style={{ flex: 1, paddingBottom: 16 }}>
        <View style={styles.timelineHead}>
          <Feather name={icon} size={14} color={colors.mutedForeground} />
          <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
            {title}
          </Text>
        </View>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2, marginLeft: 22 }}>
          {time}
        </Text>
      </View>
    </View>
  );
}

export default function IncidentDetail() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    getIncidents().then((items) => {
      const found = items.find((i) => i.id === id) ?? items[0] ?? null;
      setIncident(found);
    });
  }, [id]);

  const handleAcknowledge = async () => {
    if (!incident) return;
    setAcknowledging(true);
    try {
      await acknowledgeIncident(incident.id);
      setIncident((prev) => prev ? { ...prev, status: "acknowledged" } : prev);
    } catch {
      Alert.alert("Error", "Could not acknowledge incident. Check your connection.");
    } finally {
      setAcknowledging(false);
    }
  };

  if (!incident) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, flex: 1 }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const timelineEvents: { icon: FeatherIcon; title: string; time: string }[] = [
    { icon: "alert-triangle", title: "Trigger fired", time: formatRelative(incident.openedAt) },
    ...(incident.events ?? []).slice(1).map((ev) => ({
      icon: "check-circle" as FeatherIcon,
      title: ev.text,
      time: formatRelative(ev.ts),
    })),
  ];

  if (incident.status === "acknowledged" && timelineEvents.length === 1) {
    timelineEvents.push({ icon: "user-check", title: "Acknowledged", time: "recently" });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
    >
      <View style={styles.headerRow}>
        <SeverityBadge severity={incident.severity} />
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 }}>
          {incident.id} · opened {formatRelative(incident.openedAt)}
        </Text>
      </View>
      <Text
        style={{ color: colors.onBackground, fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 12, lineHeight: 28 }}
      >
        {incident.title}
      </Text>

      <View style={{ height: 16 }} />
      <Card>
        <View style={styles.metaRow}>
          <Feather name="server" size={14} color={colors.mutedForeground} />
          <Text style={{ color: colors.onSurface, fontFamily: "Inter_500Medium", fontSize: 14 }}>
            {incident.host || "Unknown host"}
          </Text>
        </View>
        <View style={[styles.metaRow, { marginTop: 8 }]}>
          <Feather name="activity" size={14} color={colors.mutedForeground} />
          <Text style={{ color: colors.onSurface, fontFamily: "Inter_500Medium", fontSize: 14, textTransform: "capitalize" }}>
            Status: {incident.status}
          </Text>
        </View>
        <View style={[styles.metaRow, { marginTop: 8, alignItems: "flex-start" }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} style={{ marginTop: 3 }} />
          <Text style={{ color: colors.onSurface, fontFamily: "Inter_400Regular", fontSize: 13, flex: 1, lineHeight: 19 }}>
            {incident.description}
          </Text>
        </View>
      </Card>

      <View style={{ height: 18 }} />
      <SectionHeader title="Timeline" />
      <Card>
        {timelineEvents.map((step, idx) => (
          <TimelineStep
            key={idx}
            icon={step.icon}
            title={step.title}
            time={step.time}
            isFirst={idx === 0}
          />
        ))}
      </Card>

      <View style={{ height: 18 }} />
      <SectionHeader title="Recommended actions" />
      <View style={styles.actionsCol}>
        {incident.status !== "acknowledged" ? (
          <PrimaryButton
            label={acknowledging ? "Acknowledging…" : "Acknowledge incident"}
            onPress={handleAcknowledge}
          />
        ) : (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: `${colors.success}14` }}>
            <Feather name="check-circle" size={16} color={colors.success} />
            <Text style={{ color: colors.success, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
              Acknowledged
            </Text>
          </Card>
        )}
        <Pressable
          onPress={() =>
            router.push({ pathname: "/(app)/(tabs)/chatops", params: { incident_id: incident.id } })
          }
        >
          <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Feather name="message-circle" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
              Open in ChatOps
            </Text>
          </Card>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timelineRow: { flexDirection: "row", gap: 12 },
  timelineLeft: { alignItems: "center", width: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionsCol: { gap: 10 },
});
