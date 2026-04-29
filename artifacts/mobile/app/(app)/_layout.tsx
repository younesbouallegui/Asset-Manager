import { Redirect, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { ConnectionBanner } from "@/components/ConnectionBanner";
import { ReauthSheet } from "@/components/ReauthSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useColors, useResolvedScheme } from "@/hooks/useColors";

export default function AppLayout() {
  const colors = useColors();
  const scheme = useResolvedScheme();
  const { ready, isAuthenticated } = useAuth();
  const isWeb = Platform.OS === "web";

  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    // Demo: show "connection lost" once after 8s, then auto-hide.
    const t1 = setTimeout(() => setBannerVisible(true), 8000);
    const t2 = setTimeout(() => setBannerVisible(false), 13000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Animated.View
        key={scheme}
        entering={FadeIn.duration(300)}
        style={styles.fill}
      >
        {!isWeb ? (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50 }}>
            <ConnectionBanner
              visible={bannerVisible}
              onDismiss={() => setBannerVisible(false)}
            />
          </View>
        ) : null}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "fade",
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="incidents/[id]"
            options={{
              headerShown: true,
              title: "Incident",
              headerStyle: { backgroundColor: colors.background },
              headerTitleStyle: {
                color: colors.onBackground,
                fontFamily: "Inter_600SemiBold",
              },
              headerTintColor: colors.primary,
            }}
          />
          <Stack.Screen
            name="infrastructure/hosts/[id]"
            options={{
              headerShown: true,
              title: "Host",
              headerStyle: { backgroundColor: colors.background },
              headerTitleStyle: {
                color: colors.onBackground,
                fontFamily: "Inter_600SemiBold",
              },
              headerTintColor: colors.primary,
            }}
          />
          <Stack.Screen
            name="reports"
            options={{
              headerShown: true,
              title: "Reports",
              headerStyle: { backgroundColor: colors.background },
              headerTitleStyle: {
                color: colors.onBackground,
                fontFamily: "Inter_600SemiBold",
              },
              headerTintColor: colors.primary,
            }}
          />
          <Stack.Screen
            name="settings/users"
            options={{
              headerShown: true,
              title: "User management",
              headerStyle: { backgroundColor: colors.background },
              headerTitleStyle: {
                color: colors.onBackground,
                fontFamily: "Inter_600SemiBold",
              },
              headerTintColor: colors.primary,
            }}
          />
          <Stack.Screen
            name="settings/appearance"
            options={{
              headerShown: true,
              title: "Appearance",
              headerStyle: { backgroundColor: colors.background },
              headerTitleStyle: {
                color: colors.onBackground,
                fontFamily: "Inter_600SemiBold",
              },
              headerTintColor: colors.primary,
            }}
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
