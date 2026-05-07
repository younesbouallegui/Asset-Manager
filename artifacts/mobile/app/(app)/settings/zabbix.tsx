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
import { useZabbixConfig } from "@/contexts/ZabbixConfigContext";
import { useColors } from "@/hooks/useColors";
import { formatRelative } from "@/services/dataService";

export default function ZabbixConnectionScreen() {
  const colors = useColors();
  const config = useZabbixConfig();

  const [serverUrl, setServerUrl] = useState(config.serverUrl);
  const [apiToken, setApiToken] = useState(config.apiToken);
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setServerUrl(config.serverUrl);
    setApiToken(config.apiToken);
  }, [config.serverUrl, config.apiToken]);

  const saveAndTest = async () => {
    setTestResult(null);
    await config.setServerUrl(serverUrl.trim());
    await config.setApiToken(apiToken.trim());
    setDirty(false);
    const result = await config.testConnection();
    setTestResult(result);
  };

  const statusColor =
    config.status === "connected"
      ? colors.success
      : config.status === "testing"
        ? colors.severityAverage
        : config.status === "disconnected"
          ? colors.severityHigh
          : colors.mutedForeground;

  const statusLabel =
    config.status === "connected"
      ? `Connected — Zabbix v${config.zabbixVersion}`
      : config.status === "testing"
        ? "Testing…"
        : config.status === "disconnected"
          ? "Disconnected"
          : "Not configured";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text
            style={{
              color: statusColor,
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              flex: 1,
            }}
          >
            {statusLabel}
          </Text>
          {config.status === "testing" ? (
            <ActivityIndicator size="small" color={colors.severityAverage} />
          ) : null}
        </View>
        {config.lastSync ? (
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              marginTop: 6,
              marginLeft: 20,
            }}
          >
            Last sync: {formatRelative(config.lastSync)}
          </Text>
        ) : null}
      </Card>

      <View style={{ height: 20 }} />
      <SectionHeader title="Server" />
      <Card style={{ gap: 4 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Server URL
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.onSurface,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
          value={serverUrl}
          onChangeText={(v) => { setServerUrl(v); setDirty(true); setTestResult(null); }}
          placeholder="http://192.168.100.4:8080"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </Card>

      <View style={{ height: 14 }} />
      <SectionHeader title="API Token" />
      <Card style={{ gap: 4 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          API Token
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
            value={apiToken}
            onChangeText={(v) => { setApiToken(v); setDirty(true); setTestResult(null); }}
            placeholder="Paste your Zabbix API token"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={() => setShowToken((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={8}
          >
            <Feather
              name={showToken ? "eye-off" : "eye"}
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 11,
            marginTop: 6,
          }}
        >
          Generate in Zabbix → Users → API tokens
        </Text>
      </Card>

      {testResult ? (
        <View style={{ height: 12 }} />
      ) : null}
      {testResult ? (
        <Card
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: testResult.ok
              ? `${colors.success}14`
              : `${colors.severityHigh}14`,
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
      <Pressable
        onPress={saveAndTest}
        disabled={config.status === "testing"}
        style={({ pressed }) => [
          styles.testBtn,
          {
            backgroundColor:
              config.status === "testing"
                ? colors.muted
                : colors.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {config.status === "testing" ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Feather name="wifi" size={16} color="#fff" />
        )}
        <Text
          style={{
            color: "#fff",
            fontFamily: "Inter_600SemiBold",
            fontSize: 15,
          }}
        >
          {dirty ? "Save & Test Connection" : "Test Connection"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    paddingVertical: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
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
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
  },
});
