import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import Screen from "../components/Screen";
import { useTheme } from "../theme/ThemeContext";
import { spacing, typography } from "../theme/tokens";

export default function SplashScreen({ navigation }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true
      })
    ]).start(() => {
      setTimeout(() => {
        navigation.replace("Main");
      }, 500);
    });
  }, [navigation, opacity, translateY]);

  return (
    <Screen style={[styles.screen, { backgroundColor: colors.primary }]}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <Animated.View style={[styles.logoWrap, { opacity, transform: [{ translateY }] }]}>
          <View style={[styles.logoOrb, { backgroundColor: colors.primary700 }]}>
            <View style={[styles.logoCore, { backgroundColor: colors.surface }]}>
              <Feather name="shield" size={32} color={colors.primary} />
            </View>
          </View>
          <Text style={[styles.logoText, { color: colors.surface }]}>Secura</Text>
          <Text style={[styles.logoTagline, { color: "#DDE7FF" }]}>
            Secure files. Calm control.
          </Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  logoWrap: {
    alignItems: "center"
  },
  logoOrb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    shadowColor: "#0F172A",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  logoCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: {
    ...typography.title,
    color: "#FFFFFF"
  },
  logoTagline: {
    ...typography.caption,
    color: "#DDE7FF",
    marginTop: spacing.sm
  }
});
