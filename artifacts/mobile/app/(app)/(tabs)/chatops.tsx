import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
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

import { useColors } from "@/hooks/useColors";
import {
  getAIStatus,
  getIncidents,
  Incident,
  sendAI,
} from "@/services/dataService";

type Msg = {
  id: string;
  role: "user" | "agent";
  text: string;
  ts: number;
  error?: boolean;
  retryPayload?: { history: { role: "user" | "assistant"; content: string }[]; userText: string };
};

const INCIDENT_QUICK = [
  "What is the root cause?",
  "How do I fix this?",
  "What is the business impact?",
  "Show diagnostic commands",
];

const GENERIC_QUICK = [
  "Summarize current incidents",
  "Which hosts have the most alerts?",
  "How do I reduce MTTR?",
];

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function buildSystemPrompt(incidents: Incident[]): string {
  const last5 = incidents
    .slice(0, 5)
    .map((i) => `  - [${i.severity}] ${i.title} on ${i.host || "unknown"}`)
    .join("\n");
  const active = incidents.filter((i) => i.status === "open").length;
  const disasters = incidents.filter((i) => i.severity === "DISASTER").length;
  const highs = incidents.filter((i) => i.severity === "HIGH").length;

  return `You are Poulina AI, an expert SRE and DevOps assistant for Poulina Group operations team.

Current Zabbix infrastructure status:
- Active incidents: ${active}
- Disaster alerts: ${disasters}
- High severity alerts: ${highs}
- Recent incidents:
${last5 || "  None currently active"}

Your specialties: Zabbix monitoring, Linux/Windows administration, network troubleshooting, incident root cause analysis, performance tuning, log analysis.

Respond in the user's language (English or French). Use markdown formatting:
- Use **bold** for important terms
- Use \`inline code\` for commands, paths, and values
- Use \`\`\`bash code blocks\`\`\` for multi-line commands
- Use numbered lists for step-by-step procedures
- Use bullet points for options or observations

For any incident always structure your response as:
1. **Root Cause Hypothesis** — what likely caused it
2. **Impact Assessment** — what is affected and how severely
3. **Immediate Actions** — step-by-step resolution with exact commands
4. **Verification** — how to confirm the issue is resolved
5. **Prevention** — monitoring rules or config changes to prevent recurrence`;
}

