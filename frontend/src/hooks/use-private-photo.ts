import { useEffect, useState } from 'react';
import { apiRequest } from '@/api/client';
import { apiErrorMessage } from '@/api/errors';
import { getApiBaseUrl } from '@/config/env';
import { fileSession, temporaryClinicalFile } from '@/features/patient/file-cache';

/** Headers on React Native Web <Image> are ignored: fetch protected images first. */
export function usePrivatePhoto(url: string | null | undefined, revision: number) {
  const [image, setImage] = useState<{ scope: string; uri: string } | null>(null);
  const [failure, setFailure] = useState<{ scope: string; message: string } | null>(null);
  const scope = `${url ?? ''}:${revision}`;
  useEffect(() => {
    let active = true;
    let release: (() => void) | undefined;
    const controller = new AbortController();
    const current = fileSession();
    if (url) void (async () => {
      try {
        const base = getApiBaseUrl();
        const resource = new URL(url);
        if (resource.origin !== new URL(base).origin || !resource.toString().startsWith(`${base}/`) || resource.username || resource.password) throw new Error('Foto fuera del servidor configurado.');
        const data = await apiRequest(resource.toString().slice(base.length), {
          signal: controller.signal, cache: 'no-store',
          parseResponse: async response => {
            const mime = response.headers.get('Content-Type')?.split(';')[0].trim() ?? '';
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('Imagen no válida.');
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('Imagen no válida.');
            return { bytes, mime };
          },
        });
        if (!active || !current()) return;
        const file = temporaryClinicalFile(data.bytes, data.mime, current);
        release = file.release;
        setImage({ scope, uri: file.uri });
      } catch (reason) {
        if (active) { setImage(null); setFailure({ scope, message: apiErrorMessage(reason, 'No se pudo cargar la foto.') }); }
      }
    })();
    return () => { active = false; controller.abort(); release?.(); };
  }, [url, scope]);
  return {
    source: image?.scope === scope ? { uri: image.uri } : undefined,
    error: failure?.scope === scope && image?.scope !== scope ? failure.message : '',
  };
}
