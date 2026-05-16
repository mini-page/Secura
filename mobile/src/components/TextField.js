import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { radius, spacing } from "../theme/tokens";

export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none"
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { borderColor: colors.outline, backgroundColor: colors.surface, color: colors.textPrimary }
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: spacing.lg
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6
  },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16
  }
});
