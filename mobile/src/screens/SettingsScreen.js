import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import SecondaryButton from "../components/SecondaryButton";
import { useAuth } from "../context/AuthContext";
import FabMenu from "../components/FabMenu";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/tokens";
import { getApiBase } from "../api/client";

export default function SettingsScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { colors, mode, setMode } = useTheme();
  const [autoLock, setAutoLock] = useState(true);
  const [biometrics, setBiometrics] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [privacyShield, setPrivacyShield] = useState(true);
  const [clipboardTimeout, setClipboardTimeout] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectingName, setConnectingName] = useState("");
  const connections = [
    {
      name: "Google Drive",
      status: "Not linked",
      icon: <FontAwesome5 name="google-drive" size={18} color="#0F9D58" />
    },
    {
      name: "iCloud",
      status: "Not linked",
      icon: <FontAwesome5 name="apple" size={18} color="#111111" />
    },
    {
      name: "Samsung Cloud",
      status: "Not linked",
      icon: <MaterialCommunityIcons name="cloud" size={20} color="#1428A0" />
    },
    {
      name: "OneDrive",
      status: "Not linked",
      icon: <MaterialCommunityIcons name="microsoft-onedrive" size={20} color="#0078D4" />
    }
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={[styles.overline, { color: colors.textTertiary }]}>Settings</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Preferences</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Theme</Text>
          <View style={[styles.segment, { backgroundColor: colors.primary50, borderColor: colors.outline }]}>
            {["light", "dark", "system"].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.segmentButton,
                  { backgroundColor: mode === option ? colors.primary : "transparent" }
                ]}
                onPress={() => setMode(option)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: mode === option ? colors.surface : colors.primary700 }
                  ]}
                >
                  {option === "light" ? "Light" : option === "dark" ? "Dark" : "System"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.helperText, { color: colors.textTertiary }]}>
            System matches your device settings.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Security</Text>
          <View style={styles.row}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Auto-lock</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Lock after 2 minutes of inactivity.
              </Text>
            </View>
            <Switch
              value={autoLock}
              onValueChange={setAutoLock}
              trackColor={{ false: colors.outline, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          <View style={styles.row}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Biometric unlock</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Use fingerprint or Face ID.
              </Text>
            </View>
            <Switch
              value={biometrics}
              onValueChange={setBiometrics}
              trackColor={{ false: colors.outline, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notifications</Text>
          <View style={styles.row}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Security alerts</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Get notified about file access.
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.outline, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Privacy</Text>
          <View style={styles.row}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                Hide app previews
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Blur Secura in the app switcher.
              </Text>
            </View>
            <Switch
              value={privacyShield}
              onValueChange={setPrivacyShield}
              trackColor={{ false: colors.outline, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          <View style={styles.row}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                Clipboard timeout
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Clear copied links after 60 seconds.
              </Text>
            </View>
            <Switch
              value={clipboardTimeout}
              onValueChange={setClipboardTimeout}
              trackColor={{ false: colors.outline, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Experience</Text>
          <View style={styles.row}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                Haptic feedback
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Subtle taps for secure actions.
              </Text>
            </View>
            <Switch
              value={haptics}
              onValueChange={setHaptics}
              trackColor={{ false: colors.outline, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          <View style={styles.row}>
            <View>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                Reduce motion
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                Minimize animated transitions.
              </Text>
            </View>
            <Switch
              value={reduceMotion}
              onValueChange={setReduceMotion}
              trackColor={{ false: colors.outline, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Connections</Text>
          {connections.map((item) => (
            <View key={item.name} style={styles.connectionRow}>
              <View>
                <View style={styles.connectionTitleRow}>
                  <View style={styles.connectionIcon}>{item.icon}</View>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    {item.name}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.linkBadge, { borderColor: colors.outline }]}
                onPress={() => {
                  setConnectingName(item.name);
                  setConnecting(true);
                  setTimeout(() => {
                    setConnecting(false);
                  }, 1400);
                }}
              >
                <Text style={[styles.linkBadgeText, { color: colors.primary }]}>Link</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Account</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Signed in as</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{user?.email}</Text>
          <Text style={[styles.caption, { color: colors.textTertiary }]}>Role: {user?.role}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Developer</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>API Base</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{getApiBase()}</Text>
          <Text style={[styles.caption, { color: colors.textTertiary }]}>
            Change this in `src/api/client.js`.
          </Text>
        </View>

        <SecondaryButton
          title="Sign Out"
          icon="log-out"
          onPress={signOut}
          style={styles.signOut}
        />
      </ScrollView>
      <FabMenu
        onNavigate={(target) => navigation.navigate(target)}
        activeRoute="Settings"
        isAdmin={user?.role === "admin"}
      />

      <Modal transparent visible={connecting} animationType="fade">
        <View style={[styles.connectBackdrop, { backgroundColor: colors.backdrop }]}>
          <View style={[styles.connectCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.connectTitle, { color: colors.textPrimary }]}>
              Connecting to {connectingName}
            </Text>
            <Text style={[styles.connectSubtitle, { color: colors.textSecondary }]}>
              Opening secure connection...
            </Text>
            <ActivityIndicator color={colors.primary} style={styles.connectSpinner} />
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
  overline: {
    ...typography.overline,
    textTransform: "uppercase"
  },
  title: {
    ...typography.title,
    marginTop: spacing.sm
  },
  card: {
    marginTop: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: spacing.md
  },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 4
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center"
  },
  segmentText: {
    fontWeight: "600",
    fontSize: 13
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600"
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: spacing.xs
  },
  helperText: {
    fontSize: 12,
    marginTop: spacing.sm
  },
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm
  },
  connectionTitleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  connectionIcon: {
    marginRight: spacing.sm
  },
  linkBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  },
  linkBadgeText: {
    fontSize: 12,
    fontWeight: "600"
  },
  connectBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  connectCard: {
    width: "82%",
    borderRadius: 18,
    padding: spacing.xl,
    alignItems: "center"
  },
  connectTitle: {
    fontSize: 16,
    fontWeight: "700"
  },
  connectSubtitle: {
    fontSize: 13,
    marginTop: spacing.xs
  },
  connectSpinner: {
    marginTop: spacing.md
  },
  label: {
    ...typography.caption,
    marginTop: spacing.sm
  },
  value: {
    marginTop: spacing.sm,
    fontSize: 16,
    fontWeight: "600"
  },
  caption: {
    ...typography.caption,
    marginTop: spacing.sm
  },
  signOut: {
    marginTop: spacing.xl
  }
});
