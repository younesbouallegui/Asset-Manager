import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
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

const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 0.6;
const SHEET_HEIGHT_ESTIMATE = 560;

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

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT_ESTIMATE)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closeSheetRef = useRef<() => void>(() => {});

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT_ESTIMATE,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [onClose, translateY, backdropOpacity]);

  useEffect(() => {
    closeSheetRef.current = closeSheet;
  }, [closeSheet]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gs) =>
        gs.dy > 5 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_evt, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_evt, gs) => {
        if (gs.dy > DISMISS_THRESHOLD || gs.vy > DISMISS_VELOCITY) {
          closeSheetRef.current();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            tension: 70,
            friction: 12,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(SHEET_HEIGHT_ESTIMATE);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getIncidents().then((list) => {
      if (cancelled) return;
      setItems(list.slice(0, 10).map((inc, idx) => ({ ...inc, read: idx >= 3 })));
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const bottomPad = (Platform.OS === "web" ? 34 : insets.bottom) + 16;
  const handleBg =
    colors.scheme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(15,25,35,0.18)";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="box-none"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheetContainer,
          { transform: [{ translateY }] },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: bottomPad,
            },
          ]}
        >
          <View style={styles.handleWrap} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: handleBg }]} />
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
            scrollEventThrottle={16}
          >
            {items.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => markRead(n.id)}
                style={({ pressed }) => [
                  styles.item,
                  {
                    borderBottomColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
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
                    <View style={styles.unreadDotEmpty} />
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
              </Pressable>
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
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.50)",
  },
  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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
    paddingVertical: 10,
  },
  handle: {
    width: 44,
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
  unreadDotEmpty: {
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