function buildIncidentPrompt(incident: Incident): string {
  const duration = Math.round((Date.now() - incident.openedAt) / 60000);
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`;

  return `Perform a full incident analysis for:

**Trigger:** ${incident.title}
**Host:** ${incident.host || "unknown"}
**Severity:** ${incident.severity}
**Status:** ${incident.status}
**Duration:** ${durationStr}
**Description:** ${incident.description || "No additional description"}

Provide complete root cause analysis, business impact, immediate remediation steps with exact commands, verification steps, and prevention recommendations.`;
}

// ─── Lightweight markdown renderer ────────────────────────────────────────────

function MarkdownText({ text, isUser, isError, colors }: {
  text: string;
  isUser: boolean;
  isError: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const baseColor = isUser ? colors.primaryForeground : isError ? colors.severityHigh : colors.onSurface;
  const mutedColor = isUser ? "rgba(255,255,255,0.75)" : colors.mutedForeground;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <View
          key={`code_${i}`}
          style={{
            backgroundColor: isUser ? "rgba(0,0,0,0.20)" : colors.scheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            borderRadius: 8,
            padding: 10,
            marginTop: 8,
            marginBottom: 4,
          }}
        >
          {lang ? (
            <Text style={{ color: mutedColor, fontFamily: "Inter_400Regular", fontSize: 10, marginBottom: 4 }}>
              {lang}
            </Text>
          ) : null}
          <Text
            selectable
            style={{
              color: isUser ? colors.primaryForeground : colors.onSurface,
              fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {codeLines.join("\n")}
          </Text>
        </View>,
      );
      i++;
      continue;
    }

    if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ")) {
      const lvl = line.startsWith("### ") ? 3 : line.startsWith("## ") ? 2 : 1;
      const headingText = line.replace(/^#{1,3} /, "");
      elements.push(
        <Text
          key={`h_${i}`}
          style={{
            color: baseColor,
            fontFamily: "Inter_700Bold",
            fontSize: lvl === 1 ? 16 : lvl === 2 ? 15 : 14,
            marginTop: i > 0 ? 10 : 2,
            marginBottom: 2,
          }}
        >
          {headingText}
        </Text>,
      );
      i++;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const bulletText = line.slice(2);
      elements.push(
        <View key={`bullet_${i}`} style={{ flexDirection: "row", marginTop: 3 }}>
          <Text style={{ color: mutedColor, fontFamily: "Inter_400Regular", fontSize: 14, marginRight: 6 }}>•</Text>
          <InlineText text={bulletText} baseColor={baseColor} isUser={isUser} colors={colors} style={{ flex: 1 }} />
        </View>,
      );
      i++;
      continue;
    }

    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <View key={`num_${i}`} style={{ flexDirection: "row", marginTop: 3 }}>
          <Text style={{ color: mutedColor, fontFamily: "Inter_500Medium", fontSize: 14, marginRight: 6, minWidth: 18 }}>
            {numberedMatch[1]}.
          </Text>
          <InlineText text={numberedMatch[2]} baseColor={baseColor} isUser={isUser} colors={colors} style={{ flex: 1 }} />
        </View>,
      );
      i++;
      continue;
    }

    if (line.trim() === "") {
      elements.push(<View key={`gap_${i}`} style={{ height: 6 }} />);
      i++;
      continue;
    }

    elements.push(
      <InlineText key={`line_${i}`} text={line} baseColor={baseColor} isUser={isUser} colors={colors} style={{ marginTop: 2 }} />,
    );
    i++;
  }

  return <View>{elements}</View>;
}

function InlineText({
  text, baseColor, isUser, colors, style,
}: {
  text: string;
  baseColor: string;
  isUser: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  style?: object;
}) {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        <Text key={`t${idx++}`} style={{ color: baseColor, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 }}>
          {text.slice(last, match.index)}
        </Text>,
      );
    }
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(
        <Text
          key={`c${idx++}`}
          style={{
            color: isUser ? colors.primaryForeground : colors.primary,
            fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
            fontSize: 13,
            backgroundColor: isUser ? "rgba(0,0,0,0.15)" : colors.scheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
            borderRadius: 3,
          }}
        >
          {token.slice(1, -1)}
        </Text>,
      );
    } else {
      parts.push(
        <Text key={`b${idx++}`} style={{ color: baseColor, fontFamily: "Inter_700Bold", fontSize: 14, lineHeight: 20 }}>
          {token.slice(2, -2)}
        </Text>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) {
    parts.push(
      <Text key={`t${idx++}`} style={{ color: baseColor, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 }}>
        {text.slice(last)}
      </Text>,
    );
  }

  return (
    <Text selectable style={style}>
      {parts}
    </Text>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChatOpsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const params = useLocalSearchParams<{ incident_id?: string }>();
  const tabBarHeight = Platform.OS === "web" ? 84 : 56 + insets.bottom;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const listRef = useRef<FlatList<Msg>>(null);
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    getIncidents().catch(() => [] as Incident[]).then(setIncidents);
    getAIStatus().then((s) => setAiReady(s.ok));
  }, []);

  const contextIncident = useMemo(
    () => (params.incident_id ? incidents.find((i) => i.id === params.incident_id) : undefined),
    [incidents, params.incident_id],
  );

  const sendReply = useCallback(
    async (
      userText: string,
      historySnapshot: { role: "user" | "assistant"; content: string }[],
    ) => {
      setTyping(true);
      const systemPrompt = buildSystemPrompt(incidents);
      try {
        const reply = await sendAI(historySnapshot, systemPrompt);
        historyRef.current = [...historySnapshot, { role: "assistant", content: reply }];
        const agentMsg: Msg = { id: `a_${Date.now()}`, role: "agent", text: reply, ts: Date.now() };
        setMessages((m) => [agentMsg, ...m]);
      } catch (e) {
        const code = (e as Error).message ?? "";
        const friendlyText =
          code === "AI_NOT_CONFIGURED"
            ? "AI service is not configured on the server. Contact your administrator."
            : code === "RATE_LIMITED"
              ? "Rate limit reached — wait a moment and try again."
              : code === "TIMEOUT"
                ? "Request timed out. The AI may be busy — tap Retry."
                : code === "NETWORK_ERROR"
                  ? "Cannot reach the backend server. Check your network connection."
                  : "AI response failed. Tap Retry to try again.";
        const errMsg: Msg = {
          id: `e_${Date.now()}`,
          role: "agent",
          text: friendlyText,
          ts: Date.now(),
          error: true,
          retryPayload: { history: historySnapshot, userText },
        };
        setMessages((m) => [errMsg, ...m]);
      } finally {
        setTyping(false);
      }
    },
    [incidents],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (contextIncident) {
      const prompt = buildIncidentPrompt(contextIncident);
      const userMsg: Msg = { id: "u_init", role: "user", text: `Analyzing: **${contextIncident.title}**\n\n${contextIncident.host ? `Host: ${contextIncident.host}` : ""}`, ts: Date.now() };
      const history = [{ role: "user" as const, content: prompt }];
      historyRef.current = history;
      setMessages([userMsg]);
      sendReply(prompt, history);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextIncident]);

  const send = useCallback(
    (raw?: string) => {
      const value = (raw ?? text).trim();
      if (!value || typing) return;
      const history = [...historyRef.current, { role: "user" as const, content: value }];
      historyRef.current = history;
      const userMsg: Msg = { id: `u_${Date.now()}`, role: "user", text: value, ts: Date.now() };
      setMessages((m) => [userMsg, ...m]);
      setText("");
      sendReply(value, history);
    },
    [text, typing, sendReply],
  );

  const retry = useCallback(
    (payload: Msg["retryPayload"]) => {
      if (!payload || typing) return;
      setMessages((m) => m.filter((msg) => !msg.error));
      historyRef.current = payload.history;
      sendReply(payload.userText, payload.history);
    },
    [typing, sendReply],
  );

  const newChat = useCallback(() => {
    historyRef.current = [];
    initializedRef.current = false;
    setMessages([]);
  }, []);

  const headerTopPad = isWeb ? 67 + 12 : insets.top + 8;
  const quickPrompts = contextIncident ? INCIDENT_QUICK : GENERIC_QUICK;
  const showQuickPrompts = messages.length === 0 || (messages.length === 1 && messages[0].role === "user");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: headerTopPad }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.onBackground, fontFamily: "Inter_700Bold", fontSize: 24 }}>
            ChatOps
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 }}>
            {contextIncident
              ? `Incident: ${contextIncident.title.slice(0, 40)}${contextIncident.title.length > 40 ? "…" : ""}`
              : "AI Operations Assistant"}
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
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: aiReady === false
                  ? `${colors.severityHigh}1A`
                  : `${colors.success}1A`,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: aiReady === false ? colors.severityHigh : colors.success },
              ]}
            />
            <Text
              style={{
                color: aiReady === false ? colors.severityHigh : colors.success,
                fontFamily: "Inter_600SemiBold",
                fontSize: 11,
                letterSpacing: 0.4,
              }}
            >
              {aiReady === null ? "CHECKING" : aiReady ? "AI LIVE" : "AI ERROR"}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Context chip ── */}
      {contextIncident ? (
        <View style={[styles.contextChip, { backgroundColor: `${colors.severityHigh}12`, borderColor: `${colors.severityHigh}30` }]}>
          <Feather name="alert-triangle" size={13} color={colors.severityHigh} />
          <Text style={{ color: colors.severityHigh, fontFamily: "Inter_600SemiBold", fontSize: 12, flex: 1 }} numberOfLines={1}>
            [{contextIncident.severity}] {contextIncident.title}
          </Text>
          {contextIncident.host ? (
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>
              {contextIncident.host}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* ── Message list ── */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        inverted
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}
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
        ListFooterComponent={
          messages.length === 0 && !typing ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}12` }]}>
                <Feather name="cpu" size={28} color={colors.primary} />
              </View>
              <Text style={{ color: colors.onSurface, fontFamily: "Inter_700Bold", fontSize: 17, marginTop: 14 }}>
                AI Operations Assistant
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 19, maxWidth: 280 }}>
                Incident intelligence, root cause analysis, and remediation guidance — powered by Llama 3.3.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isUser = item.role === "user";
          return (
            <Animated.View entering={FadeInUp.duration(220)}>
              <View
                style={[
                  styles.bubble,
                  isUser
                    ? [styles.user, { backgroundColor: colors.primary }]
                    : [
                        styles.agent,
                        {
                          backgroundColor: item.error
                            ? `${colors.severityHigh}10`
                            : colors.surface,
                          borderColor: item.error ? colors.severityHigh : colors.border,
                        },
                      ],
                ]}
              >
                <MarkdownText
                  text={item.text}
                  isUser={isUser}
                  isError={!!item.error}
                  colors={colors}
                />
                <View style={styles.bubbleFooter}>
                  <Text
                    style={{
                      color: isUser ? "rgba(255,255,255,0.65)" : colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      fontSize: 10,
                    }}
                  >
                    {formatTime(item.ts)}
                  </Text>
                  {item.error && item.retryPayload ? (
                    <Pressable
                      onPress={() => retry(item.retryPayload)}
                      style={[styles.retryBtn, { borderColor: colors.severityHigh }]}
                    >
                      <Feather name="refresh-cw" size={11} color={colors.severityHigh} />
                      <Text style={{ color: colors.severityHigh, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                        Retry
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </Animated.View>
          );
        }}
      />

      {/* ── Composer ── */}
      <View
        style={[
          styles.composerWrap,
          { paddingBottom: tabBarHeight + 8, backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        {showQuickPrompts ? (
          <View style={styles.quickRow}>
            {quickPrompts.map((q) => (
              <Pressable
                key={q}
                onPress={() => send(q)}
                disabled={typing}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: colors.scheme === "dark" ? "rgba(74,144,217,0.10)" : "rgba(32,78,143,0.06)",
                    borderColor: colors.border,
                    opacity: typing ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", fontSize: 12 }}>
                  {q}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={{
              flex: 1,
              color: colors.onSurface,
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              paddingVertical: 10,
              paddingHorizontal: 12,
              maxHeight: 120,
            }}
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
                backgroundColor:
                  text.trim() && !typing
                    ? colors.primary
                    : colors.scheme === "dark"
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(15,25,35,0.06)",
              },
            ]}
          >
            <Feather
              name={typing ? "loader" : "send"}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "88%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
  },
  user: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  agent: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typingRow: { flexDirection: "row", gap: 4, paddingVertical: 2 },
  typingDot: { width: 7, height: 7, borderRadius: 4 },
  composerWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },
});
