import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Feather } from "@expo/vector-icons";
import Screen from "../components/Screen";
import SecondaryButton from "../components/SecondaryButton";
import { fetchFileDetail, getApiBase } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/tokens";

export default function FileDetailScreen({ route, navigation }) {
  const { fileId, fileName } = route.params || {};
  const { token } = useAuth();
  const { colors } = useTheme();
  const [detail, setDetail] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!fileId || !token) return;
    fetchFileDetail(token, fileId).then(setDetail).catch(() => {});
  }, [fileId, token]);

  async function handleDownload() {
    if (!detail) return;
    const url = `${getApiBase()}/files/${detail.fileId}/download`;
    const fileUri = `${FileSystem.documentDirectory}${detail.originalName}`;
    const result = await FileSystem.downloadAsync(url, fileUri, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {detail?.originalName || fileName || "File details"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Encrypted with AES-256-GCM
        </Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Metadata</Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Size: {detail ? (detail.sizeBytes / 1024).toFixed(1) : "--"} KB
          </Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Type: {detail?.mimeType || "unknown"}
          </Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Created: {detail ? new Date(detail.createdAt).toLocaleString() : "--"}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Versions</Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            v1 · Original upload
          </Text>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            v0 · Placeholder (demo)
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Actions</Text>
          <SecondaryButton title="Download" icon="download" onPress={handleDownload} />
          <SecondaryButton
            title="Create Share Link"
            icon="link"
            onPress={() => setShareOpen(true)}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>

      <Modal transparent visible={shareOpen} animationType="fade">
        <View style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Share Link</Text>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              Demo link: https://secura.demo/share/abc123
            </Text>
            <SecondaryButton title="Close" onPress={() => setShareOpen(false)} style={styles.actionButton} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  backText: {
    marginLeft: spacing.sm,
    fontSize: 14,
    fontWeight: "600"
  },
  title: {
    ...typography.title
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.sm
  },
  card: {
    marginTop: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.sm
  },
  metaText: {
    fontSize: 13,
    marginBottom: spacing.xs
  },
  actionButton: {
    marginTop: spacing.sm
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  modalCard: {
    width: "82%",
    borderRadius: 18,
    padding: spacing.xl
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.sm
  }
});
