import { Redirect, Stack, type Href } from "expo-router";
import { ReminderSync } from "@/components/reminder-sync";
import { SessionRestoration } from "@/components/session-restoration";
import { useAuth } from "@/features/auth/auth-context";
export default function PrivateLayout() {
  const { status, user } = useAuth();
  if (status === "restoring")
    return (
      <SessionRestoration />
    );
  if (status !== "authenticated")
    return <Redirect href={"/(public)/login" as Href} />;
  return (
    <SessionScope key={user?.id}>
      <ReminderSync />
      <Stack screenOptions={{ headerShown: false }} />
    </SessionScope>
  );
}
function SessionScope({ children }: { children: React.ReactNode }) { return <>{children}</>; }
