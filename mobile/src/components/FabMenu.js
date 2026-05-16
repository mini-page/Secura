import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { radius, spacing } from "../theme/tokens";

export default function FabMenu({ onNavigate, onQuickUpload, activeRoute, isAdmin }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;

  function handleNavigate(target) {
    setOpen(false);
    onNavigate(target);
  }

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 60
        })
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.92);
    }
  }, [open, opacity, scale]);

  function handleFabPressIn() {
    Animated.spring(fabScale, { toValue: 0.965, useNativeDriver: true }).start();
  }

  function handleFabPressOut() {
    Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }).start();
  }

  return (
    <>
      <Animated.View style={{ transform: [{ scale: fabScale }] }}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setOpen(true)}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          activeOpacity={0.9}
        >
          <Feather name="menu" size={22} color={colors.surface} />
        </TouchableOpacity>
      </Animated.View>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
          onPress={() => setOpen(false)}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                opacity,
                transform: [{ scale }]
              },
              { backgroundColor: colors.surface }
            ]}
          >
            <Text style={[styles.sheetTitle, { color: colors.textSecondary }]}>Quick Actions</Text>
            <TouchableOpacity
              style={styles.itemRow}
              onPress={() => {
                setOpen(false);
                onQuickUpload?.();
              }}
            >
              <View style={[styles.iconBadge, { backgroundColor: colors.iconBadge }]}>
                <Feather name="upload" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.itemText, { color: colors.textPrimary }]}>Upload File</Text>
            </TouchableOpacity>

            <View style={[styles.separator, { backgroundColor: colors.outline }]} />
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Navigate</Text>
            <TouchableOpacity
              style={[
                styles.itemRow,
                activeRoute === "Main" && styles.itemRowActive,
                activeRoute === "Main" && { backgroundColor: colors.primary50 }
              ]}
              onPress={() => handleNavigate("Main")}
            >
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor:
                      activeRoute === "Main" ? colors.primary : colors.iconBadge
                  }
                ]}
              >
                <Feather
                  name="folder"
                  size={16}
                  color={activeRoute === "Main" ? colors.surface : colors.textPrimary}
                />
              </View>
              <View style={styles.itemTextGroup}>
                <Text
                  style={[
                    styles.itemText,
                    { color: activeRoute === "Main" ? colors.primary : colors.textPrimary }
                  ]}
                >
                  Files
                </Text>
                {activeRoute === "Main" ? (
                  <Text style={[styles.itemSubText, { color: colors.textSecondary }]}>
                    Current
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.itemRow,
                activeRoute === "Activity" && styles.itemRowActive,
                activeRoute === "Activity" && { backgroundColor: colors.primary50 }
              ]}
              onPress={() => handleNavigate("Activity")}
            >
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor:
                      activeRoute === "Activity" ? colors.primary : colors.iconBadge
                  }
                ]}
              >
                <Feather
                  name="activity"
                  size={16}
                  color={activeRoute === "Activity" ? colors.surface : colors.textPrimary}
                />
              </View>
              <View style={styles.itemTextGroup}>
                <Text
                  style={[
                    styles.itemText,
                    { color: activeRoute === "Activity" ? colors.primary : colors.textPrimary }
                  ]}
                >
                  Activity
                </Text>
                {activeRoute === "Activity" ? (
                  <Text style={[styles.itemSubText, { color: colors.textSecondary }]}>
                    Current
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.itemRow,
                activeRoute === "Settings" && styles.itemRowActive,
                activeRoute === "Settings" && { backgroundColor: colors.primary50 }
              ]}
              onPress={() => handleNavigate("Settings")}
            >
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor:
                      activeRoute === "Settings" ? colors.primary : colors.iconBadge
                  }
                ]}
              >
                <Feather
                  name="settings"
                  size={16}
                  color={activeRoute === "Settings" ? colors.surface : colors.textPrimary}
                />
              </View>
              <View style={styles.itemTextGroup}>
                <Text
                  style={[
                    styles.itemText,
                    { color: activeRoute === "Settings" ? colors.primary : colors.textPrimary }
                  ]}
                >
                  Settings
                </Text>
                {activeRoute === "Settings" ? (
                  <Text style={[styles.itemSubText, { color: colors.textSecondary }]}>
                    Current
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.itemRow,
                activeRoute === "Auth" && styles.itemRowActive,
                activeRoute === "Auth" && { backgroundColor: colors.primary50 }
              ]}
              onPress={() => handleNavigate("Auth")}
            >
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor:
                      activeRoute === "Auth" ? colors.primary : colors.iconBadge
                  }
                ]}
              >
                <Feather
                  name="user"
                  size={16}
                  color={activeRoute === "Auth" ? colors.surface : colors.textPrimary}
                />
              </View>
              <View style={styles.itemTextGroup}>
                <Text
                  style={[
                    styles.itemText,
                    { color: activeRoute === "Auth" ? colors.primary : colors.textPrimary }
                  ]}
                >
                  Account
                </Text>
                <Text style={[styles.itemSubText, { color: colors.textSecondary }]}>
                  Security & access
                </Text>
              </View>
            </TouchableOpacity>
            {isAdmin ? (
              <>
                <View style={[styles.separator, { backgroundColor: colors.outline }]} />
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Admin</Text>
                <TouchableOpacity
                  style={[
                    styles.itemRow,
                    activeRoute === "AdminUsers" && styles.itemRowActive,
                    activeRoute === "AdminUsers" && { backgroundColor: colors.primary50 }
                  ]}
                  onPress={() => handleNavigate("AdminUsers")}
                >
                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor:
                          activeRoute === "AdminUsers" ? colors.primary : colors.iconBadge
                      }
                    ]}
                  >
                    <Feather
                      name="users"
                      size={16}
                      color={activeRoute === "AdminUsers" ? colors.surface : colors.textPrimary}
                    />
                  </View>
                  <View style={styles.itemTextGroup}>
                    <Text
                      style={[
                        styles.itemText,
                        { color: activeRoute === "AdminUsers" ? colors.primary : colors.textPrimary }
                      ]}
                    >
                      Users
                    </Text>
                    <Text style={[styles.itemSubText, { color: colors.textSecondary }]}>
                      Roles & access
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.itemRow,
                    activeRoute === "AdminAudit" && styles.itemRowActive,
                    activeRoute === "AdminAudit" && { backgroundColor: colors.primary50 }
                  ]}
                  onPress={() => handleNavigate("AdminAudit")}
                >
                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor:
                          activeRoute === "AdminAudit" ? colors.primary : colors.iconBadge
                      }
                    ]}
                  >
                    <Feather
                      name="shield"
                      size={16}
                      color={activeRoute === "AdminAudit" ? colors.surface : colors.textPrimary}
                    />
                  </View>
                  <View style={styles.itemTextGroup}>
                    <Text
                      style={[
                        styles.itemText,
                        { color: activeRoute === "AdminAudit" ? colors.primary : colors.textPrimary }
                      ]}
                    >
                      Audit Logs
                    </Text>
                    <Text style={[styles.itemSubText, { color: colors.textSecondary }]}>
                      Security trail
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : null}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.xxxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end"
  },
  sheet: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.xxxl + 68,
    borderRadius: radius.lg,
    padding: spacing.xl,
    minWidth: 240
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: spacing.md
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  separator: {
    height: 1,
    marginVertical: spacing.sm
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12
  },
  itemRowActive: {
    paddingHorizontal: spacing.md
  },
  itemTextGroup: {
    flexDirection: "column"
  },
  itemText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: spacing.sm
  },
  itemSubText: {
    fontSize: 12,
    marginLeft: spacing.sm
  }
});
