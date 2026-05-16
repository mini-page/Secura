import { SafeAreaView, StyleSheet, StatusBar as RNStatusBar } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { spacing } from "../theme/tokens";

export default function Screen({ children, style }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: RNStatusBar.currentHeight ? RNStatusBar.currentHeight + 8 : 8,
    paddingHorizontal: spacing.xl
  }
});
