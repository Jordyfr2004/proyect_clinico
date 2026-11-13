import { apiRequest, authenticatedImageSource } from "@/api/client";
import { getApiBaseUrl } from "@/config/env";
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
  uploadedByPatient: boolean;
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
    uploadedByPatient: uploader ? asString(uploader, "role") === "paciente" : false,
  };
};

export const parseDocuments = (value: unknown): PatientDocument[] =>
  parseEnvelope(value, (data) => asArray({ data }, "data").map(parseDocument));

export const getDocuments = async () =>
  parseDocuments(await apiRequest("/paciente/mis-evidencias"));

export const uploadDocument = async (
  file: { uri: string; mimeType: string; fileName?: string | null },
  type: "rx" | "documento",
  description?: string,
): Promise<string> => {
  const form = new FormData();
  form.append("tipo", type);
  form.append("archivo", {
    uri: file.uri,
    name: file.fileName || `archivo.${file.mimeType.split("/")[1] ?? "jpg"}`,
    type: file.mimeType,
  } as unknown as Blob);
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

/** Fuente con el token de sesión para mostrar la imagen desde el servidor de archivos. */
export const documentImageSource = (id: string) =>
  authenticatedImageSource(
    `${getApiBaseUrl()}/paciente/mis-evidencias/${encodeURIComponent(id)}/archivo`,
  );

export const formatFileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
