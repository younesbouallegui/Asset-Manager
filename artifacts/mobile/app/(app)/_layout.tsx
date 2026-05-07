import { Redirect, Stack } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { ReauthSheet } from "@/components/ReauthSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useColors, useResolvedScheme } from "@/hooks/useColors";

function screenOpts(colors: ReturnType<typeof useColors>) {
  return {
    headerShown: true,
    headerStyle: { backgroundColor: colors.background },
    headerTitleStyle: { color: colors.onBackground, fontFamily: "Inter_600SemiBold" },
    headerTintColor: colors.primary,
  } as const;
}

export default function AppLayout() {
  const colors = useColors();
  const scheme = useResolvedScheme();
  const { ready, isAuthenticated } = useAuth();

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Animated.View key={scheme} entering={FadeIn.duration(300)} style={styles.fill}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: Platform.OS === "web" ? "none" : "fade",
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="incidents/[id]"
            options={{ ...screenOpts(colors), title: "Incident" }}
          />
          <Stack.Screen
            name="infrastructure/hosts/[id]"
            options={{ ...screenOpts(colors), title: "Host" }}
          />
          <Stack.Screen
            name="reports"
            options={{ ...screenOpts(colors), title: "Reports" }}
          />
          <Stack.Screen
            name="settings/users"
            options={{ ...screenOpts(colors), title: "User management" }}
          />
          <Stack.Screen
            name="settings/appearance"
            options={{ ...screenOpts(colors), title: "Appearance" }}
          />
          <Stack.Screen
            name="settings/about"
            options={{ ...screenOpts(colors), title: "About OpsHub" }}
          />
          <Stack.Screen
            name="settings/zabbix"
            options={{ ...screenOpts(colors), title: "Zabbix Connection" }}
          />
          <Stack.Screen
            name="settings/ai-config"
            options={{ ...screenOpts(colors), title: "AI Configuration" }}
          />
        </Stack>
      </Animated.View>
      <ReauthSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
