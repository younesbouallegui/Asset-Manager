import { Stack } from "expo-router";
import React from "react";

import { useColors } from "@/hooks/useColors";

export default function GraphsLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: {
          color: colors.onBackground,
          fontFamily: "Inter_600SemiBold",
        },
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Graph Explorer" }} />
      <Stack.Screen name="[hostId]" options={{ title: "Host Metrics" }} />
    </Stack>
  );
}
