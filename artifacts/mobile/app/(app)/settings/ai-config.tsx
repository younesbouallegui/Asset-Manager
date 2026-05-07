import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Card } from "@/components/Card";
import { SectionHeader } from "@/components/SectionHeader";
import { useColors } from "@/hooks/useColors";
import { getAnthropicKey, saveAnthropicKey, sendClaude } from "@/services/dataService";

export default function AiConfigScreen() {
  const colors = useColors();
  const [apiKey, setApiKeyState] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAnthropicKey().then((k) => { if (k) setApiKeyState(k); });
  }, []);

  const save = async () => {
    await saveAnthropicKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const test = async () => {
    if (!apiKey.trim()) {
      setTestResult({ ok: false, message: "Enter an API key first" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await save();
      const reply = await sendClaude(
        apiKey.trim(),
        [{ role: "user", content: "Reply with exactly: OK" }],
        "You are a test assistant.",
      );
      setTestResult({ ok: true, message: `Connected — Model: claude-sonnet-4-20250514` });
      void reply;
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "INVALID_API_KEY") {
        setTestResult({ ok: false, message: "Invalid API key" });
      } else if (msg === "RATE_LIMIT") {
        setTestResult({ ok: true, message: "Key valid (rate limited)" });
      } else {
        setTestResult({ ok: false, message: "Cannot reach Anthropic API" });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_400Regular",
          fontSize: 13,
          lineHeight: 19,
          marginBottom: 20,
        }}
      >
        Configure your Anthropic API key to enable AI-powered incident analysis and ChatOps.
      </Text>

      <SectionHeader title="API Key" />
      <Card style={{ gap: 4 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Anthropic API Key
        </Text>
        <View style={{ position: "relative" }}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.onSurface,
                backgroundColor: colors.background,
                borderColor: colors.border,
                paddingRight: 44,
              },
            ]}
            value={apiKey}
            onChangeText={(v) => { setApiKeyState(v); setTestResult(null); setSaved(false); }}
            placeholder="sk-ant-…"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={() => setShowKey((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={8}
          >
            <Feather
              name={showKey ? "eye-off" : "eye"}
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>
      </Card>

      <View style={{ height: 14 }} />
      <SectionHeader title="Model" />
      <Card>
        <View style={styles.modelRow}>
          <View style={[styles.modelIcon, { backgroundColor: `${colors.primary}14` }]}>
            <Feather name="cpu" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.onSurface,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              claude-sonnet-4-20250514
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Anthropic · Read-only
            </Text>
          </View>
        </View>
      </Card>

      {testResult ? <View style={{ height: 12 }} /> : null}
      {testResult ? (
        <Card
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: testResult.ok ? `${colors.success}14` : `${colors.severityHigh}14`,
            borderColor: testResult.ok ? colors.success : colors.severityHigh,
          }}
        >
          <Feather
            name={testResult.ok ? "check-circle" : "x-circle"}
            size={18}
            color={testResult.ok ? colors.success : colors.severityHigh}
          />
          <Text
            style={{
              color: testResult.ok ? colors.success : colors.severityHigh,
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              flex: 1,
            }}
          >
            {testResult.message}
          </Text>
        </Card>
      ) : null}

      <View style={{ height: 20 }} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={save}
          style={({ pressed }) => [
            styles.btn,
            {
              flex: 1,
              backgroundColor: saved ? colors.success : colors.surface,
              borderColor: saved ? colors.success : colors.border,
              borderWidth: 1,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather
            name={saved ? "check" : "save"}
            size={15}
            color={saved ? "#fff" : colors.onSurface}
          />
          <Text
            style={{
              color: saved ? "#fff" : colors.onSurface,
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
            }}
          >
            {saved ? "Saved" : "Save"}
          </Text>
        </Pressable>
        <Pressable
          onPress={test}
          disabled={testing}
          style={({ pressed }) => [
            styles.btn,
            { flex: 2, backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          {testing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="zap" size={15} color="#fff" />
          )}
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
            {testing ? "Testing…" : "Save & Test"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modelIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
});
