import { apiRequest } from "@/api/client";
import { ApiError } from "@/api/errors";
import {
  asOptionalString,
  asRecord,
  asString,
  parseEnvelope,
} from "@/validation/primitives";

export type MedicalHistory = {
  id: string;
  patientId: string;
  sex: string | null;
  birthplace: string | null;
  illnesses: string | null;
  surgeries: string | null;
  currentMedication: string | null;
};
export const parseHistory = (value: unknown): MedicalHistory =>
  parseEnvelope(value, (data) => {
    const r = asRecord(data, "El historial clínico");
    return {
      id: asString(r, "id"),
      patientId: asString(r, "paciente_id"),
      sex: asOptionalString(r, "sexo"),
      birthplace: asOptionalString(r, "lugar_nacimiento"),
      illnesses: asOptionalString(r, "antecedentes_enfermedades"),
      surgeries: asOptionalString(r, "cirugias"),
      currentMedication: asOptionalString(r, "medicacion_actual"),
    };
  });
export const getMedicalHistory = async (patientId?: string): Promise<MedicalHistory | null> => {
  try {
    const history = parseHistory(await apiRequest("/paciente/mi-historial"));
    if (patientId && history.patientId !== patientId) throw new Error('El historial no corresponde al paciente autenticado.');
    return history;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.message === 'No tienes un historial clínico registrado.') return null;
    throw error;
  }
};
