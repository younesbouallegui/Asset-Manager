import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { Severity } from "@/services/mockData";

const palette = {
  DISASTER: { bg: "#b71c1c", fg: "#ffffff" },
  HIGH: { bg: "#e53935", fg: "#ffffff" },
  AVERAGE: { bg: "#ff9800", fg: "#ffffff" },
  WARNING: { bg: "#fdd835", fg: "#0f1923" },
  INFO: { bg: "#42a5f5", fg: "#ffffff" },
  OK: { bg: "#43a047", fg: "#ffffff" },
} as const;

export function SeverityBadge({
  severity,
  count,
  compact,
}: {
  severity: Severity;
  count?: number;
  compact?: boolean;
}) {
  const _colors = useColors();
  void _colors;
  const tone = palette[severity];
  const scale = useSharedValue(1);

  useEffect(() => {
    if (severity === "DISASTER") {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    }
  }, [scale, severity]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.pill,
        {
          backgroundColor: tone.bg,
          paddingHorizontal: compact ? 8 : 10,
          paddingVertical: compact ? 3 : 4,
        },
        animated,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: tone.fg,
            fontFamily: "Inter_600SemiBold",
            fontSize: compact ? 10 : 11,
          },
        ]}
      >
        {severity}
        {typeof count === "number" ? `  ${count}` : ""}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  text: {
    letterSpacing: 0.6,
  },
});
