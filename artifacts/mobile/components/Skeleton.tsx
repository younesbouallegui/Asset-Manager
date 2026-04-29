import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

export function Skeleton({
  width = "100%",
  height = 14,
  radius = 8,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
}) {
  const colors = useColors();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [t]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -120 + t.value * 240 }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.skeletonBase,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmerWrap, shimmerStyle]}>
        <LinearGradient
          colors={[
            "transparent",
            colors.skeletonHighlight,
            "transparent",
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmer}
        />
      </Animated.View>
    </View>
  );
}

export function SkeletonCard() {
  const colors = useColors();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: colors.radius,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
      }}
    >
      <Skeleton width={"40%"} height={12} style={{ marginBottom: 12 }} />
      <Skeleton width={"85%"} height={16} style={{ marginBottom: 8 }} />
      <Skeleton width={"55%"} height={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  shimmerWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 120,
  },
  shimmer: {
    flex: 1,
  },
});
