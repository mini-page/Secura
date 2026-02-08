import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { radius } from "../theme/tokens";

export default function SecondaryButton({ title, onPress, disabled, style, icon }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { borderColor: colors.outline, backgroundColor: colors.surface },
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon ? (
        <Feather name={icon} size={16} color={colors.textPrimary} style={styles.icon} />
      ) : null}
      <Text style={[styles.text, { color: colors.textPrimary }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "transparent"
  },
  text: {
    fontWeight: "600",
    fontSize: 14
  },
  icon: {
    marginRight: 8
  },
  disabled: {
    opacity: 0.5
  }
});
