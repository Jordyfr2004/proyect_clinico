import {
  canChangeAppointment,
  parseAppointments,
} from "@/features/patient/appointments";
import { parseDocuments } from "@/features/patient/documents";
import { parsePrescriptions } from "@/features/patient/prescriptions";
import { parseHistory } from "@/features/patient/history";
import { parseProfile } from "@/features/patient/profile";
import { parseCategories, parseServices } from "@/features/patient/catalog";

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
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
          },
        ],
      })[0].status,
    ).toBe("pendiente");
  });

  test("parses the patient history envelope", () => {
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
          alergias: null,
          antecedentes_familiares: null,
          notas_adicionales: null,
        },
      }).sex,
    ).toBe("F");
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
        data: [{ id: "c1", nombre: "Consulta", descripcion: null }],
      }),
    ).toHaveLength(1);
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
            categoria: { id: "c1", nombre: "Consulta" },
          },
        ],
      })[0].price,
    ).toBe("20.00");
  });

  test("accepts nullable profile and service fields sent by the backend", () => {
    const profile = parseProfile({
      data: {
        foto_perfil_url: null,
        codigo_paciente: "PAC-2",
        nombres: "Luis",
        cedula: "0103",
        telefono: null,
        direccion: null,
        fecha_nacimiento: null,
      },
    });
    expect(profile.phone).toBeNull();
    const [service] = parseServices({
      data: [
        {
          id: "s2",
          categoria_id: "c1",
          nombre: "Limpieza",
          descripcion: "Profilaxis",
          precio: null,
          duracion_minutos: null,
          imagen: null,
          categoria: { id: "c1", nombre: "Consulta" },
        },
      ],
    });
    expect(service.price).toBeNull();
    expect(service.durationMinutes).toBeNull();
  });

  test("parses a scheduled appointment with the backend field names", () => {
    const [item] = parseAppointments({
      data: [
        {
          id: "a1",
          paciente_id: "p1",
          fecha: "2026-10-20",
          hora_inicio: "10:00:00",
          hora_fin: "11:00:00",
          tipo: "cita_medica",
          descripcion: "Limpieza",
          estado: "programada",
          created_at: "2026-10-01",
          updated_at: "2026-10-01",
        },
      ],
    });
    expect(item.date).toBe("2026-10-20");
    expect(canChangeAppointment(item, new Date("2026-10-19T09:00:00"))).toBe(true);
    expect(canChangeAppointment(item, new Date("2026-10-20T10:30:00"))).toBe(false);
    expect(canChangeAppointment({ ...item, status: "completada" })).toBe(false);
    expect(
      canChangeAppointment({ ...item, status: "pendiente", date: null, startTime: null }),
    ).toBe(true);
  });

  test("parses prescriptions and documents", () => {
    const [prescription] = parsePrescriptions({
      data: [
        {
          id: "r1",
          fecha: "2026-10-18",
          diagnostico: "Pulpitis",
          medicamentos: [
            {
              nombre: "Ibuprofeno",
              dosis: "400 mg",
              frecuencia: "Cada 8 horas",
              duracion: null,
              indicaciones: null,
            },
          ],
          indicaciones: null,
          emitida_por: { id: "d1", name: "Dra. López", role: "doctora" },
        },
      ],
    });
    expect(prescription.medications[0].name).toBe("Ibuprofeno");
    expect(prescription.issuedBy).toBe("Dra. López");
    const [document] = parseDocuments({
      data: [
        {
          id: "e1",
          paciente_id: "p1",
          tipo: "rx",
          nombre_archivo: "rx.png",
          ruta_archivo: "clinica/x.png",
          mime_type: "image/png",
          tamano: 2048,
          descripcion: null,
          fecha: "2026-10-18",
          subido_por: { id: "u1", name: "Ana", role: "paciente" },
        },
      ],
    });
    expect(document.uploadedByPatient).toBe(true);
    expect(() =>
      parseDocuments({ data: [{ ...{ id: "e2", tipo: "otro" } }] }),
    ).toThrow();
  });
});
