import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type FeatherIcon = React.ComponentProps<typeof Feather>["name"];

export type EmptyVariant = "incidents" | "hosts" | "chat" | "reports" | "generic";

const variants: Record<
  EmptyVariant,
  { icon: FeatherIcon; title: string; subtitle: string }
> = {
  incidents: {
    icon: "shield",
    title: "No active incidents",
    subtitle: "All systems operational",
  },
  hosts: {
    icon: "server",
    title: "No hosts configured",
    subtitle: "Add hosts in Zabbix",
  },
  chat: {
    icon: "message-circle",
    title: "Start a conversation",
    subtitle: "Ask me about your infrastructure",
  },
  reports: {
    icon: "bar-chart-2",
    title: "No data available",
    subtitle: "Check your date range",
  },
  generic: {
    icon: "inbox",
    title: "Nothing here yet",
    subtitle: "New items will appear here",
  },
};

export function EmptyState({
  variant = "generic",
  title,
  subtitle,
  icon,
}: {
  variant?: EmptyVariant;
  title?: string;
  subtitle?: string;
  icon?: FeatherIcon;
}) {
  const colors = useColors();
  const v = variants[variant];
  const ic: FeatherIcon = icon ?? v.icon;
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor:
              colors.scheme === "dark"
                ? "rgba(74,144,217,0.10)"
                : "rgba(32,78,143,0.06)",
          },
        ]}
      >
        <Feather name={ic} size={28} color={colors.primary} />
      </View>
      <Text
        style={[
          styles.title,
          { color: colors.onBackground, fontFamily: "Inter_600SemiBold" },
        ]}
      >
        {title ?? v.title}
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
      >
        {subtitle ?? v.subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 18 },
  subtitle: { fontSize: 13, textAlign: "center" },
});
