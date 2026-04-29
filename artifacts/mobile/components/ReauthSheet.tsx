import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

import { Input } from "./Input";
import { PrimaryButton } from "./PrimaryButton";

export function ReauthSheet() {
  const colors = useColors();
  const { needsReauth, session, reauthenticate, clearReauth, logout } =
    useAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reauthenticate(password);
      setPassword("");
    } catch {
      setError("Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={needsReauth}
      transparent
      animationType="fade"
      onRequestClose={clearReauth}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.center}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.header}>
              <View
                style={[
                  styles.icon,
                  { backgroundColor: "rgba(229,57,53,0.10)" },
                ]}
              >
                <Feather name="lock" size={20} color={colors.severityHigh} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.onSurface,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 18,
                  }}
                >
                  Session expired
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  Re-enter your password to continue.
                </Text>
              </View>
            </View>

            <Input
              value={session?.username ?? ""}
              editable={false}
              leftIcon="user"
            />
            <View style={{ height: 12 }} />
            <Input
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError(null);
              }}
              placeholder="Password"
              secureTextEntry
              leftIcon="lock"
              autoFocus
            />

            {error ? (
              <Text
                style={{
                  color: colors.severityHigh,
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                  marginTop: 10,
                }}
              >
                {error}
              </Text>
            ) : null}

            <View style={{ height: 16 }} />
            <PrimaryButton
              label="Unlock"
              onPress={onSubmit}
              loading={submitting}
            />

            <Pressable
              style={{ alignSelf: "center", marginTop: 14 }}
              onPress={async () => {
                clearReauth();
                await logout();
              }}
            >
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                }}
              >
                Sign out instead
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  center: { paddingHorizontal: 16, paddingBottom: 32 },
  sheet: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
