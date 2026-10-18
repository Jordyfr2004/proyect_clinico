import { parseAppointments } from "@/features/patient/appointments";
import { getMedicalHistory, parseHistory } from "@/features/patient/history";
import { parseProfile } from "@/features/patient/profile";
import { parseCategories, parseServices } from "@/features/patient/catalog";
import { apiRequest } from "@/api/client";
import { ApiError } from "@/api/errors";

jest.mock("@/api/client", () => ({ apiRequest: jest.fn() }));

describe("patient API contracts", () => {
  test("parses appointments including an unscheduled pending request", () => {
    expect(
      parseAppointments({
        data: [
          {
            id: "1",
            paciente_id: "p1",
            fecha: null,
            hora_inicio: null,
            hora_fin: null,
            tipo: "cita_medica",
            descripcion: null,
            estado: "pendiente",
            diagnostico: null,
            tratamiento: null,
            observacion: null,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
          },
        ],
      })[0].status,
    ).toBe("pendiente");
  });

  test("parses only the clinical history fields returned by Laravel", () => {
    expect(
      parseHistory({
        data: {
          id: "h1",
          paciente_id: "p1",
          sexo: "F",
          lugar_nacimiento: null,
          antecedentes_enfermedades: null,
          cirugias: null,
          medicacion_actual: null,
        },
      }),
    ).toEqual({
      id: "h1",
      patientId: "p1",
      sex: "F",
      birthplace: null,
      illnesses: null,
      surgeries: null,
      currentMedication: null,
    });
  });

  test("treats Laravel's missing-history 404 as an empty authorized state", async () => {
    (apiRequest as jest.Mock).mockRejectedValueOnce(
      new ApiError(404, "No tienes un historial clínico registrado."),
    );

    await expect(getMedicalHistory()).resolves.toBeNull();
  });

  test("parses profile and catalog envelopes", () => {
    expect(
      parseProfile({
        data: {
          foto_perfil_url: null,
          codigo_paciente: "PAC-1",
          nombres: "Ana",
          cedula: "0102",
          telefono: "099",
          direccion: "Quito",
          fecha_nacimiento: "1990-01-01",
        },
      }).code,
    ).toBe("PAC-1");
    expect(
      parseCategories({
        data: [
          {
            id: "c1",
            nombre: "Consulta",
            activo: true,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
          },
        ],
      }),
    ).toEqual([{ id: "c1", name: "Consulta" }]);
    expect(
      parseServices({
        data: [
          {
            id: "s1",
            categoria_id: "c1",
            nombre: "Evaluación",
            descripcion: null,
            precio: "20.00",
            duracion_minutos: 30,
            imagen: null,
            activo: true,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
            categoria: {
              id: "c1",
              nombre: "Consulta",
              activo: true,
              created_at: "2026-01-01",
              updated_at: "2026-01-01",
            },
          },
        ],
      })[0].price,
    ).toBe("20.00");
  });
});
