import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  getDefaultLayout,
  WidgetConfig,
  WIDGET_META,
  WidgetType,
} from "@/services/dashboardConfig";

interface Props {
  visible: boolean;
  layout: WidgetConfig[];
  onClose: () => void;
  onChange: (layout: WidgetConfig[]) => void;
}

export function WidgetPickerModal({ visible, layout, onClose, onChange }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = colors.scheme === "dark";

  const allTypes = (Object.keys(WIDGET_META) as WidgetType[]);

  const isVisible = (type: WidgetType) => {
    const w = layout.find((x) => x.type === type);
    return w?.visible ?? false;
  };

  const toggle = (type: WidgetType) => {
    const meta = WIDGET_META[type];
    if (!meta.removable) return;
    const next = layout.map((w) =>
      w.type === type ? { ...w, visible: !w.visible } : w,
    );
    onChange(next);
  };

  const reset = () => {
    onChange(getDefaultLayout());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text
            style={{
              color: colors.onBackground,
              fontFamily: "Inter_700Bold",
              fontSize: 18,
            }}
          >
            Customize Dashboard
          </Text>
          <Pressable
            onPress={onClose}
            style={[
              styles.closeBtn,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
              },
            ]}
          >
            <Feather name="x" size={18} color={colors.onBackground} />
          </Pressable>
        </View>

        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            paddingHorizontal: 20,
            marginBottom: 16,
          }}
        >
          Choose which sections appear on your dashboard.
        </Text>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {allTypes.map((type) => {
            const meta = WIDGET_META[type];
            const enabled = isVisible(type);
            const locked = !meta.removable;

            return (
              <Pressable
                key={type}
                onPress={() => toggle(type)}
                disabled={locked}
                style={[
                  styles.row,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                    borderColor: enabled ? colors.primary : colors.border,
                    borderWidth: 1,
                    opacity: locked ? 0.6 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: enabled
                        ? `${colors.primary}18`
                        : isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <Feather
                    name={meta.icon as React.ComponentProps<typeof Feather>["name"]}
                    size={18}
                    color={enabled ? colors.primary : colors.mutedForeground}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.onSurface,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                    }}
                  >
                    {meta.label}
                    {locked ? " · Always on" : ""}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {meta.description}
                  </Text>
                </View>
                {locked ? (
                  <Feather name="lock" size={16} color={colors.mutedForeground} />
                ) : (
                  <View
                    style={[
                      styles.toggle,
                      {
                        backgroundColor: enabled ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        {
                          transform: [{ translateX: enabled ? 18 : 2 }],
                          backgroundColor: "#fff",
                        },
                      ]}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}

          <View style={{ height: 8 }} />

          <Pressable
            onPress={reset}
            style={[
              styles.resetBtn,
              {
                borderColor: colors.border,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
              },
            ]}
          >
            <Feather name="rotate-ccw" size={15} color={colors.mutedForeground} />
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 14,
              }}
            >
              Reset to defaults
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
