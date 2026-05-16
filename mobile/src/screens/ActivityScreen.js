import { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Screen from "../components/Screen";
import FabMenu from "../components/FabMenu";
import { fetchActivity } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/tokens";

export default function ActivityScreen({ navigation }) {
  const { colors } = useTheme();
  const { token, user } = useAuth();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const parsedLogs = useMemo(() => {
    return logs.map((log) => {
      const action = log.action || "";
      const type = action.includes("UPLOAD")
        ? "upload"
        : action.includes("DOWNLOAD")
          ? "download"
          : action.includes("LOGIN") || action.includes("REGISTER")
            ? "login"
            : "other";
      const label =
        action === "UPLOAD_FILE"
          ? "Uploaded a file"
          : action === "DOWNLOAD_FILE"
            ? "Downloaded a file"
            : action === "LOGIN"
              ? "Signed in to Secura"
              : action === "REGISTER"
                ? "Created an account"
                : action === "GUEST_LOGIN"
                  ? "Entered guest mode"
                  : action;
      return {
        id: log.id,
        type,
        label,
        time: new Date(log.timestamp).toLocaleString()
      };
    });
  }, [logs]);

  const filteredLogs = parsedLogs.filter((log) => {
    const matchesFilter = filter === "all" || log.type === filter;
    const matchesQuery = log.label.toLowerCase().includes(query.trim().toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const summary = useMemo(() => {
    const uploads = parsedLogs.filter((log) => log.type === "upload").length;
    const downloads = parsedLogs.filter((log) => log.type === "download").length;
    const logins = parsedLogs.filter((log) => log.type === "login").length;
    const last = parsedLogs[0]?.time || "No activity yet";
    return { uploads, downloads, logins, last };
  }, [parsedLogs]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchActivity(token)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchActivity(token).then(setLogs);
    setRefreshing(false);
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.wrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={[styles.overline, { color: colors.textTertiary }]}>Activity</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Audit Trail</Text>

        <View style={styles.summaryRow}>
          {[
            { label: "Uploads", value: summary.uploads },
            { label: "Downloads", value: summary.downloads },
            { label: "Logins", value: summary.logins }
          ].map((item, index, arr) => (
            <View
              key={item.label}
              style={[
                styles.summaryCard,
                { backgroundColor: colors.surface, marginRight: index === arr.length - 1 ? 0 : spacing.sm }
              ]}
            >
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{item.value}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.summaryWide, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.summaryWideTitle, { color: colors.textTertiary }]}>Last activity</Text>
          <Text style={[styles.summaryWideValue, { color: colors.textPrimary }]}>{summary.last}</Text>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search activity"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View style={styles.filterRow}>
          {[
            { key: "all", label: "All" },
            { key: "upload", label: "Uploads" },
            { key: "download", label: "Downloads" },
            { key: "login", label: "Logins" }
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === item.key ? colors.primary : colors.primary50,
                  borderColor: colors.outline
                }
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text
                style={{
                  color: filter === item.key ? colors.surface : colors.primary700,
                  fontSize: 12,
                  fontWeight: "600"
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          {loading ? (
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Loading...</Text>
          ) : filteredLogs.length === 0 ? (
            <>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No matching activity
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try a different filter or search.
              </Text>
            </>
          ) : (
            filteredLogs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: colors.primary }]} />
                <View>
                  <Text style={[styles.logTitle, { color: colors.textPrimary }]}>{log.label}</Text>
                  <Text style={[styles.logTime, { color: colors.textSecondary }]}>{log.time}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <FabMenu
        onNavigate={(target) => navigation.navigate(target)}
        activeRoute="Activity"
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
    textTransform: "uppercase",
    color: "#94A3B8"
  },
  title: {
    ...typography.title,
    marginTop: spacing.sm
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700"
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2
  },
  summaryWide: {
    marginTop: spacing.md,
    borderRadius: 14,
    padding: spacing.md
  },
  summaryWideTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  summaryWideValue: {
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: "600"
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.md
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.sm
  },
  card: {
    marginTop: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md
  },
  logTitle: {
    fontSize: 14,
    fontWeight: "600"
  },
  logTime: {
    fontSize: 12,
    marginTop: 2
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs
  }
});
