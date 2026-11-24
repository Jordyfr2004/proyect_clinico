import { Redirect, Stack, type Href } from "expo-router";
import { SessionRestoration } from "@/components/session-restoration";
import { useAuth } from "@/features/auth/auth-context";
export default function PublicLayout() {
  const { status } = useAuth();
  if (status === "restoring")
    return (
      <SessionRestoration />
    );
  if (status === "authenticated")
    return <Redirect href={"/(private)/(tabs)" as Href} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
