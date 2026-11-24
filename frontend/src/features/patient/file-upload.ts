import { Platform } from 'react-native';

export const CLINICAL_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export type UploadFile = { uri: string; mimeType: string; fileName?: string | null; size?: number; file?: Blob };
const byExtension: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };

export const resolveFileMime = (mime?: string | null, name?: string | null): string | null => {
  if (mime) {
    const normalized = mime.toLowerCase() === 'image/jpg' ? 'image/jpeg' : mime.toLowerCase();
    if (normalized !== 'application/octet-stream') return CLINICAL_MIME_TYPES.includes(normalized) ? normalized : null;
  }
  const extension = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(name ?? '')?.[1].toLowerCase();
  return extension ? byExtension[extension] ?? null : null;
};

export const validateClinicalFile = (file: UploadFile, description = '', limitMB = 20): string | null => {
  if (!CLINICAL_MIME_TYPES.includes(file.mimeType)) return 'El archivo debe ser JPG, PNG, WebP o PDF.';
  if (typeof file.size !== 'number' || !Number.isFinite(file.size) || file.size <= 0) return 'No se pudo comprobar el tamaño del archivo o está vacío.';
  if (file.size > limitMB * 1024 * 1024) return `El archivo no puede superar ${limitMB} MB.`;
  if (description.trim().length > 1000) return 'La descripción no puede superar 1000 caracteres.';
  return null;
};

export async function prepareUpload(file: UploadFile, description = '', limitMB = 20) {
  let size = file.size;
  let part: Blob | { uri: string; name: string; type: string };
  const name = file.fileName || `archivo.${file.mimeType === 'application/pdf' ? 'pdf' : file.mimeType.split('/')[1]}`;
  if (Platform.OS === 'web') {
    if (!file.file && !/^(blob:|data:)/.test(file.uri)) throw new Error('El archivo seleccionado no es local.');
    const blob = file.file ?? await (await fetch(file.uri)).blob();
    size = blob.size;
    part = blob;
  } else {
    if (!/^(file:|content:)/.test(file.uri)) throw new Error('El archivo seleccionado no es local.');
    if (size === undefined) {
      const { File } = await import('expo-file-system');
      size = new File(file.uri).size;
    }
    part = { uri: file.uri, name, type: file.mimeType };
  }
  const error = validateClinicalFile({ ...file, size }, description, limitMB);
  if (error) throw new Error(error);
  return { part, name };
}

export const appendUpload = (form: FormData, key: string, upload: Awaited<ReturnType<typeof prepareUpload>>) => {
  if (Platform.OS === 'web') form.append(key, upload.part as Blob, upload.name);
  else form.append(key, upload.part as unknown as Blob);
};
