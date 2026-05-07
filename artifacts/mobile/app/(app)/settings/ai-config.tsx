import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { SectionHeader } from "@/components/SectionHeader";
import { useColors } from "@/hooks/useColors";

function InfoRow({ icon, label, value, accent }: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  accent?: string;
}) {
  const colors = useColors();
  const color = accent ?? colors.primary;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
      <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: `${color}1A` }}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, letterSpacing: 0.3 }}>{label}</Text>
        <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}

export default function AiConfigScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
    >
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20, backgroundColor: `${colors.success}10`, borderColor: colors.success }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.success}20` }}>
          <Feather name="check-circle" size={22} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.success, fontFamily: "Inter_700Bold", fontSize: 15 }}>AI Ready — No key required</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
            ChatOps uses a built-in free AI. No API key or account needed.
          </Text>
        </View>
      </Card>

      <SectionHeader title="Active Model" />
      <Card style={{ gap: 10 }}>
        <InfoRow icon="cpu" label="Provider" value="Pollinations AI" />
        <InfoRow icon="zap" label="Model" value="OpenAI Large (GPT-4o class)" accent={colors.accent} />
        <InfoRow icon="globe" label="Access" value="Free · No authentication" accent={colors.success} />
        <InfoRow icon="lock" label="Privacy" value="Private mode enabled" accent={colors.severityInfo} />
      </Card>

      <View style={{ height: 20 }} />
      <SectionHeader title="Capabilities" />
      <Card style={{ gap: 8 }}>
        {[
          { icon: "activity" as const, text: "Incident root cause analysis" },
          { icon: "server" as const, text: "Host & infrastructure diagnostics" },
          { icon: "tool" as const, text: "Step-by-step remediation guides" },
          { icon: "trending-up" as const, text: "Performance tuning recommendations" },
          { icon: "message-circle" as const, text: "English & French language support" },
        ].map(({ icon, text }) => (
          <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name={icon} size={14} color={colors.primary} />
            <Text style={{ color: colors.onSurface, fontFamily: "Inter_400Regular", fontSize: 13 }}>{text}</Text>
          </View>
        ))}
      </Card>

      <View style={{ height: 20 }} />
      <Card style={{ backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}30` }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 }}>
          The ChatOps AI connects to Pollinations.ai, a free public AI service. No data is stored permanently. For maximum accuracy, connect Zabbix to provide real-time infrastructure context.
        </Text>
      </Card>
    </ScrollView>
  );
}
