import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";

import History from "../history";
import Appointments from "../appointments";
import Profile from "../profile";
import { useRemote } from "@/hooks/use-remote";
import { uploadProfilePhoto } from "@/features/patient/profile";
import { requestAppointment } from "@/features/patient/appointments";

jest.mock("@/hooks/use-remote", () => ({ useRemote: jest.fn() }));
jest.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));
jest.mock("@/features/patient/profile", () => ({
  getProfile: jest.fn(),
  uploadProfilePhoto: jest.fn(),
  deleteProfilePhoto: jest.fn(),
}));
jest.mock("@/features/patient/appointments", () => ({
  getAppointments: jest.fn(),
  requestAppointment: jest.fn(),
}));
jest.mock("@/api/client", () => ({ authenticatedImageSource: jest.fn() }));
jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const renderScreen = (element: React.ReactElement) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 720 },
        insets: { top: 24, left: 0, right: 0, bottom: 24 },
      }}
    >
      {element}
    </SafeAreaProvider>,
  );

describe("patient screens", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shows an informative empty state when the patient has no clinical history", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: "",
      reload: jest.fn(),
    });

    renderScreen(<History />);

    expect(screen.getByText("Sin historial clínico")).toBeTruthy();
    expect(
      screen.getByText(
        "El personal autorizado todavía no ha registrado un historial para tu cuenta.",
      ),
    ).toBeTruthy();
  });

  test("disables a duplicate appointment request while a pending request exists", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: [
        {
          id: "a1",
          patientId: "p1",
          date: null,
          startTime: null,
          endTime: null,
          type: "cita_medica",
          description: null,
          status: "pendiente",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
      loading: false,
      error: "",
      reload: jest.fn(),
    });

    renderScreen(<Appointments />);
    const button = screen.getByRole("button", { name: "Solicitud pendiente" });
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(requestAppointment).not.toHaveBeenCalled();
  });

  test("shows Laravel's cita_medica type as a patient-facing label", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: [
        {
          id: "a1",
          patientId: "p1",
          date: "2026-10-20",
          startTime: "09:00:00",
          endTime: "10:00:00",
          type: "cita_medica",
          description: null,
          status: "programada",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
      loading: false,
      error: "",
      reload: jest.fn(),
    });

    renderScreen(<Appointments />);

    expect(screen.getByText("Cita médica")).toBeTruthy();
    expect(screen.queryByText("cita_medica")).toBeNull();
  });

  test("rejects an unsupported profile image when Android omits its MIME type", async () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: {
        photoUrl: null,
        code: "PAC-1",
        names: "Ana Pérez",
        nationalId: "0102",
        phone: "099",
        address: "Quito",
        birthdate: "1990-01-01",
      },
      loading: false,
      error: "",
      reload: jest.fn(),
    });
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({
      granted: true,
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/profile.gif",
          fileName: "profile.gif",
          mimeType: undefined,
          fileSize: 1024,
        },
      ],
    });

    renderScreen(<Profile />);
    const cameraButton = screen.getAllByRole("button", {
      name: "Cambiar foto",
    })[0];
    const cameraStyle = StyleSheet.flatten(cameraButton.props.style);
    expect(cameraStyle.width).toBeGreaterThanOrEqual(44);
    expect(cameraStyle.height).toBeGreaterThanOrEqual(44);
    fireEvent.press(cameraButton);

    await waitFor(() =>
      expect(
        screen.getByText("La foto debe ser JPG, PNG o WebP."),
      ).toBeTruthy(),
    );
    expect(uploadProfilePhoto).not.toHaveBeenCalled();
  });
});
