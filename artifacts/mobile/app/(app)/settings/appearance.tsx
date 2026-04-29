import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Card } from "@/components/Card";
import { SectionHeader } from "@/components/SectionHeader";
import { useThemeMode, ThemeMode } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/useColors";

type FeatherIcon = React.ComponentProps<typeof Feather>["name"];

const OPTIONS: { value: ThemeMode; label: string; hint: string; icon: FeatherIcon }[] = [
  { value: "system", label: "Match system", hint: "Follow device setting", icon: "smartphone" },
  { value: "light", label: "Light", hint: "Bright control room", icon: "sun" },
  { value: "dark", label: "Dark", hint: "Low-light operations", icon: "moon" },
];

export default function AppearanceScreen() {
  const colors = useColors();
  const { mode, setMode } = useThemeMode();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
    >
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_400Regular",
          fontSize: 13,
          marginBottom: 8,
        }}
      >
        Choose how OpsHub looks. Your selection is saved on this device.
      </Text>

      <View style={{ height: 12 }} />
      <SectionHeader title="Theme" />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {OPTIONS.map((opt, idx) => {
          const active = mode === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setMode(opt.value)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <View style={styles.row}>
                <View
                  style={[
                    styles.iconBubble,
                    {
                      backgroundColor: active
                        ? colors.primary
                        : `${colors.primary}1A`,
                    },
                  ]}
                >
                  <Feather
                    name={opt.icon}
                    size={16}
                    color={active ? colors.primaryForeground : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.onSurface,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                    }}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {opt.hint}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {active ? (
                    <View
                      style={[styles.radioDot, { backgroundColor: colors.primary }]}
                    />
                  ) : null}
                </View>
              </View>
              {idx < OPTIONS.length - 1 ? (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: colors.border },
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </Card>

      <View style={{ height: 22 }} />
      <SectionHeader title="Preview" />
      <Card>
        <Text
          style={{
            color: colors.onSurface,
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
          }}
        >
          Operational dashboard
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            marginTop: 4,
          }}
        >
          The Poulina brand color stays consistent across both themes.
        </Text>
        <View style={{ height: 14 }} />
        <View style={styles.swatches}>
          {[
            colors.primary,
            colors.severityHigh,
            colors.severityAverage,
            colors.severityInfo,
            colors.success,
          ].map((c) => (
            <View
              key={c}
              style={[styles.swatch, { backgroundColor: c }]}
            />
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  swatches: {
    flexDirection: "row",
    gap: 8,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
});
