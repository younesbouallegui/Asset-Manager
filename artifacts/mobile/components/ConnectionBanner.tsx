import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

export function ConnectionBanner({
  visible,
  onDismiss,
  variant = "lost",
}: {
  visible: boolean;
  onDismiss?: () => void;
  variant?: "lost" | "offline";
}) {
  const colors = useColors();
  const [show, setShow] = useState(visible);

  React.useEffect(() => {
    setShow(visible);
  }, [visible]);

  if (!show) return null;

  const isLost = variant === "lost";
  const bg = isLost ? colors.severityHigh : colors.mutedForeground;
  const label = isLost
    ? "Connection lost — retrying…"
    : "Offline — showing cached data";
  const icon = isLost ? "wifi-off" : "cloud-off";

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.banner, { backgroundColor: bg }]}
    >
      <Feather name={icon} size={16} color="#ffffff" />
      <Text
        style={[styles.text, { fontFamily: "Inter_500Medium" }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Pressable
        hitSlop={10}
        onPress={() => {
          setShow(false);
          onDismiss?.();
        }}
      >
        <Feather name="x" size={16} color="#ffffff" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: { color: "#ffffff", fontSize: 13, flex: 1 },
});
