import { Redirect, type Href } from "expo-router";
import { LoadingState, Screen } from "@/components/ui/patient-ui";
import { useAuth } from "@/features/auth/auth-context";

export default function Index() {
  const { status } = useAuth();
  if (status === "restoring")
    return (
      <Screen scroll={false}>
        <LoadingState />
      </Screen>
    );
  return (
    <Redirect
      href={
        (status === "authenticated"
          ? "/(private)/(tabs)"
          : "/(public)/login") as Href
      }
    />
  );
}
