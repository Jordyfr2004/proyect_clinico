import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { registerSessionCleanup } from '../auth/session-cleanup';

let generation = 0;
let sequence = 0;
const releases = new Set<() => void>();
const directory = () => new Directory(Paths.cache, 'patient-clinical-files');

export const clearClinicalFiles = () => {
  generation += 1;
  for (const release of [...releases]) release();
  if (Platform.OS !== 'web') {
    const folder = directory();
    if (folder.exists) folder.delete();
  }
};
registerSessionCleanup(clearClinicalFiles);
// A previous process may have exited before releasing its private cache copies.
if (Platform.OS !== 'web') {
  try { clearClinicalFiles(); } catch { /* Retry cleanup on session termination. */ }
}

/** The caller starts this before its authenticated download, so logout also invalidates that download. */
export const fileSession = () => {
  const current = generation;
  return () => current === generation;
};

export function temporaryClinicalFile(bytes: Uint8Array, mime: string, current: () => boolean) {
  if (!current()) throw new Error('La sesión cambió.');
  const extension = ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[mime];
  if (!extension) throw new Error('Formato de archivo no permitido.');
  let uri: string;
  let remove: () => void;
  if (Platform.OS === 'web') {
    uri = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime }));
    remove = () => URL.revokeObjectURL(uri);
  } else {
    const folder = directory();
    folder.create({ intermediates: true, idempotent: true });
    const file = new File(folder, `clinical-${Date.now()}-${++sequence}.${extension}`);
    file.create();
    file.write(bytes);
    uri = file.uri;
    remove = () => { if (file.exists) file.delete(); };
  }
  const release = () => { remove(); releases.delete(release); };
  releases.add(release);
  return { uri, release };
}

export async function exportClinicalFile(bytes: Uint8Array, mime: string, name: string, current: () => boolean) {
  const file = temporaryClinicalFile(bytes, mime, current);
  try {
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = file.uri;
      link.download = name.replace(/[/\\\x00-\x1f]/g, '_');
      link.click();
      // Give the browser time to consume the download; logout can revoke it earlier.
      setTimeout(file.release, 60_000);
    } else {
      if (!await Sharing.isAvailableAsync()) throw new Error('No hay aplicaciones disponibles para abrir o exportar este archivo.');
      if (!current()) throw new Error('La sesión cambió.');
      await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: 'Abrir o guardar archivo clínico' });
    }
  } finally {
    if (Platform.OS !== 'web') file.release();
  }
}

/** Delete only picker-created cache copies; never touch an original gallery/document file. */
export async function releasePickedFile(uri: string) {
  if (Platform.OS === 'web') {
    if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
    return;
  }
  const prefix = `${Paths.cache.uri.replace(/\/$/, '')}/`;
  if (uri.startsWith(prefix)) {
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}
