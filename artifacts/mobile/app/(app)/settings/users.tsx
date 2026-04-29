import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { SkeletonCard } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { getManagedUsers, ManagedUser } from "@/services/mockData";

const ROLE_TINTS: Record<string, "primary" | "info" | "muted"> = {
  Admin: "primary",
  Operator: "info",
  Viewer: "muted",
};

export default function UsersScreen() {
  const colors = useColors();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getManagedUsers().then((u) => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const tintFor = (role: string) => {
    const t = ROLE_TINTS[role] ?? "muted";
    return t === "primary"
      ? colors.primary
      : t === "info"
        ? colors.severityInfo
        : colors.mutedForeground;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search users…"
          leftIcon="search"
          autoCapitalize="none"
        />
      </View>
      {loading ? (
        <View style={{ padding: 20 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          ListEmptyComponent={
            <Card style={{ marginTop: 8 }}>
              <EmptyState
                variant="hosts"
                title="No users found"
                subtitle="Try a different search term."
              />
            </Card>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const initials = item.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            const tint = tintFor(item.role);
            return (
              <Card style={styles.row}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: `${tint}1F` },
                  ]}
                >
                  <Text
                    style={{
                      color: tint,
                      fontFamily: "Inter_700Bold",
                      fontSize: 14,
                    }}
                  >
                    {initials}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.onSurface,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {item.email}
                  </Text>
                </View>
                <View
                  style={[
                    styles.roleChip,
                    { backgroundColor: `${tint}1A` },
                  ]}
                >
                  <Text
                    style={{
                      color: tint,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 11,
                      letterSpacing: 0.4,
                    }}
                  >
                    {item.role.toUpperCase()}
                  </Text>
                </View>
              </Card>
            );
          }}
          ListFooterComponent={
            <Pressable style={{ marginTop: 16 }}>
              <Card
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderStyle: "dashed",
                }}
              >
                <Feather name="user-plus" size={16} color={colors.primary} />
                <Text
                  style={{
                    color: colors.primary,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  Invite teammate
                </Text>
              </Card>
            </Pressable>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
});
