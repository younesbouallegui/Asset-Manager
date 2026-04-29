import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  formatRelative,
  getIncidents,
  Incident,
} from "@/services/mockData";

type FeatherIcon = React.ComponentProps<typeof Feather>["name"];

const TIMELINE: { icon: FeatherIcon; title: string; time: string; tone?: string }[] =
  [
    { icon: "alert-triangle", title: "Trigger fired", time: "0m ago" },
    { icon: "bell", title: "On-call notified", time: "1m ago" },
    { icon: "user-check", title: "Acknowledged by S. Ali", time: "3m ago" },
    { icon: "git-branch", title: "Auto-remediation started", time: "5m ago" },
  ];

export default function IncidentDetail() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);

  useEffect(() => {
    getIncidents().then((items) => {
      const found = items.find((i) => i.id === id) ?? items[0] ?? null;
      setIncident(found);
    });
  }, [id]);

  if (!incident) {
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
    >
      <View style={styles.headerRow}>
        <SeverityBadge severity={incident.severity} />
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_500Medium",
            fontSize: 12,
          }}
        >
          {incident.id} · opened {formatRelative(incident.openedAt)}
        </Text>
      </View>
      <Text
        style={{
          color: colors.onBackground,
          fontFamily: "Inter_700Bold",
          fontSize: 22,
          marginTop: 12,
          lineHeight: 28,
        }}
      >
        {incident.title}
      </Text>

      <View style={{ height: 16 }} />
      <Card>
        <View style={styles.metaRow}>
          <Feather name="server" size={14} color={colors.mutedForeground} />
          <Text
            style={{
              color: colors.onSurface,
              fontFamily: "Inter_500Medium",
              fontSize: 14,
            }}
          >
            {incident.host}
          </Text>
        </View>
        <View style={[styles.metaRow, { marginTop: 8 }]}>
          <Feather
            name="activity"
            size={14}
            color={colors.mutedForeground}
          />
          <Text
            style={{
              color: colors.onSurface,
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              textTransform: "capitalize",
            }}
          >
            Status: {incident.status}
          </Text>
        </View>
        <View style={[styles.metaRow, { marginTop: 8, alignItems: "flex-start" }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} style={{ marginTop: 3 }} />
          <Text
            style={{
              color: colors.onSurface,
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              flex: 1,
              lineHeight: 19,
            }}
          >
            {incident.description}
          </Text>
        </View>
      </Card>

      <View style={{ height: 18 }} />
      <SectionHeader title="Timeline" />
      <Card>
        {TIMELINE.map((step, idx) => (
          <View key={idx} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      idx === 0 ? colors.severityHigh : colors.primary,
                  },
                ]}
              />
              {idx < TIMELINE.length - 1 ? (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor:
                        colors.scheme === "dark"
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(15,25,35,0.08)",
                    },
                  ]}
                />
              ) : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 16 }}>
              <View style={styles.timelineHead}>
                <Feather
                  name={step.icon}
                  size={14}
                  color={colors.mutedForeground}
                />
                <Text
                  style={{
                    color: colors.onSurface,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  {step.title}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  marginTop: 2,
                  marginLeft: 22,
                }}
              >
                {step.time}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={{ height: 18 }} />
      <SectionHeader title="Recommended actions" />
      <View style={styles.actionsCol}>
        <PrimaryButton label="Acknowledge incident" onPress={() => {}} />
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(app)/(tabs)/chatops",
              params: { incident_id: incident.id },
            })
          }
        >
          <Card
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Feather
              name="message-circle"
              size={16}
              color={colors.primary}
            />
            <Text
              style={{
                color: colors.primary,
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
              }}
            >
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineLeft: {
    alignItems: "center",
    width: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: 4,
  },
  timelineHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionsCol: {
    gap: 10,
  },
});
