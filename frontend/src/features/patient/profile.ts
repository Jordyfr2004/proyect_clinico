import { apiRequest } from "@/api/client";
import { appendUpload, prepareUpload } from './file-upload';
import { fileSession } from './file-cache';
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
  size?: number,
  file?: Blob,
) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw new Error('La foto debe ser JPG, PNG o WebP.');
  const current = fileSession();
  const upload = await prepareUpload({ uri, mimeType, size, file, fileName: `perfil.${mimeType.split('/')[1]}` }, '', 5);
  if (!current()) throw new Error('La sesión cambió. Vuelve a seleccionar la foto.');
  const form = new FormData();
  appendUpload(form, 'foto', upload);
  return asString(asRecord(await apiRequest("/perfil/foto", { method: "POST", body: form }), 'La respuesta'), 'message');
};
export const deleteProfilePhoto = async () => {
  return asString(asRecord(await apiRequest("/perfil/foto", { method: "DELETE" }), 'La respuesta'), 'message');
};
