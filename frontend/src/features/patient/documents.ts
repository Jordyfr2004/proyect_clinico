import { apiRequest, authenticatedImageSource } from "@/api/client";
import { getApiBaseUrl } from "@/config/env";
import { appendUpload, prepareUpload, type UploadFile } from './file-upload';
import { fileSession } from './file-cache';
import {
  asArray,
  asOptionalString,
  asRecord,
  asString,
  parseEnvelope,
} from "@/validation/primitives";

export type DocumentType = "rx" | "documento" | "caso_clinico";
export type PatientDocument = {
  id: string;
  type: DocumentType;
  fileName: string;
  mimeType: string;
  size: number;
  description: string | null;
  date: string;
  uploadedByPatient: boolean | null;
};

export const documentTypeLabels: Record<DocumentType, string> = {
  rx: "Radiografía",
  documento: "Documento",
  caso_clinico: "Caso clínico",
};

const types = new Set<string>(["rx", "documento", "caso_clinico"]);

const parseDocument = (value: unknown): PatientDocument => {
  const r = asRecord(value, "El archivo");
  const type = asString(r, "tipo");
  if (!types.has(type)) throw new Error("tipo no tiene un formato válido");
  const size = r.tamano;
  if (typeof size !== "number")
    throw new Error("tamano no tiene un formato válido");
  const uploader =
    r.subido_por === null || r.subido_por === undefined
      ? null
      : asRecord(r.subido_por, "subido_por");
  return {
    id: asString(r, "id"),
    type: type as DocumentType,
    fileName: asString(r, "nombre_archivo"),
    mimeType: asString(r, "mime_type"),
    size,
    description: asOptionalString(r, "descripcion"),
    date: asString(r, "fecha"),
    uploadedByPatient: uploader ? asString(uploader, "role") === "paciente" : null,
  };
};

export const parseDocuments = (value: unknown): PatientDocument[] =>
  parseEnvelope(value, (data) => asArray({ data }, "data").map(parseDocument));

export const getDocuments = async () =>
  parseDocuments(await apiRequest("/paciente/mis-evidencias"));

export const uploadDocument = async (
  file: UploadFile,
  type: "rx" | "documento",
  description?: string,
): Promise<string> => {
  const form = new FormData();
  const current = fileSession();
  if (type !== 'rx' && type !== 'documento') throw new Error('Tipo de archivo no autorizado.');
  const upload = await prepareUpload(file, description);
  if (!current()) throw new Error('La sesión cambió. Vuelve a seleccionar el archivo.');
  form.append("tipo", type);
  appendUpload(form, 'archivo', upload);
  if (description?.trim()) form.append("descripcion", description.trim());
  const r = asRecord(
    await apiRequest("/paciente/mis-evidencias", {
      method: "POST",
      body: form,
      timeoutMs: 60000,
    }),
    "La respuesta del servidor",
  );
  return asString(r, "message");
};

export const downloadDocument = (id: string): Promise<Uint8Array> =>
  apiRequest(`/paciente/mis-evidencias/${encodeURIComponent(id)}/archivo`, {
    timeoutMs: 60000,
    cache: 'no-store',
    parseResponse: async response => {
      const size = Number(response.headers.get('Content-Length'));
      if (size > 20 * 1024 * 1024) throw new Error('El archivo supera 20 MB.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw new Error('El archivo está vacío o supera 20 MB.');
      return bytes;
    },
  });

/** Fuente con el token de sesión para mostrar la imagen desde el servidor de archivos. */
export const documentImageSource = (id: string) =>
  authenticatedImageSource(
    `${getApiBaseUrl()}/paciente/mis-evidencias/${encodeURIComponent(id)}/archivo`,
  );

export const formatFileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
