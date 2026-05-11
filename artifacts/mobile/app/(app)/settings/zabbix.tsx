import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useZabbixConfig } from "@/contexts/ZabbixConfigContext";
import { useColors } from "@/hooks/useColors";
import { formatRelative } from "@/services/dataService";
import { formatBytes, formatUptime } from "@/services/zabbix/MetricDiscovery";

const DEBOUNCE_MS = 1500;

function StatusBadge({
  status,
  version,
  onReconnect,
}: {
  status: string;
  version: string;
  onReconnect: () => void;
}) {
  const colors = useColors();
  const isConnected = status === "connected";
  const isTesting = status === "testing";
  const isDisconnected = status === "disconnected";
  const isNotConfigured = status === "not_configured";

  const color = isConnected
    ? colors.success
    : isTesting
      ? colors.severityAverage
      : isDisconnected
        ? colors.severityHigh
        : colors.mutedForeground;

  const label = isConnected
    ? `Connected  ·  Zabbix v${version}`
    : isTesting
      ? "Verifying connection…"
      : isDisconnected
        ? "Connection failed"
        : "Not configured";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}12`,
          borderColor: `${color}40`,
        },
      ]}
    >
      {isTesting ? (
        <ActivityIndicator size={12} color={color} />
      ) : (
        <View style={[styles.badgeDot, { backgroundColor: color }]} />
      )}
      <Text style={[styles.badgeLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
      {(isConnected || isDisconnected) && (
        <Pressable onPress={onReconnect} hitSlop={8} style={styles.reconnectBtn}>
          <Feather name="refresh-cw" size={13} color={color} />
        </Pressable>
      )}
    </View>
  );
}

function InfoPanel({
  hostCount,
  problemCount,
  lastSync,
}: {
  hostCount: number | null;
  problemCount: number | null;
  lastSync: number | null;
}) {
  const colors = useColors();
  if (hostCount === null && problemCount === null) return null;

  return (
    <View style={styles.infoPanel}>
      <View style={styles.infoItem}>
        <Feather name="server" size={14} color={colors.primary} />
        <Text style={[styles.infoValue, { color: colors.onSurface }]}>
          {hostCount ?? "—"}
        </Text>
        <Text style={[styles.infoKey, { color: colors.mutedForeground }]}>
          Hosts
        </Text>
      </View>
      <View style={[styles.infoDiv, { backgroundColor: colors.border }]} />
      <View style={styles.infoItem}>
        <Feather name="alert-triangle" size={14} color={colors.severityHigh} />
        <Text style={[styles.infoValue, { color: colors.onSurface }]}>
          {problemCount ?? "—"}
        </Text>
        <Text style={[styles.infoKey, { color: colors.mutedForeground }]}>
          Problems
        </Text>
      </View>
      {lastSync ? (
        <>
          <View style={[styles.infoDiv, { backgroundColor: colors.border }]} />
          <View style={styles.infoItem}>
            <Feather name="clock" size={14} color={colors.mutedForeground} />
            <Text style={[styles.infoKey, { color: colors.mutedForeground }]}>
              {formatRelative(lastSync)}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function ErrorHint({ status, message }: { status: string; message: string }) {
  const colors = useColors();
  if (status !== "disconnected" || !message) return null;
  const hints: Record<string, string> = {
    "Invalid API token": "Go to Zabbix → Users → API tokens and generate a new token.",
    "Cannot reach server": "Check the server URL — must be reachable over HTTPS.",
    "Connection timed out": "The server URL might be incorrect or the server is unreachable.",
    "Server URL not found": "Check the URL path — should end in your Zabbix domain.",
    "Insufficient permissions": "The API token may lack read permissions.",
  };
  const hint = hints[message];
  return (
    <Card
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: `${colors.severityHigh}10`,
        borderColor: `${colors.severityHigh}30`,
        marginBottom: 0,
      }}
    >
      <Feather name="x-circle" size={16} color={colors.severityHigh} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.severityHigh, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
          {message}
        </Text>
        {hint ? (
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 }}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export default function ZabbixConnectionScreen() {
  const colors = useColors();
  const config = useZabbixConfig();

  const [serverUrl, setServerUrlLocal] = useState(config.serverUrl);
  const [apiToken, setApiTokenLocal] = useState(config.apiToken);
  const [showToken, setShowToken] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setServerUrlLocal(config.serverUrl);
    setApiTokenLocal(config.apiToken);
  }, [config.serverUrl, config.apiToken]);

  const scheduleAutoConnect = useCallback(
    (url: string, token: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!url.trim() || !token.trim()) return;
      debounceRef.current = setTimeout(async () => {
        setErrorMessage("");
        const result = await config.testConnection();
        if (!result.ok) setErrorMessage(result.message);
      }, DEBOUNCE_MS);
    },
    [config],
  );

  const handleUrlChange = useCallback(
    (v: string) => {
      setServerUrlLocal(v);
      setErrorMessage("");
      // Save immediately (debounced 400ms)
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(() => config.setServerUrl(v.trim()), 400);
      scheduleAutoConnect(v, apiToken);
    },
    [apiToken, config, scheduleAutoConnect],
  );

  const handleTokenChange = useCallback(
    (v: string) => {
      setApiTokenLocal(v);
      setErrorMessage("");
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(() => config.setApiToken(v.trim()), 400);
      scheduleAutoConnect(serverUrl, v);
    },
    [serverUrl, config, scheduleAutoConnect],
  );

  const reconnect = useCallback(async () => {
    setErrorMessage("");
    const result = await config.testConnection();
    if (!result.ok) setErrorMessage(result.message);
  }, [config]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Live status badge */}
      <StatusBadge
        status={config.status}
        version={config.zabbixVersion}
        onReconnect={reconnect}
      />

      {/* Connected info panel */}
      {config.status === "connected" && (
        <Card style={{ marginTop: 14, padding: 14 }}>
          <InfoPanel
            hostCount={config.hostCount}
            problemCount={config.problemCount}
            lastSync={config.lastSync}
          />
        </Card>
      )}

      {/* Error hint */}
      {config.status === "disconnected" && errorMessage ? (
        <View style={{ marginTop: 14 }}>
          <ErrorHint status={config.status} message={errorMessage} />
        </View>
      ) : null}

      <View style={{ height: 24 }} />

      {/* Server URL */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        SERVER URL
      </Text>
      <Card style={{ gap: 6, padding: 14 }}>
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Feather name="globe" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.inputField, { color: colors.onSurface }]}
            value={serverUrl}
            onChangeText={handleUrlChange}
            placeholder="https://zabbix.example.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {config.status === "testing" && (
            <ActivityIndicator size={14} color={colors.primary} style={{ marginLeft: 8 }} />
          )}
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Your public Zabbix server URL — HTTPS recommended
        </Text>
      </Card>

      <View style={{ height: 16 }} />

      {/* API Token */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        API TOKEN
      </Text>
      <Card style={{ gap: 6, padding: 14 }}>
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Feather name="key" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.inputField, { color: colors.onSurface }]}
            value={apiToken}
            onChangeText={handleTokenChange}
            placeholder="Paste your API token"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable onPress={() => setShowToken((v) => !v)} hitSlop={8}>
            <Feather
              name={showToken ? "eye-off" : "eye"}
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Zabbix → Administration → API tokens → Create token
        </Text>
      </Card>

      <View style={{ height: 20 }} />

      {/* Auto-connect note */}
      <View style={[styles.autoNote, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
        <Feather name="zap" size={14} color={colors.primary} />
        <Text style={[styles.autoNoteText, { color: colors.mutedForeground }]}>
          Connection is verified automatically as you type. No manual action needed.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  reconnectBtn: { padding: 4 },
  infoPanel: { flexDirection: "row", alignItems: "center", gap: 0 },
  infoItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  infoDiv: { width: 1, height: 32 },
  infoValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  infoKey: { fontFamily: "Inter_400Regular", fontSize: 12 },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputField: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  autoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  autoNoteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
