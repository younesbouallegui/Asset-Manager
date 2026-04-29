import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function SectionHeader({
  title,
  actionLabel,
  onActionPress,
}: {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.title,
          { color: colors.onBackground, fontFamily: "Inter_600SemiBold" },
        ]}
      >
        {title}
      </Text>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text
            style={[
              styles.action,
              { color: colors.primary, fontFamily: "Inter_500Medium" },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 22 },
  action: { fontSize: 14 },
});
