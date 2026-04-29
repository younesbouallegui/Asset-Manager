import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  style,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { label: string; value: T }[];
  style?: ViewStyle | ViewStyle[];
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor:
            colors.scheme === "dark"
              ? "rgba(74,144,217,0.08)"
              : "rgba(15,25,35,0.04)",
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.seg,
              active && {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                color: active ? colors.primaryForeground : colors.onSurface,
                fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                fontSize: 13,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  seg: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
