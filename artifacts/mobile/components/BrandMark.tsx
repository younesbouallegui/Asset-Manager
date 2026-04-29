import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";

export function BrandMark({ size = 96 }: { size?: number }) {
  const inner = Math.round(size * 0.55);
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <LinearGradient
        colors={["#2c63b2", "#204e8f", "#16345f"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          StyleSheet.absoluteFillObject,
          { borderRadius: size / 4.2 },
        ]}
      />
      <MaterialCommunityIcons
        name="hexagon-multiple"
        size={inner}
        color="#ffffff"
      />
      <View
        style={[
          styles.gloss,
          {
            borderRadius: size / 4.2,
            width: size,
            height: size / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  gloss: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
