import { apiRequest } from "@/api/client";
import {
  asOptionalString,
  asRecord,
  asString,
  parseEnvelope,
} from "@/validation/primitives";

export type PatientProfile = {
  photoUrl: string | null;
  code: string;
  names: string;
  nationalId: string;
  phone: string | null;
  address: string | null;
  birthdate: string | null;
};
export const parseProfile = (value: unknown): PatientProfile =>
  parseEnvelope(value, (data) => {
    const r = asRecord(data, "El perfil");
    return {
      photoUrl: asOptionalString(r, "foto_perfil_url"),
      code: asString(r, "codigo_paciente"),
      names: asString(r, "nombres"),
      nationalId: asString(r, "cedula"),
      phone: asOptionalString(r, "telefono"),
      address: asOptionalString(r, "direccion"),
      birthdate: asOptionalString(r, "fecha_nacimiento"),
    };
  });
export const getProfile = async () =>
  parseProfile(await apiRequest("/paciente/mi-perfil"));
export const uploadProfilePhoto = async (
  uri: string,
  mimeType = "image/jpeg",
) => {
  const form = new FormData();
  form.append("foto", {
    uri,
    name: `perfil.${mimeType.split("/")[1] ?? "jpg"}`,
    type: mimeType,
  } as unknown as Blob);
  await apiRequest("/perfil/foto", { method: "POST", body: form });
};
export const deleteProfilePhoto = async () => {
  await apiRequest("/perfil/foto", { method: "DELETE" });
};
