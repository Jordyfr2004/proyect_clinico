import { apiRequest } from "@/api/client";
import {
  asArray,
  asOptionalString,
  asRecord,
  asString,
  parseEnvelope,
} from "@/validation/primitives";

export type Medication = {
  name: string;
  dose: string;
  frequency: string;
  duration: string | null;
  instructions: string | null;
};
export type Prescription = {
  id: string;
  date: string;
  diagnosis: string | null;
  medications: Medication[];
  instructions: string | null;
  issuedBy: string | null;
};

const parseMedication = (value: unknown): Medication => {
  const r = asRecord(value, "El medicamento");
  return {
    name: asString(r, "nombre"),
    dose: asString(r, "dosis"),
    frequency: asString(r, "frecuencia"),
    duration: asOptionalString(r, "duracion"),
    instructions: asOptionalString(r, "indicaciones"),
  };
};

const parsePrescription = (value: unknown): Prescription => {
  const r = asRecord(value, "La receta");
  const issuer =
    r.emitida_por === null || r.emitida_por === undefined
      ? null
      : asRecord(r.emitida_por, "emitida_por");
  return {
    id: asString(r, "id"),
    date: asString(r, "fecha"),
    diagnosis: asOptionalString(r, "diagnostico"),
    medications: asArray(r, "medicamentos").map(parseMedication),
    instructions: asOptionalString(r, "indicaciones"),
    issuedBy: issuer ? asString(issuer, "name") : null,
  };
};

export const parsePrescriptions = (value: unknown): Prescription[] =>
  parseEnvelope(value, (data) =>
    asArray({ data }, "data").map(parsePrescription),
  );

export const getPrescriptions = async () =>
  parsePrescriptions(await apiRequest("/paciente/mis-recetas"));
