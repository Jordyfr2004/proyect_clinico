import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import PublicLayout from "../(public)/_layout";
import { useAuth } from "@/features/auth/auth-context";

jest.mock("@/features/auth/auth-context", () => ({ useAuth: jest.fn() }));
jest.mock("expo-router", () => {
  const React = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");
  return {
    Redirect: () => React.createElement(Text, null, "REDIRECT"),
    Stack: () => React.createElement(Text, null, "PUBLIC STACK"),
  };
});

describe("route guards", () => {
  test("does not expose public forms while a stored session is being restored", () => {
    (useAuth as jest.Mock).mockReturnValue({ status: "restoring" });

    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 360, height: 720 },
          insets: { top: 24, left: 0, right: 0, bottom: 24 },
        }}
      >
        <PublicLayout />
      </SafeAreaProvider>,
    );

    expect(screen.getByText("Cargando información…")).toBeTruthy();
    expect(screen.queryByText("PUBLIC STACK")).toBeNull();
  });
});
