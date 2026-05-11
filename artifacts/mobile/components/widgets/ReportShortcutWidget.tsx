import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";

export function ReportShortcutWidget() {
  const colors = useColors();
  return (
    <Pressable onPress={() => router.push("/(app)/reports")}>
      <Card style={styles.card}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor:
                colors.scheme === "dark"
                  ? "rgba(66,165,245,0.14)"
                  : "rgba(66,165,245,0.10)",
            },
          ]}
        >
          <MaterialCommunityIcons
            name="chart-areaspline"
            size={22}
            color={colors.severityInfo}
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
            Performance report
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              marginTop: 2,
            }}
          >
            MTTR, availability and incident trends
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
