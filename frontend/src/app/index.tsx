import { Redirect, type Href } from "expo-router";
import { SessionRestoration } from "@/components/session-restoration";
import { useAuth } from "@/features/auth/auth-context";

export default function Index() {
  const { status } = useAuth();
  if (status === "restoring")
    return (
      <SessionRestoration />
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
