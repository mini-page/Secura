import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import TextField from "../components/TextField";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/tokens";

export default function AuthScreen() {
  const { signIn, signUp, signInGuest, message, busy, setMessage } = useAuth();
  const { colors, scheme } = useTheme();
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);

  async function handleAuth() {
    setMessage("");
    if (authMode === "login") {
      await signIn(email, password).catch(() => {});
    } else {
      await signUp(email, password).catch(() => {});
    }
  }

  return (
    <Screen>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.authWrap}>
        <Text style={[styles.overline, { color: colors.textTertiary }]}>
          Secure File Storage
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Secura</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Protecting files with clarity, control, and calm security.
        </Text>

        <View style={[styles.segment, { backgroundColor: colors.primary50, borderColor: colors.outline }]}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              { backgroundColor: authMode === "login" ? colors.primary : "transparent" }
            ]}
            onPress={() => setAuthMode("login")}
          >
            <Text
              style={[
                styles.segmentText,
                { color: authMode === "login" ? colors.surface : colors.primary700 },
                authMode === "login" && styles.segmentTextActive
              ]}
            >
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              { backgroundColor: authMode === "register" ? colors.primary : "transparent" }
            ]}
            onPress={() => setAuthMode("register")}
          >
            <Text
              style={[
                styles.segmentText,
                { color: authMode === "register" ? colors.surface : colors.primary700 },
                authMode === "register" && styles.segmentTextActive
              ]}
            >
              Register
            </Text>
          </TouchableOpacity>
        </View>

        <TextField
          label="Email"
          placeholder="you@sfss.app"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {message ? <Text style={[styles.message, { color: colors.error }]}>{message}</Text> : null}

        <PrimaryButton
          title={authMode === "login" ? "Sign In" : "Create Account"}
          onPress={handleAuth}
          disabled={busy}
        />

        <SecondaryButton
          title="Continue with Google"
          icon="chrome"
          onPress={() => {
            setMessage("");
            setConnecting(true);
            setTimeout(() => {
              setConnecting(false);
              setMessage("Google login is a demo placeholder.");
            }, 1400);
          }}
          disabled={busy}
          style={styles.googleButton}
        />

        <SecondaryButton
          title="Continue as Guest"
          onPress={signInGuest}
          disabled={busy}
          style={styles.guestButton}
        />
      </ScrollView>

      <Modal transparent visible={connecting} animationType="fade">
        <View style={[styles.connectBackdrop, { backgroundColor: colors.backdrop }]}>
          <View style={[styles.connectCard, { backgroundColor: colors.surface }]}>
            <View style={styles.connectIcon}>
              <FontAwesome5 name="google" size={18} color="#DB4437" />
            </View>
            <Text style={[styles.connectTitle, { color: colors.textPrimary }]}>
              Connecting to Google
            </Text>
            <Text style={[styles.connectSubtitle, { color: colors.textSecondary }]}>
              Securely opening OAuth flow...
            </Text>
            <ActivityIndicator color={colors.primary} style={styles.connectSpinner} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  authWrap: {
    paddingTop: spacing.xxl,
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
  tagline: {
    ...typography.caption,
    marginTop: spacing.sm
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    marginTop: spacing.xl,
    marginBottom: spacing.xl
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center"
  },
  segmentText: {
    fontWeight: "600"
  },
  segmentTextActive: {},
  message: {
    marginTop: spacing.md,
    fontWeight: "600"
  },
  guestButton: {
    marginTop: spacing.md
  },
  googleButton: {
    marginTop: spacing.md
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
  connectIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FDECEA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
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
  }
});
