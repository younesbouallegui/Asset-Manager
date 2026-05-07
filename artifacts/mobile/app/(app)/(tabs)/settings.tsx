import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { SectionHeader } from "@/components/SectionHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeMode } from "@/contexts/ThemeContext";
import { ConnectionStatus, useZabbixConfig } from "@/contexts/ZabbixConfigContext";
import { useColors } from "@/hooks/useColors";

type FeatherIcon = React.ComponentProps<typeof Feather>["name"];

function Row({
  icon,
  label,
  hint,
  onPress,
  right,
  tint,
}: {
  icon: FeatherIcon;
  label: string;
  hint?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  tint?: string;
}) {
  const colors = useColors();
  const accent = tint ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ opacity: pressed && onPress ? 0.6 : 1 })}
    >
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: `${accent}1A` }]}>
          <Feather name={icon} size={16} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.onSurface, fontFamily: "Inter_500Medium", fontSize: 15 }}>
            {label}
          </Text>
          {hint ? (
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
              {hint}
            </Text>
          ) : null}
        </View>
        {right ?? (onPress ? <Feather name="chevron-right" size={18} color={colors.mutedForeground} /> : null)}
      </View>
    </Pressable>
  );
}

function ZabbixStatusBadge({ status }: { status: ConnectionStatus }) {
  const colors = useColors();
  const config: Record<ConnectionStatus, { color: string; label: string }> = {
    connected: { color: colors.success, label: "LIVE" },
    disconnected: { color: colors.severityHigh, label: "OFFLINE" },
    not_configured: { color: colors.mutedForeground, label: "SETUP" },
    testing: { color: colors.severityAverage, label: "TESTING" },
  };
  const { color, label } = config[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}1A` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={{ color, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.4 }}>
        {label}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { mode } = useThemeMode();
  const { session, logout } = useAuth();
  const zabbix = useZabbixConfig();

  const tabPad = (Platform.OS === "web" ? 84 : 56 + insets.bottom) + 16;
  const headerTopPad = isWeb ? 67 + 12 : insets.top + 8;

  const [pushNotifs, setPushNotifs] = React.useState(true);
  const [emailDigest, setEmailDigest] = React.useState(false);
  const [biometric, setBiometric] = React.useState(true);

  const themeLabel =
    mode === "system" ? "Match system" : mode === "dark" ? "Dark" : "Light";

  const onSignOut = () => {
    if (Platform.OS === "web") {
      logout().then(() => router.replace("/login"));
      return;
    }
    Alert.alert("Sign out", "You will be returned to the sign-in screen.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const initials = (session?.displayName ?? "U")
    .split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const zabbixHint =
    zabbix.status === "connected"
      ? `Connected · Zabbix v${zabbix.zabbixVersion}`
      : zabbix.status === "disconnected"
        ? "Disconnected · tap to configure"
        : zabbix.serverUrl
          ? "URL configured · API token needed"
          : "Tap to configure Zabbix";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: headerTopPad, paddingBottom: tabPad }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ color: colors.onBackground, fontFamily: "Inter_700Bold", fontSize: 28 }}>
        Settings
      </Text>
      <View style={{ height: 18 }} />

      <Card style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
            {initials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
            {session?.displayName ?? "Operator"}
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 }}>
            {session?.username ?? "operator"}@poulina-group.com
          </Text>
          <View style={[styles.roleChip, { backgroundColor: `${colors.primary}1A` }]}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.4 }}>
              {(session?.role ?? "Admin").toUpperCase()}
            </Text>
          </View>
        </View>
      </Card>

      <View style={{ height: 22 }} />
      <SectionHeader title="Account" />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row
          icon="users"
          label="User management"
          hint="Manage roles and access"
          onPress={() => router.push("/(app)/settings/users")}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row
          icon="bar-chart-2"
          label="Reports"
          hint="Weekly performance summaries"
          onPress={() => router.push("/(app)/reports")}
          tint={colors.severityInfo}
        />
      </Card>

      <View style={{ height: 22 }} />
      <SectionHeader title="Preferences" />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row
          icon="moon"
          label="Appearance"
          hint={themeLabel}
          onPress={() => router.push("/(app)/settings/appearance")}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row
          icon="bell"
          label="Push notifications"
          hint="Real-time incident alerts"
          right={
            <Switch
              value={pushNotifs}
              onValueChange={setPushNotifs}
              trackColor={{ false: "#e0e0e0", true: colors.primary }}
              thumbColor="#ffffff"
              ios_backgroundColor="#e0e0e0"
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row
          icon="mail"
          label="Email digest"
          hint="Daily summary at 8:00"
          right={
            <Switch
              value={emailDigest}
              onValueChange={setEmailDigest}
              trackColor={{ false: "#e0e0e0", true: colors.primary }}
              thumbColor="#ffffff"
              ios_backgroundColor="#e0e0e0"
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row
          icon="shield"
          label="Biometric unlock"
          hint="Face ID / fingerprint"
          right={
            <Switch
              value={biometric}
              onValueChange={setBiometric}
              trackColor={{ false: "#e0e0e0", true: colors.primary }}
              thumbColor="#ffffff"
              ios_backgroundColor="#e0e0e0"
            />
          }
        />
      </Card>

      <View style={{ height: 22 }} />
      <SectionHeader title="Integrations" />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row
          icon="link"
          label="Zabbix Connection"
          hint={zabbixHint}
          onPress={() => router.push("/(app)/settings/zabbix")}
          right={<ZabbixStatusBadge status={zabbix.status} />}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row
          icon="cpu"
          label="AI Configuration"
          hint="Anthropic Claude · ChatOps AI"
          onPress={() => router.push("/(app)/settings/ai-config")}
          tint={colors.accent}
        />
      </Card>

      <View style={{ height: 22 }} />
      <SectionHeader title="System" />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <Row
          icon="info"
          label="About OpsHub"
          hint="v1.0.0 · Poulina Group"
          onPress={() => router.push("/(app)/settings/about")}
          tint={colors.mutedForeground}
        />
      </Card>

      <View style={{ height: 22 }} />
      <Pressable onPress={onSignOut}>
        <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderColor: colors.severityHigh }}>
          <Feather name="log-out" size={16} color={colors.severityHigh} />
          <Text style={{ color: colors.severityHigh, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
            Sign out
          </Text>
        </Card>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  roleChip: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
});
