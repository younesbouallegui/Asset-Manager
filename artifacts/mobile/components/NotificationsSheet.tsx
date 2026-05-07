import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  formatRelative,
  getIncidents,
  Incident,
} from "@/services/dataService";

import { SeverityBadge } from "./SeverityBadge";

interface Notification extends Incident {
  read: boolean;
}

export function NotificationsSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getIncidents().then((list) => {
      if (cancelled) return;
      setItems(
        list.slice(0, 10).map((inc, idx) => ({ ...inc, read: idx >= 3 })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const bottomPad = (Platform.OS === "web" ? 34 : insets.bottom) + 16;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: bottomPad,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handleWrap}>
            <View
              style={[
                styles.handle,
                {
                  backgroundColor:
                    colors.scheme === "dark"
                      ? "rgba(255,255,255,0.18)"
                      : "rgba(15,25,35,0.18)",
                },
              ]}
            />
          </View>

          <View style={styles.headerRow}>
            <Text
              style={{
                color: colors.onSurface,
                fontFamily: "Inter_700Bold",
                fontSize: 18,
              }}
            >
              Notifications
            </Text>
            <Pressable onPress={markAllRead} hitSlop={8}>
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                }}
              >
                Mark all as read
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: 480 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
          >
            {items.map((n) => (
              <View
                key={n.id}
                style={[
                  styles.item,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.dotCol}>
                  {!n.read ? (
                    <View
                      style={[
                        styles.unreadDot,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  ) : (
                    <View style={styles.unreadDot} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemTop}>
                    <SeverityBadge severity={n.severity} compact />
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                        fontSize: 11,
                      }}
                    >
                      {formatRelative(n.openedAt)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.onSurface,
                      fontFamily: n.read ? "Inter_500Medium" : "Inter_600SemiBold",
                      fontSize: 14,
                      marginTop: 6,
                    }}
                    numberOfLines={2}
                  >
                    {n.title}
                  </Text>
                  <View style={styles.hostRow}>
                    <Feather
                      name="server"
                      size={11}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                      }}
                    >
                      {n.host}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {items.length === 0 ? (
              <View style={{ padding: 28, alignItems: "center" }}>
                <Feather
                  name="bell-off"
                  size={28}
                  color={colors.mutedForeground}
                />
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    marginTop: 10,
                  }}
                >
                  No notifications
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 4,
  },
  item: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  dotCol: {
    width: 14,
    alignItems: "center",
    paddingTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
});
