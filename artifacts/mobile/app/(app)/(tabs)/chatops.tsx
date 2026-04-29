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
import { Incident, getIncidents } from "@/services/mockData";

type Msg = {
  id: string;
  role: "user" | "agent";
  text: string;
  ts: number;
};

const QUICK = [
  "What changed in the last hour?",
  "Open incidents on web-prod-01",
  "Run health check",
];

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fakeAgentReply(prompt: string, contextHost?: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("health"))
    return `Running health checks on ${contextHost ?? "all critical hosts"}. CPU within thresholds. 2 hosts above 80% memory. Recommend investigating memory pressure on db-prod-02.`;
  if (lower.includes("changed"))
    return "In the last hour: 3 new INFO triggers, 1 AVERAGE on web-prod-01 (latency), and 1 HIGH on db-prod-02 (replication lag). No DISASTER events.";
  if (lower.includes("acknowledge"))
    return "Acknowledged. I have notified the on-call team and silenced repeat notifications for 30 minutes.";
  if (lower.includes("incident"))
    return `Showing 4 active incidents${contextHost ? ` on ${contextHost}` : ""}. The most severe is INC-1042 (HIGH) opened 8 minutes ago.`;
  return "Got it. I have logged this request and will follow up shortly with diagnostics.";
}

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
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    getIncidents().then(setIncidents);
  }, []);

  const contextIncident = useMemo(
    () =>
      params.incident_id
        ? incidents.find((i) => i.id === params.incident_id)
        : undefined,
    [incidents, params.incident_id],
  );

  useEffect(() => {
    if (messages.length > 0) return;
    const greet: Msg = {
      id: "m0",
      role: "agent",
      text: contextIncident
        ? `I am scoped to incident ${contextIncident.id} on ${contextIncident.host}. Ask me anything about its triggers, recent changes, or remediation steps.`
        : "Hello. I am your operations copilot. Ask me about incidents, hosts, or run common diagnostic commands.",
      ts: Date.now(),
    };
    setMessages([greet]);
  }, [contextIncident, messages.length]);

  const send = useCallback(
    (raw?: string) => {
      const value = (raw ?? text).trim();
      if (!value) return;
      const userMsg: Msg = {
        id: `u_${Date.now()}`,
        role: "user",
        text: value,
        ts: Date.now(),
      };
      setMessages((m) => [userMsg, ...m]);
      setText("");
      setTyping(true);
      setTimeout(
        () => {
          const reply: Msg = {
            id: `a_${Date.now()}`,
            role: "agent",
            text: fakeAgentReply(value, contextIncident?.host),
            ts: Date.now(),
          };
          setMessages((m) => [reply, ...m]);
          setTyping(false);
        },
        900 + Math.random() * 600,
      );
    },
    [text, contextIncident],
  );

  const headerTopPad = isWeb ? 67 + 12 : insets.top + 8;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: headerTopPad }]}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.onBackground,
              fontFamily: "Inter_700Bold",
              fontSize: 24,
            }}
          >
            ChatOps
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {contextIncident
              ? `Scoped to ${contextIncident.id} · ${contextIncident.host}`
              : "Conversational diagnostics for your fleet"}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: `${colors.success}1A` },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text
            style={{
              color: colors.success,
              fontFamily: "Inter_600SemiBold",
              fontSize: 11,
              letterSpacing: 0.4,
            }}
          >
            ONLINE
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        inverted
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 16,
        }}
        ListHeaderComponent={
          typing ? (
            <View style={[styles.bubble, styles.agent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.typingRow}>
                <View style={[styles.typingDot, { backgroundColor: colors.mutedForeground }]} />
                <View style={[styles.typingDot, { backgroundColor: colors.mutedForeground, opacity: 0.7 }]} />
                <View style={[styles.typingDot, { backgroundColor: colors.mutedForeground, opacity: 0.4 }]} />
              </View>
            </View>
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
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ],
              ]}
            >
              <Text
                style={{
                  color: isUser ? colors.primaryForeground : colors.onSurface,
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {item.text}
              </Text>
              <Text
                style={{
                  color: isUser
                    ? "rgba(255,255,255,0.7)"
                    : colors.mutedForeground,
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

      <View
        style={[
          styles.composerWrap,
          {
            paddingBottom: tabBarHeight + 8,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        {messages.length <= 1 ? (
          <View style={styles.quickRow}>
            {QUICK.map((q) => (
              <Pressable
                key={q}
                onPress={() => send(q)}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor:
                      colors.scheme === "dark"
                        ? "rgba(74,144,217,0.10)"
                        : "rgba(32,78,143,0.06)",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                  }}
                >
                  {q}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            style={{
              flex: 1,
              color: colors.onSurface,
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              paddingVertical: 10,
              paddingHorizontal: 12,
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
            disabled={!text.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: text.trim()
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
              color={text.trim() ? colors.primaryForeground : colors.mutedForeground}
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
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
  },
  user: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  agent: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  typingRow: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 2,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  composerWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
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
