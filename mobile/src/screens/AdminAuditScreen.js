import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../components/Screen";
import FabMenu from "../components/FabMenu";
import { fetchAdminAudit } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/tokens";

export default function AdminAuditScreen({ navigation }) {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchAdminAudit(token).then(setLogs).catch(() => {});
  }, [token]);

  const filtered = logs.filter((log) =>
    log.action.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={[styles.overline, { color: colors.textTertiary }]}>Admin</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Audit Logs</Text>

        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search logs"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          {filtered.map((log) => (
            <View key={log.log_id || log.logId} style={styles.row}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{log.action}</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                {new Date(log.timestamp).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <FabMenu
        onNavigate={(target) => navigation.navigate(target)}
        activeRoute="AdminAudit"
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
    marginBottom: spacing.md
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600"
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2
  }
});
