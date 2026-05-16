import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../components/Screen";
import FabMenu from "../components/FabMenu";
import { fetchAdminUsers } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/tokens";

export default function AdminUsersScreen({ navigation }) {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchAdminUsers(token).then(setUsers).catch(() => {});
  }, [token]);

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={[styles.overline, { color: colors.textTertiary }]}>Admin</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Users</Text>

        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search users"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          {filtered.map((u) => (
            <View key={u.user_id} style={styles.row}>
              <View>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{u.email}</Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                  Role: {u.role}
                </Text>
              </View>
              <Text style={[styles.badge, { color: colors.primary }]}>{u.role}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <FabMenu
        onNavigate={(target) => navigation.navigate(target)}
        activeRoute="AdminUsers"
        isAdmin={user?.role === "admin"}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  overline: {
    ...typography.overline,
    textTransform: "uppercase"
  },
  title: {
    ...typography.title,
    marginTop: spacing.sm
  },
  searchBar: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 8
  },
  searchInput: {
    fontSize: 15
  },
  card: {
    marginTop: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600"
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2
  },
  badge: {
    fontSize: 12,
    fontWeight: "600"
  }
});
