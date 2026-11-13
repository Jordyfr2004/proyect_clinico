import { Redirect, Stack, type Href } from "expo-router";
import { ReminderSync } from "@/components/reminder-sync";
import { LoadingState, Screen } from "@/components/ui/patient-ui";
import { useAuth } from "@/features/auth/auth-context";
export default function PrivateLayout() {
  const { status } = useAuth();
  if (status === "restoring")
    return (
      <Screen scroll={false}>
        <LoadingState />
      </Screen>
    );
  if (status !== "authenticated")
    return <Redirect href={"/(public)/login" as Href} />;
  return (
    <>
      <ReminderSync />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}