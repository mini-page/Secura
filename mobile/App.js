import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeFade, ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import SplashScreen from "./src/screens/SplashScreen";
import FilesScreen from "./src/screens/FilesScreen";
import ActivityScreen from "./src/screens/ActivityScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import AuthScreen from "./src/screens/AuthScreen";
import FileDetailScreen from "./src/screens/FileDetailScreen";
import AdminUsersScreen from "./src/screens/AdminUsersScreen";
import AdminAuditScreen from "./src/screens/AdminAuditScreen";

const Stack = createNativeStackNavigator();

function NavigationShell() {
  const { scheme, colors } = useTheme();
  const navTheme = {
    dark: scheme === "dark",
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.outline,
      notification: colors.primary
    }
  };

  return (
    <ThemeFade>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: "fade"
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Main" component={FilesScreen} />
          <Stack.Screen
            name="FileDetail"
            component={FileDetailScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="Activity"
            component={ActivityScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="AdminUsers"
            component={AdminUsersScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="AdminAudit"
            component={AdminAuditScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ animation: "slide_from_right" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeFade>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NavigationShell />
      </ThemeProvider>
    </AuthProvider>
  );
}
