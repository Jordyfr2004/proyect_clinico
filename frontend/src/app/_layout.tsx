import { useReducedMotionPreference } from "@/hooks/use-reduced-motion";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/features/auth/auth-context";
// Register native cleanup before restoring a token, including rejected identities.
import '@/features/patient/reminders';
import '@/features/patient/file-cache';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from "react-native-safe-area-context";

export default function RootLayout() {
  const reducedMotion = useReducedMotionPreference();
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? "none" : "fade" }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
