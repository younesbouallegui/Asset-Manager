import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PoulinaLogo } from "@/components/PoulinaLogo";
import { Input } from "@/components/Input";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shake = useSharedValue(0);

  const triggerShake = () => {
    shake.value = withSequence(
      withTiming(-10, { duration: 60, easing: Easing.linear }),
      withTiming(10, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  };

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const onSubmit = async () => {
    if (submitting) return;
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      triggerShake();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password, remember);
      router.replace("/(app)/(tabs)");
    } catch {
      setError("Invalid credentials");
      triggerShake();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: (isWeb ? 67 : insets.top) + 24,
          paddingBottom: (isWeb ? 34 : insets.bottom) + 24,
        },
      ]}
      bottomOffset={32}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brandWrap}>
        <PoulinaLogo size={100} />
        <Text
          style={[
            styles.title,
            { color: colors.onBackground, fontFamily: "Inter_700Bold" },
          ]}
        >
          Poulina AI OpsHub
        </Text>
        <Text
          style={[
            styles.welcome,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          Welcome back. Sign in to your control room.
        </Text>
      </View>

      <Animated.View style={[styles.form, animated]}>
        <Input
          value={username}
          onChangeText={(t) => {
            setUsername(t);
            if (error) setError(null);
          }}
          leftIcon="user"
          placeholder="Username"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
        />
        <View style={{ height: 12 }} />
        <Input
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (error) setError(null);
          }}
          leftIcon="lock"
          rightIcon={showPwd ? "eye-off" : "eye"}
          onRightIconPress={() => setShowPwd((v) => !v)}
          placeholder="Password"
          secureTextEntry={!showPwd}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
        />

        <Pressable
          style={styles.rememberRow}
          onPress={() => setRemember((v) => !v)}
          hitSlop={6}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: remember ? colors.primary : colors.border,
                backgroundColor: remember ? colors.primary : "transparent",
              },
            ]}
          >
            {remember ? (
              <Feather name="check" size={14} color="#ffffff" />
            ) : null}
          </View>
          <Text
            style={{
              color: colors.onSurface,
              fontFamily: "Inter_500Medium",
              fontSize: 14,
            }}
          >
            Remember me for 30 days
          </Text>
        </Pressable>

        <View style={{ height: 16 }} />
        <PrimaryButton
          label="Sign in"
          onPress={onSubmit}
          loading={submitting}
        />

        {error ? (
          <View style={styles.errorRow}>
            <Feather name="alert-triangle" size={14} color={colors.error} />
            <Text
              style={{
                color: colors.error,
                fontFamily: "Inter_500Medium",
                fontSize: 13,
              }}
            >
              {error}
            </Text>
          </View>
        ) : null}
      </Animated.View>

      <View style={styles.footer}>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 12,
          }}
        >
          v1.0.0 · Poulina Group
        </Text>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  brandWrap: {
    alignItems: "center",
    gap: 12,
    marginTop: 24,
  },
  title: {
    fontSize: 24,
    marginTop: 12,
  },
  welcome: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  form: {
    width: "100%",
    marginTop: 36,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    justifyContent: "center",
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
  },
});
