import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { radius } from "../theme/tokens";

export default function PrimaryButton({ title, onPress, disabled, style }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: colors.primary },
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, { color: colors.surface }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  text: {
    fontSize: 16,
    fontWeight: "600"
  },
  disabled: {
    opacity: 0.5
  }
});
