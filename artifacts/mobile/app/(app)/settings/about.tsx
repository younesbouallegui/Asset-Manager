import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PoulinaLogo } from "@/components/PoulinaLogo";
import { useColors } from "@/hooks/useColors";

function Divider() {
  const colors = useColors();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginVertical: 22,
      }}
    />
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View>
      <Text
        style={{
          color: colors.onBackground,
          fontFamily: "Inter_600SemiBold",
          fontSize: 14,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Text
      style={{
        color: colors.onSurface,
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        lineHeight: 22,
      }}
    >
      {children}
    </Text>
  );
}

export default function AboutScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <PoulinaLogo size={80} />
        <Text
          style={{
            color: colors.onBackground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 22,
            marginTop: 14,
            textAlign: "center",
          }}
        >
          Poulina AI OpsHub
        </Text>
        <Text
          style={{
            color: "#9d9d9d",
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          v1.0.0
        </Text>
      </View>

      <Divider />

      <Section title="About">
        <Body>
          Poulina AI OpsHub is an enterprise-grade infrastructure monitoring
          and AI-powered incident management platform built for Poulina Group
          operations teams.
        </Body>
      </Section>

      <Divider />

      <Section title="Technology">
        <Body>Built with React Native &amp; Expo</Body>
        <Body>Powered by Zabbix API v7.x</Body>
        <Body>AI by Claude (Anthropic)</Body>
      </Section>

      <Divider />

      <View style={styles.footer}>
        <Text
          style={{
            color: "#9d9d9d",
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          © 2026 Poulina Group
        </Text>
        <Text
          style={{
            color: "#9d9d9d",
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            textAlign: "center",
            marginTop: 2,
          }}
        >
          All rights reserved
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  footer: {
    alignItems: "center",
    paddingTop: 4,
  },
});
