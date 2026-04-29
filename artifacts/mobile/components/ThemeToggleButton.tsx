import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, StyleSheet } from "react-native";

import { useThemeMode } from "@/contexts/ThemeContext";
import { useColors, useResolvedScheme } from "@/hooks/useColors";

export function ThemeToggleButton() {
  const colors = useColors();
  const scheme = useResolvedScheme();
  const { setMode } = useThemeMode();

  const onPress = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setMode(scheme === "dark" ? "light" : "dark");
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor:
            colors.scheme === "dark"
              ? "rgba(74,144,217,0.10)"
              : "rgba(32,78,143,0.06)",
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Feather
        name={scheme === "dark" ? "sun" : "moon"}
        size={18}
        color={colors.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
