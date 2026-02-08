import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import PrimaryButton from "../components/PrimaryButton";
import Screen from "../components/Screen";
import FabMenu from "../components/FabMenu";
import { fetchFiles, uploadFileWithProgress, getApiBase } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/tokens";

export default function FilesScreen({ navigation }) {
  const { token, user, setMessage } = useAuth();
  const { colors } = useTheme();
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successNote, setSuccessNote] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [encryptingName, setEncryptingName] = useState("");
  const [encrypting, setEncrypting] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [refreshing, setRefreshing] = useState(false);
  const blobShift = useRef(new Animated.Value(0)).current;
  const blobPulse = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.98)).current;
  const heroFade = useRef(new Animated.Value(0)).current;

  const offlineGuest = token === "offline-guest";
  const totalQuota = 5 * 1024 * 1024 * 1024;

  async function loadFiles() {
    if (offlineGuest) {
      setFiles([]);
      return;
    }
    try {
      const data = await fetchFiles(token);
      setFiles(data);
    } catch (err) {
      setMessage("Could not load files.");
    }
  }

  async function handleUpload() {
    if (offlineGuest) {
      setMessage("Offline guest mode: uploads are disabled.");
      return;
    }
    setBusy(true);
    setMessage("");
    setSuccessNote("");
    setEncryptingName("");
    setEncrypting(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
      if (result.canceled) {
        setBusy(false);
        setUploadProgress(0);
        setEncryptingName("");
        setEncrypting(false);
        return;
      }
      const file = result.assets[0];
      setEncryptingName(file.name || "selected file");
      setEncrypting(true);
      await uploadFileWithProgress(token, file, (progress) => {
        setUploadProgress(progress);
      });
      await loadFiles();
      setUploadProgress(1);
      setEncrypting(false);
      setSuccessNote("Upload complete");
      setTimeout(() => {
        setUploadProgress(0);
        setEncryptingName("");
        setEncrypting(false);
        setSuccessNote("");
      }, 1200);
    } catch (err) {
      setMessage("Upload error. Check permissions or API.");
      setUploadProgress(0);
      setEncrypting(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(file) {
    if (offlineGuest) {
      setNotice("Offline guest mode: downloads are disabled.");
      return;
    }
    setNotice("");
    try {
      const url = `${getApiBase()}/files/${file.fileId}/download`;
      const fileUri = `${FileSystem.documentDirectory}${file.originalName}`;
      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      } else {
        setNotice("Download saved to device.");
      }
    } catch (err) {
      setNotice("Download failed. Check permissions or API.");
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  }

  function formatBytes(bytes = 0) {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  function getFileIcon(name = "") {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
    if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "video";
    if (["zip", "rar", "7z", "tar"].includes(ext)) return "archive";
    if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) return "file-text";
    return "file";
  }

  const filteredFiles = files.filter((file) =>
    file.originalName.toLowerCase().includes(query.trim().toLowerCase())
  );
  const sortedFiles = useMemo(() => {
    const sorted = [...filteredFiles];
    if (sortBy === "name") {
      sorted.sort((a, b) => a.originalName.localeCompare(b.originalName));
    } else if (sortBy === "size") {
      sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
    } else {
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return sorted;
  }, [filteredFiles, sortBy]);
  const recentFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sorted.slice(0, 2);
  }, [files]);
  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + (file.sizeBytes || 0), 0), [files]);
  const usageRatio = Math.min(1, totalBytes / totalQuota);

  useEffect(() => {
    loadFiles();
  }, [token]);

  useEffect(() => {
    const shift = Animated.loop(
      Animated.sequence([
        Animated.timing(blobShift, { toValue: 1, duration: 4200, useNativeDriver: true }),
        Animated.timing(blobShift, { toValue: 0, duration: 4200, useNativeDriver: true })
      ])
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(blobPulse, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(blobPulse, { toValue: 0, duration: 3000, useNativeDriver: true })
      ])
    );
    shift.start();
    pulse.start();
    return () => {
      shift.stop();
      pulse.stop();
    };
  }, [blobShift, blobPulse]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, useNativeDriver: true, friction: 7 })
    ]).start();
  }, [heroFade, heroScale]);

  return (
    <Screen>
      <View style={styles.blobLayer} pointerEvents="none">
        <Animated.View
          style={[
            styles.blob,
            {
              backgroundColor: colors.primary50,
              transform: [
                {
                  translateX: blobShift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 20]
                  })
                },
                {
                  translateY: blobShift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 20]
                  })
                },
                {
                  scale: blobPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.08]
                  })
                }
              ],
              opacity: 0.8
            }
          ]}
        />
        <Animated.View
          style={[
            styles.blobSmall,
            {
              backgroundColor: colors.focus,
              transform: [
                {
                  translateX: blobShift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, -10]
                  })
                },
                {
                  translateY: blobShift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, -8]
                  })
                },
                {
                  scale: blobPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.15]
                  })
                }
              ],
              opacity: 0.5
            }
          ]}
        />
        <Animated.View
          style={[
            styles.blobBottom,
            {
              backgroundColor: colors.primary,
              transform: [
                {
                  translateX: blobShift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, -25]
                  })
                },
                {
                  translateY: blobShift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 12]
                  })
                },
                {
                  scale: blobPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.05]
                  })
                }
              ],
              opacity: 0.22
            }
          ]}
        />
        <Animated.View
          style={[
            styles.blobBottomRight,
            {
              backgroundColor: colors.focus,
              transform: [
                {
                  translateX: blobShift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 18]
                  })
                },
                {
                  translateY: blobShift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, -8]
                  })
                },
                {
                  scale: blobPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.06]
                  })
                }
              ],
              opacity: 0.18
            }
          ]}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.wrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Animated.View style={[styles.heroHeader, { opacity: heroFade, transform: [{ scale: heroScale }] }]}>
          <Text
            style={[
              styles.overline,
              { color: colors.primary700, fontWeight: "700", letterSpacing: 0.4 }
            ]}
          >
            Secura
          </Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Secure file vault</Text>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>
            Built for privacy, clarity, and control on the go.
          </Text>
          <View style={styles.heroActions}>
            <PrimaryButton title="Upload File" onPress={handleUpload} disabled={busy} />
            {successNote ? (
              <View style={[styles.successChip, { backgroundColor: colors.badgeBg }]}>
                <Feather name="check" size={14} color={colors.badgeText} />
                <Text style={[styles.successText, { color: colors.badgeText, marginLeft: 6 }]}>
                  {successNote}
                </Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        <View style={[styles.usageCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <View style={styles.usageHeader}>
            <View>
              <Text style={[styles.usageTitle, { color: colors.textPrimary }]}>Storage usage</Text>
              <Text style={[styles.usageMeta, { color: colors.textSecondary }]}>
                {formatBytes(totalBytes)} of {formatBytes(totalQuota)}
              </Text>
            </View>
            <View style={[styles.usageBadge, { backgroundColor: colors.primary50 }]}>
              <Text style={[styles.usageBadgeText, { color: colors.primary700 }]}>
                {files.length} files
              </Text>
            </View>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant, marginTop: spacing.md }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(usageRatio * 100)}%`, backgroundColor: colors.primary }
              ]}
            />
          </View>
          <Text style={[styles.usageHint, { color: colors.textTertiary }]}>
            Last sync {new Date().toLocaleTimeString()}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Your Files</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Encrypted at rest. Only you can access them.
          </Text>

          {uploadProgress > 0 ? (
            <View style={styles.progressRow}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {Math.round(uploadProgress * 100)}%
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(uploadProgress * 100)}%`, backgroundColor: colors.primary }
                  ]}
                />
              </View>
            </View>
          ) : null}
          {encryptingName ? (
            <Text style={[styles.encryptNote, { color: colors.textSecondary }]}>
              {encrypting ? "Encrypting" : "Encrypted"}: {encryptingName}
            </Text>
          ) : null}

          <View style={styles.sortRow}>
            {[
              { key: "recent", label: "Recent" },
              { key: "name", label: "Name" },
              { key: "size", label: "Size" }
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.sortChip,
                  {
                    backgroundColor: sortBy === item.key ? colors.primary : colors.primary50,
                    borderColor: colors.outline
                  }
                ]}
                onPress={() => setSortBy(item.key)}
              >
                <Text
                  style={{
                    color: sortBy === item.key ? colors.surface : colors.primary700,
                    fontSize: 12,
                    fontWeight: "600"
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredFiles.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surfaceVariant }]}>
              <View style={styles.emptyIcon}>
                <Feather name="upload-cloud" size={18} color={colors.primary700} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {query ? "No matches found" : "No files yet"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {query ? "Try a different search term." : "Upload your first file to get started."}
              </Text>
            </View>
          ) : (
            sortedFiles.map((file) => (
              <View
                key={file.fileId}
                style={[styles.fileRow, { borderBottomColor: colors.outline }]}
              >
                <TouchableOpacity
                  style={styles.fileInfo}
                  onPress={() =>
                    navigation.navigate("FileDetail", {
                      fileId: file.fileId,
                      fileName: file.originalName
                    })
                  }
                >
                  <View style={styles.fileTitleRow}>
                    <Feather
                      name={getFileIcon(file.originalName)}
                      size={14}
                      color={colors.textTertiary}
                      style={styles.fileTitleIcon}
                    />
                    <Text style={[styles.fileName, { color: colors.textPrimary }]}>
                      {file.originalName}
                    </Text>
                  </View>
                  <View style={styles.fileMetaRow}>
                    <Feather
                      name="clock"
                      size={12}
                      color={colors.textTertiary}
                      style={styles.fileMetaIcon}
                    />
                    <Text style={[styles.fileMeta, { color: colors.textTertiary }]}>
                      {(file.sizeBytes / 1024).toFixed(1)} KB - {new Date(file.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.fileActions}>
                  <TouchableOpacity
                    style={[styles.downloadButton, { backgroundColor: colors.primary50 }]}
                    onPress={() => handleDownload(file)}
                  >
                    <Feather name="download" size={14} color={colors.primary700} />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.badge,
                      { color: colors.badgeText, backgroundColor: colors.badgeBg }
                    ]}
                  >
                    Encrypted
                  </Text>
                </View>
              </View>
            ))
          )}

        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Feather name="search" size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search files"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={(value) => setQuery(value)}
          />
          {query ? (
            <TouchableOpacity
              onPress={() => setQuery("")}
              style={[styles.clearButton, { backgroundColor: colors.primary50 }]}
            >
              <Feather name="x" size={14} color={colors.primary700} />
            </TouchableOpacity>
          ) : null}
        </View>
        {notice ? (
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>{notice}</Text>
        ) : null}

        {recentFiles.length > 0 ? (
          <View style={[styles.recentWrap, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.recentTitle, { color: colors.textPrimary }]}>
              Recent uploads
            </Text>
            {recentFiles.map((file) => (
              <View key={file.fileId} style={styles.recentRow}>
                <Feather name="file" size={14} color={colors.textTertiary} />
                <View style={styles.recentInfo}>
                  <Text style={[styles.recentText, { color: colors.textSecondary }]}>
                    {file.originalName}
                  </Text>
                  <Text style={[styles.recentMeta, { color: colors.textTertiary }]}>
                    {(file.sizeBytes / 1024).toFixed(1)} KB -{" "}
                    {new Date(file.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.downloadButton,
                    { backgroundColor: colors.primary50, marginLeft: "auto" }
                  ]}
                  onPress={() => handleDownload(file)}
                >
                  <Feather name="download" size={14} color={colors.primary700} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <FabMenu
        onNavigate={(target) => navigation.navigate(target)}
        onQuickUpload={handleUpload}
        activeRoute="Main"
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
  blobLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 0
  },
  blob: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -80,
    right: -60
  },
  blobSmall: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    top: 10,
    left: -40
  },
  blobBottom: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    bottom: -110,
    left: -80
  },
  blobBottomRight: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: "30%",
    right: "10%",
    transform: [{ translateX: 110 }, { translateY: 110 }]
  },
  heroHeader: {},
  heroActions: {
    marginTop: spacing.md
  },
  searchBar: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 15
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  noticeText: {
    marginTop: spacing.sm,
    fontSize: 12
  },
  overline: {
    ...typography.overline,
    textTransform: "uppercase",
    color: "#94A3B8"
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    marginTop: spacing.sm
  },
  caption: {
    ...typography.caption,
    marginTop: spacing.sm
  },
  card: {
    marginTop: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg
  },
  usageCard: {
    marginTop: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg
  },
  usageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: "700"
  },
  usageMeta: {
    fontSize: 12,
    marginTop: spacing.xs
  },
  usageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  usageBadgeText: {
    fontSize: 12,
    fontWeight: "600"
  },
  usageHint: {
    marginTop: spacing.sm,
    fontSize: 11
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600"
  },
  cardSubtitle: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 20
  },
  emptyState: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 12
  },
  emptyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 111, 255, 0.12)",
    marginBottom: spacing.sm
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  fileRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  fileInfo: {
    flex: 1,
    paddingRight: spacing.md
  },
  fileTitleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  fileTitleIcon: {
    marginRight: spacing.sm
  },
  fileName: {
    fontSize: 16,
    fontWeight: "600"
  },
  fileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs
  },
  fileMetaIcon: {
    marginRight: spacing.xs
  },
  fileMeta: {
    fontSize: 12
  },
  fileActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: spacing.sm
  },
  badge: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm
  },
  progressText: {
    width: 42,
    fontSize: 12,
    fontWeight: "600"
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999
  },
  encryptNote: {
    fontSize: 12,
    marginBottom: spacing.sm
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.md,
    marginBottom: spacing.sm
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.sm
  },
  recentWrap: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm
  },
  recentText: {
    fontSize: 13
  },
  recentInfo: {
    marginLeft: spacing.sm,
    flex: 1
  },
  recentMeta: {
    marginTop: 2,
    fontSize: 11
  },
  downloadButton: {
    marginLeft: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  successChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  successText: {
    fontSize: 12,
    fontWeight: "600"
  }
});
