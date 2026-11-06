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
import Services from "../services";
import { useRemote } from "@/hooks/use-remote";
import { uploadProfilePhoto } from "@/features/patient/profile";
import { requestAppointment } from "@/features/patient/appointments";
import { ApiError } from "@/api/errors";

jest.mock("@/hooks/use-remote", () => ({ useRemote: jest.fn() }));
jest.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    signOut: jest.fn(),
    user: { email: "ana@example.com" },
  }),
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

  test("shows only the error and retry action when clinical history fails", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: "No fue posible conectar con el servidor.",
      reload: jest.fn(),
    });

    renderScreen(<History />);

    expect(screen.getByText("No fue posible conectar con el servidor.")).toBeTruthy();
    expect(screen.queryByText("Sin historial clínico")).toBeNull();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

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

  test("shows an appointment error without claiming the list is empty", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: "No fue posible cargar las citas.",
      reload: jest.fn(),
    });

    renderScreen(<Appointments />);

    expect(screen.getByText("No fue posible cargar las citas.")).toBeTruthy();
    expect(screen.queryByText("Aún no tienes citas")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Solicitar una cita" }).props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  test("shows a services error without claiming the catalog is empty", () => {
    (useRemote as jest.Mock)
      .mockReturnValueOnce({
        data: null,
        loading: false,
        error: "No fue posible cargar las categorías.",
        reload: jest.fn(),
      })
      .mockReturnValueOnce({
        data: null,
        loading: false,
        error: "No fue posible cargar los servicios.",
        reload: jest.fn(),
      });

    renderScreen(<Services />);

    expect(screen.getByText("No fue posible cargar las categorías.")).toBeTruthy();
    expect(screen.queryByText("Sin servicios disponibles")).toBeNull();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  test("shows confirmed empty appointment and service responses", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: [],
      loading: false,
      error: "",
      reload: jest.fn(),
    });

    const appointments = renderScreen(<Appointments />);
    expect(screen.getByText("Aún no tienes citas")).toBeTruthy();
    appointments.unmount();

    renderScreen(<Services />);
    expect(screen.getByText("Sin servicios disponibles")).toBeTruthy();
  });

  test("shows service image, category and available details after filtering", () => {
    const categories = { data: [{ id: "c1", name: "Consulta" }, { id: "c2", name: "Tratamientos" }], loading: false, error: "", reload: jest.fn() };
    const services = { data: [
        { id: "s1", categoryId: "c1", name: "Valoración", description: "Revisión inicial", price: "20.00", durationMinutes: 30, image: "https://example.com/consulta.jpg", category: { id: "c1", name: "Consulta" } },
        { id: "s2", categoryId: "c2", name: "Limpieza", description: null, price: null, durationMinutes: null, image: "javascript:bad", category: { id: "c2", name: "Tratamientos" } },
      ], loading: false, error: "", reload: jest.fn() };
    let calls = 0;
    (useRemote as jest.Mock).mockImplementation(() => (++calls % 2 ? categories : services));

    renderScreen(<Services />);
    expect(screen.getByLabelText("Imagen de Valoración")).toBeTruthy();
    expect(screen.getByText("Revisión inicial")).toBeTruthy();
    expect(screen.getByText("30 min")).toBeTruthy();
    expect(screen.getByText("$20.00")).toBeTruthy();
    expect(screen.queryByLabelText("Imagen de Limpieza")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "Elegir categoría, Todos los servicios" }));
    fireEvent.press(screen.getByRole("button", { name: "Tratamientos" }));
    expect(screen.queryByText("Valoración")).toBeNull();
    expect(screen.getByText("Limpieza")).toBeTruthy();
    expect(screen.getByText("Consultar precio")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Elegir categoría, Tratamientos" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Consulta" })).toBeNull();
  });

  test("disables appointment requests during the initial load", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: null,
      loading: true,
      error: "",
      reload: jest.fn(),
    });

    renderScreen(<Appointments />);

    expect(
      screen.getByRole("button", { name: "Solicitar una cita" }).props
        .accessibilityState.disabled,
    ).toBe(true);
    expect(screen.queryByText("Aún no tienes citas")).toBeNull();
  });

  test("enables appointment requests only after a successful list without pending requests", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: [],
      loading: false,
      error: "",
      reload: jest.fn(),
    });

    renderScreen(<Appointments />);

    expect(
      screen.getByRole("button", { name: "Solicitar una cita" }).props
        .accessibilityState.disabled,
    ).toBe(false);
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

  test("sends only one appointment request while submission is in progress", async () => {
    let resolveRequest!: (message: string) => void;
    (requestAppointment as jest.Mock).mockReturnValue(
      new Promise<string>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    (useRemote as jest.Mock).mockReturnValue({
      data: [],
      loading: false,
      error: "",
      reload: jest.fn().mockResolvedValue({ ok: true, data: [] }),
    });

    renderScreen(<Appointments />);
    const button = screen.getByRole("button", { name: "Solicitar una cita" });
    fireEvent.press(button);
    fireEvent.press(button);

    expect(requestAppointment).toHaveBeenCalledTimes(1);
    resolveRequest("Solicitud registrada.");
    await waitFor(() => expect(screen.getByText("Solicitud registrada.")).toBeTruthy());
  });

  test("keeps a confirmed request blocked when the following list refresh fails", async () => {
    (requestAppointment as jest.Mock).mockResolvedValue("Solicitud registrada.");
    (useRemote as jest.Mock).mockReturnValue({
      data: [],
      loading: false,
      error: "",
      reload: jest.fn().mockResolvedValue({ ok: false }),
    });

    renderScreen(<Appointments />);
    fireEvent.press(screen.getByRole("button", { name: "Solicitar una cita" }));

    await waitFor(() => {
      expect(screen.getByText("Solicitud registrada.")).toBeTruthy();
      expect(
        screen.getByText(
          "La solicitud fue registrada, pero no se pudo actualizar el listado. Reintenta la actualización antes de solicitar otra cita.",
        ),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Solicitud pendiente" }).props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  test("treats HTTP 409 as authoritative proof of an existing request", async () => {
    (requestAppointment as jest.Mock).mockRejectedValue(
      new ApiError(409, "Ya tienes una solicitud pendiente."),
    );
    (useRemote as jest.Mock).mockReturnValue({
      data: [],
      loading: false,
      error: "",
      reload: jest.fn(),
    });

    renderScreen(<Appointments />);
    fireEvent.press(screen.getByRole("button", { name: "Solicitar una cita" }));

    await waitFor(() =>
      expect(screen.getByText("Ya tienes una solicitud pendiente.")).toBeTruthy(),
    );
    expect(
      screen.getByRole("button", { name: "Solicitud pendiente" }).props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  test("keeps previous appointments visible when an update fails", () => {
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
      error: "No se pudo actualizar el listado.",
      reload: jest.fn(),
    });

    renderScreen(<Appointments />);

    expect(screen.getByText("No se pudo actualizar el listado.")).toBeTruthy();
    expect(screen.getByText("Cita programada")).toBeTruthy();
    expect(screen.getByText("Toca para ver día y hora")).toBeTruthy();
    expect(screen.queryByText("Aún no tienes citas")).toBeNull();
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

  test("opens a short schedule window only for a programmed appointment", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: [
        { id: "a1", patientId: "p1", date: "2026-11-11", startTime: "13:00:00", endTime: "14:00:00", type: "cita_medica", description: null, status: "programada", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        { id: "a2", patientId: "p1", date: null, startTime: null, endTime: null, type: "cita_medica", description: null, status: "pendiente", createdAt: "2026-01-01", updatedAt: "2026-01-01" },
      ],
      loading: false,
      error: "",
      reload: jest.fn(),
    });

    renderScreen(<Appointments />);
    expect(screen.queryByText("Cita agendada")).toBeNull();
    expect(screen.queryByText("2026-11-11")).toBeNull();
    expect(screen.queryByText("13:00:00 – 14:00:00")).toBeNull();
    expect(screen.queryByRole("button", { name: /Ver solicitud pendiente/ })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: /Ver cita programada/ }));
    expect(screen.getByText("Cita agendada")).toBeTruthy();
    expect(screen.getByText("Miércoles 11 de noviembre, 13:00")).toBeTruthy();
    expect(screen.queryByText("14:00")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByText("Cita agendada")).toBeNull();
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

  test("offers retry when the initial profile request fails", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: null,
      loading: false,
      error: "No fue posible cargar el perfil.",
      reload: jest.fn(),
    });

    renderScreen(<Profile />);

    expect(screen.getByText("No fue posible cargar el perfil.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  test("keeps the confirmed profile visible during a refresh", () => {
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
      loading: true,
      error: "",
      reload: jest.fn(),
    });

    renderScreen(<Profile />);

    expect(screen.getByText("Ana Pérez")).toBeTruthy();
    expect(screen.queryByText("Cargando información…")).toBeNull();
  });

  test("shows the signed-in email in the patient profile", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: {
        photoUrl: null,
        code: "PAC-1",
        names: "Ana PÃ©rez",
        nationalId: "0102",
        phone: "099",
        address: "Quito",
        birthdate: "1990-01-01",
      },
      loading: false,
      error: "",
      reload: jest.fn(),
    });

    renderScreen(<Profile />);

    expect(screen.getByText("Correo")).toBeTruthy();
    expect(screen.getByText("ana@example.com")).toBeTruthy();
  });

  test("shows the birthdate in a Spanish day-month-year format", () => {
    (useRemote as jest.Mock).mockReturnValue({
      data: {
        photoUrl: null,
        code: "PAC-1",
        names: "Ana PÃ©rez",
        nationalId: "0102",
        phone: "099",
        address: "Quito",
        birthdate: "1990-10-08",
      },
      loading: false,
      error: "",
      reload: jest.fn(),
    });

    renderScreen(<Profile />);

    expect(screen.getByText("08 de octubre de 1990")).toBeTruthy();
  });
});
