import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/components/Card";
import { useColors } from "@/hooks/useColors";
import {
  getAnthropicKey,
  getDashboardStats,
  getIncidents,
  Incident,
  LiveDashboardStats,
  sendClaude,
} from "@/services/dataService";

type Msg = {
  id: string;
  role: "user" | "agent";
  text: string;
  ts: number;
  error?: boolean;
};

const QUICK = [
  "Summarize current incidents",
  "Which hosts have the most alerts?",
  "How do I reduce MTTR?",
];

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function buildSystemPrompt(stats: LiveDashboardStats | null, incidents: Incident[]): string {
  const last5 = incidents
    .slice(0, 5)
    .map((i) => `  - [${i.severity}] ${i.title} on ${i.host || "unknown"}`)
    .join("\n");

  return `You are Poulina AI, expert DevOps and infrastructure assistant for Poulina Group operations team.

Current Zabbix infrastructure status:
- Active incidents: ${stats?.activeIncidents ?? "unknown"}
- Hosts online: ${stats?.hostsUp ?? "unknown"}/${stats?.totalHosts ?? "unknown"}
- Disaster alerts: ${stats?.severityCounts?.DISASTER ?? 0}
- High alerts: ${stats?.severityCounts?.HIGH ?? 0}
- Recent incidents:
${last5 || "  None"}

Specialties: Zabbix monitoring, Linux/Windows administration, network troubleshooting, incident root cause analysis, performance tuning.

Respond in user's language (English or French). Use markdown formatting where helpful. For incidents always provide:
1. Root cause analysis
2. Impact assessment
3. Step-by-step resolution with commands
4. Prevention recommendations`;
}

function buildIncidentPrompt(incident: Incident): string {
  const duration = Math.round((Date.now() - incident.openedAt) / 60000);
  return `Analyze this incident:
Trigger: ${incident.title}
Host: ${incident.host || "unknown"}
Severity: ${incident.severity}
Duration: ${duration} minutes
Status: ${incident.status}

Provide full root cause analysis and resolution steps.`;
}

