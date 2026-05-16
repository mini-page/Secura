import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Appearance } from "react-native";
import { darkColors, lightColors } from "./themes";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState("system");
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() || "light");
  const transitionOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || "light");
    });
    return () => sub.remove();
  }, []);

  const activeScheme = mode === "system" ? systemScheme : mode;
  const colors = activeScheme === "dark" ? darkColors : lightColors;

  useEffect(() => {
    transitionOpacity.setValue(0);
    Animated.timing(transitionOpacity, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true
    }).start();
  }, [activeScheme, transitionOpacity]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      scheme: activeScheme,
      colors,
      transitionOpacity
    }),
    [mode, activeScheme, colors, transitionOpacity]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export function ThemeFade({ children }) {
  const { transitionOpacity } = useTheme();
  return <Animated.View style={{ flex: 1, opacity: transitionOpacity }}>{children}</Animated.View>;
}
