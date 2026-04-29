import React from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

export function Card({
  children,
  style,
  glow = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  glow?: boolean;
}) {
  const colors = useColors();
  const isDark = colors.scheme === "dark";

  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: colors.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...(isDark
      ? {
          borderLeftWidth: glow ? 3 : 1,
          borderLeftColor: glow
            ? "rgba(74,144,217,0.55)"
            : (colors.border as string),
          ...Platform.select({
            ios: {
              shadowColor: colors.primary,
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
            },
            android: { elevation: 4 },
            default: {},
          }),
        }
      : Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          },
          android: { elevation: 2 },
          default: {
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
          },
        }) || {}),
  };

  return <View style={StyleSheet.flatten([base, style])}>{children}</View>;
}