function NoKeyBanner() {
  const colors = useColors();
  return (
    <View style={[styles.noKeyBanner, { backgroundColor: `${colors.severityAverage}14`, borderColor: colors.severityAverage }]}>
      <Feather name="alert-circle" size={18} color={colors.severityAverage} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.onSurface, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
          Anthropic API key not configured
        </Text>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
          Configure your key in Settings to enable AI responses.
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/(app)/settings/ai-config")}
        style={[styles.goBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Setup</Text>
      </Pressable>
    </View>
  );
}

export default function ChatOpsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const params = useLocalSearchParams<{ incident_id?: string }>();
  const tabBarHeight = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<LiveDashboardStats | null>(null);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const listRef = useRef<FlatList<Msg>>(null);
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const initializedRef = useRef(false);

  // Load key, incidents, stats
  useEffect(() => {
    Promise.all([getAnthropicKey(), getIncidents(), getDashboardStats()]).then(([key, inc, s]) => {
      setApiKey(key);
      setIncidents(inc);
      setStats(s);
    });
  }, []);

  const contextIncident = useMemo(
    () => params.incident_id ? incidents.find((i) => i.id === params.incident_id) : undefined,
    [incidents, params.incident_id],
  );

  // Initial greeting or auto-send for incident context
  useEffect(() => {
    if (initializedRef.current) return;
    if (incidents.length === 0) return; // wait for incidents to load
    initializedRef.current = true;

    if (contextIncident && apiKey) {
      // Auto-send incident analysis
      const prompt = buildIncidentPrompt(contextIncident);
      const userMsg: Msg = { id: `u_init`, role: "user", text: prompt, ts: Date.now() };
      setMessages([userMsg]);
      historyRef.current = [{ role: "user", content: prompt }];
      sendReply(prompt);
    } else {
      const greetText = contextIncident
        ? `I am scoped to incident ${contextIncident.id} on ${contextIncident.host || "unknown"}. Ask me anything about its triggers, recent changes, or remediation steps.`
        : "Hello. I am your Poulina AI operations assistant. Ask me about incidents, hosts, or infrastructure issues.";
      const greet: Msg = { id: "m0", role: "agent", text: greetText, ts: Date.now() };
      setMessages([greet]);
    }
  }, [incidents, contextIncident, apiKey]);

  const sendReply = useCallback(async (userText: string) => {
    const key = apiKey ?? await getAnthropicKey();
    if (!key) {
      const errMsg: Msg = {
        id: `e_${Date.now()}`,
        role: "agent",
        text: "No API key configured. Go to Settings → AI Configuration to add your Anthropic API key.",
        ts: Date.now(),
        error: true,
      };
      setMessages((m) => [errMsg, ...m]);
      setTyping(false);
      return;
    }

    setTyping(true);
    const systemPrompt = buildSystemPrompt(stats, incidents);

    try {
      const reply = await sendClaude(key, historyRef.current, systemPrompt);
      historyRef.current = [...historyRef.current, { role: "assistant", content: reply }];
      const agentMsg: Msg = { id: `a_${Date.now()}`, role: "agent", text: reply, ts: Date.now() };
      setMessages((m) => [agentMsg, ...m]);
    } catch (e) {
      const errText =
        (e as Error).message === "INVALID_API_KEY"
          ? "Invalid API key. Check your key in Settings → AI Configuration."
          : (e as Error).message === "RATE_LIMIT"
            ? "Rate limited. Please wait a moment and try again."
            : "Could not reach AI. Check your connection and try again.";
      const errMsg: Msg = { id: `e_${Date.now()}`, role: "agent", text: errText, ts: Date.now(), error: true };
      setMessages((m) => [errMsg, ...m]);
    } finally {
      setTyping(false);
    }
  }, [apiKey, stats, incidents]);

  const send = useCallback(
    (raw?: string) => {
      const value = (raw ?? text).trim();
      if (!value || typing) return;
      const userMsg: Msg = { id: `u_${Date.now()}`, role: "user", text: value, ts: Date.now() };
      historyRef.current = [...historyRef.current, { role: "user", content: value }];
      setMessages((m) => [userMsg, ...m]);
      setText("");
      sendReply(value);
    },
    [text, typing, sendReply],
  );

  const newChat = useCallback(() => {
    historyRef.current = [];
    initializedRef.current = false;
    setMessages([]);
    const greet: Msg = {
      id: `m_${Date.now()}`,
      role: "agent",
      text: "New session started. How can I help you?",
      ts: Date.now(),
    };
    setMessages([greet]);
    initializedRef.current = true;
  }, []);

  const headerTopPad = isWeb ? 67 + 12 : insets.top + 8;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: headerTopPad }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.onBackground, fontFamily: "Inter_700Bold", fontSize: 24 }}>
            ChatOps
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 }}>
            {contextIncident
              ? `Scoped to ${contextIncident.id} · ${contextIncident.host || "unknown"}`
              : "AI-powered operations assistant"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={newChat}
            style={[styles.iconBtn, { backgroundColor: colors.scheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,25,35,0.06)" }]}
            hitSlop={8}
          >
            <Feather name="plus" size={18} color={colors.mutedForeground} />
          </Pressable>
          <View style={[styles.statusPill, { backgroundColor: apiKey ? `${colors.success}1A` : `${colors.mutedForeground}1A` }]}>
            <View style={[styles.dot, { backgroundColor: apiKey ? colors.success : colors.mutedForeground }]} />
            <Text style={{ color: apiKey ? colors.success : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.4 }}>
              {apiKey ? "AI READY" : "NO KEY"}
            </Text>
          </View>
        </View>
      </View>

      {!apiKey ? <NoKeyBanner /> : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        inverted
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}
        ListHeaderComponent={
          typing ? (
            <Animated.View entering={FadeInUp.duration(180)}>
              <View style={[styles.bubble, styles.agent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.typingRow}>
                  <View style={[styles.typingDot, { backgroundColor: colors.mutedForeground }]} />
                  <View style={[styles.typingDot, { backgroundColor: colors.mutedForeground, opacity: 0.7 }]} />
                  <View style={[styles.typingDot, { backgroundColor: colors.mutedForeground, opacity: 0.4 }]} />
                </View>
              </View>
            </Animated.View>
          ) : null
        }
        renderItem={({ item }) => {
          const isUser = item.role === "user";
          return (
            <Animated.View
              entering={FadeInUp.duration(220)}
              style={[
                styles.bubble,
                isUser
                  ? [styles.user, { backgroundColor: colors.primary }]
                  : [
                      styles.agent,
                      {
                        backgroundColor: item.error ? `${colors.severityHigh}12` : colors.surface,
                        borderColor: item.error ? colors.severityHigh : colors.border,
                      },
                    ],
              ]}
            >
              <Text
                style={{
                  color: isUser ? colors.primaryForeground : item.error ? colors.severityHigh : colors.onSurface,
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {item.text}
              </Text>
              <Text
                style={{
                  color: isUser ? "rgba(255,255,255,0.7)" : colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 10,
                  marginTop: 6,
                  alignSelf: "flex-end",
                }}
              >
                {formatTime(item.ts)}
              </Text>
            </Animated.View>
          );
        }}
      />

      <View style={[styles.composerWrap, { paddingBottom: tabBarHeight + 8, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {messages.length <= 1 ? (
          <View style={styles.quickRow}>
            {QUICK.map((q) => (
              <Pressable
                key={q}
                onPress={() => send(q)}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: colors.scheme === "dark" ? "rgba(74,144,217,0.10)" : "rgba(32,78,143,0.06)",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>{q}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={{ flex: 1, color: colors.onSurface, fontFamily: "Inter_400Regular", fontSize: 14, paddingVertical: 10, paddingHorizontal: 12 }}
            placeholder="Ask the ops agent…"
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            multiline
            onSubmitEditing={() => send()}
            blurOnSubmit
            returnKeyType="send"
          />
          <Pressable
            onPress={() => send()}
            disabled={!text.trim() || typing}
            style={[
              styles.sendBtn,
              {
                backgroundColor: text.trim() && !typing
                  ? colors.primary
                  : colors.scheme === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(15,25,35,0.06)",
              },
            ]}
          >
            <Feather
              name="send"
              size={16}
              color={text.trim() && !typing ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  noKeyBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  goBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, marginBottom: 8 },
  user: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  agent: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1 },
  typingRow: { flexDirection: "row", gap: 4, paddingVertical: 2 },
  typingDot: { width: 7, height: 7, borderRadius: 4 },
  composerWrap: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  composer: { flexDirection: "row", alignItems: "flex-end", borderRadius: 16, borderWidth: 1, paddingLeft: 4, paddingRight: 6, paddingVertical: 4 },
  sendBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", margin: 4 },
});
