import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "destructive" | "ghost";
  style?: ViewStyle | ViewStyle[];
}) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "destructive"
        ? colors.destructive
        : "transparent";
  const fg =
    variant === "ghost" ? colors.primary : colors.primaryForeground;
  const border = variant === "ghost" ? colors.primary : "transparent";

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: loading || disabled ? 0.7 : 1,
  }));

  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 120 });
        }}
        onPress={() => {
          if (loading || disabled) return;
          if (Platform.OS !== "web") {
            Haptics.selectionAsync().catch(() => {});
          }
          onPress();
        }}
        style={[
          styles.btn,
          {
            backgroundColor: bg,
            borderColor: border,
            borderWidth: variant === "ghost" ? 1 : 0,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <Text
            style={{
              color: fg,
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
            }}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
});
