import { router } from "expo-router";
import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PoulinaLogo } from "@/components/PoulinaLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const MIN_SPLASH_MS = 2000;

export default function SplashRoute() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { ready, isAuthenticated } = useAuth();

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.92);
  const nameOpacity = useSharedValue(0);
  const nameTranslate = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const barProgress = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.inOut(Easing.quad),
    });
    logoScale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    nameOpacity.value = withDelay(450, withTiming(1, { duration: 500 }));
    nameTranslate.value = withDelay(
      450,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    taglineOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    barProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [
    barProgress,
    logoOpacity,
    logoScale,
    nameOpacity,
    nameTranslate,
    taglineOpacity,
  ]);

  useEffect(() => {
    if (!ready) return;
    const start = Date.now();
    const elapsed = Date.now() - start;
    const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace("/(app)/(tabs)");
      } else {
        router.replace("/login");
      }
    }, wait);
    return () => clearTimeout(timer);
  }, [ready, isAuthenticated]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameTranslate.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));
  const barStyle = useAnimatedStyle(() => ({
    width: `${30 + barProgress.value * 70}%`,
    opacity: 0.4 + barProgress.value * 0.6,
  }));

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.background,
          paddingTop: isWeb ? 67 : insets.top,
          paddingBottom: isWeb ? 34 : insets.bottom,
        },
      ]}
    >
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <PoulinaLogo size={140} />
        </Animated.View>
        <Animated.Text
          style={[
            styles.appName,
            { color: colors.onBackground, fontFamily: "Inter_600SemiBold" },
            nameStyle,
          ]}
        >
          Poulina AI OpsHub
        </Animated.Text>
        <Animated.Text
          style={[
            styles.tagline,
            { color: "#9d9d9d", fontFamily: "Inter_400Regular" },
            taglineStyle,
          ]}
        >
          Intelligent Infrastructure Monitoring
        </Animated.Text>
      </View>

      <View style={styles.bottom}>
        <View
          style={[
            styles.track,
            {
              backgroundColor:
                colors.scheme === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(15,25,35,0.06)",
            },
          ]}
        >
          <Animated.View
            style={[styles.bar, { backgroundColor: colors.primary }, barStyle]}
          />
        </View>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 11,
            marginTop: 12,
            letterSpacing: 0.6,
          }}
        >
          POULINA GROUP · v1.0.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  appName: {
    fontSize: 22,
    marginTop: 8,
  },
  tagline: {
    fontSize: 14,
    textAlign: "center",
  },
  bottom: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 24,
  },
  track: {
    width: "60%",
    height: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: {
    height: 4,
    borderRadius: 4,
  },
});
