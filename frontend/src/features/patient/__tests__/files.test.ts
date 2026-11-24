import { validateClinicalFile, resolveFileMime, prepareUpload } from '../file-upload';
import { downloadDocument, uploadDocument } from '../documents';
import { apiRequest } from '@/api/client';
import { Platform } from 'react-native';
import * as uploadHelpers from '../file-upload';
import { cleanupSession } from '@/features/auth/session-cleanup';
import { uploadProfilePhoto } from '../profile';

jest.mock('@/api/client', () => ({ apiRequest: jest.fn(), authenticatedImageSource: jest.fn() }));
const file = { uri: 'file:///cache/a.pdf', mimeType: 'application/pdf', fileName: 'a.pdf', size: 1024 };
test('accepts only image and PDF formats up to 20 MB and 1000 description characters', () => {
  expect(validateClinicalFile(file, 'x'.repeat(1000))).toBeNull();
  expect(validateClinicalFile({ ...file, size: 20 * 1024 * 1024 + 1 })).toContain('20 MB');
  expect(validateClinicalFile({ ...file, size: 0 })).toBeTruthy();
  expect(validateClinicalFile({ ...file, mimeType: 'text/html' })).toBeTruthy();
  expect(validateClinicalFile(file, 'x'.repeat(1001))).toContain('1000');
  expect(resolveFileMime(undefined, 'unknown.gif')).toBeNull();
  expect(resolveFileMime(undefined, 'RX.JPEG')).toBe('image/jpeg');
});
test('does not submit an invalid clinical file', async () => {
  await expect(uploadDocument({ ...file, size: 21 * 1024 * 1024 }, 'rx')).rejects.toThrow('20 MB');
  expect(apiRequest).not.toHaveBeenCalled();
});
test('downloads the owned binary endpoint through the authenticated API client', async () => {
  jest.mocked(apiRequest).mockResolvedValue(new Uint8Array([37, 80, 68, 70, 45]));
  await expect(downloadDocument('a/b')).resolves.toBeInstanceOf(Uint8Array);
  expect(apiRequest).toHaveBeenCalledWith('/paciente/mis-evidencias/a%2Fb/archivo', expect.objectContaining({ parseResponse: expect.any(Function) }));
});
test('uses a real Blob in multipart on Expo Web', async () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  const blob = new Blob(['pdf'], { type: 'application/pdf' });
  const prepared = await prepareUpload({ ...file, file: blob });
  expect(prepared.part).toBe(blob);
  Object.defineProperty(Platform, 'OS', { configurable: true, value: original });
});

test.each(['document', 'photo'])('never submits an old %s after account changes during local preparation', async kind => {
  jest.mocked(apiRequest).mockClear();
  let finish!: (value: Awaited<ReturnType<typeof prepareUpload>>) => void;
  const prepare = jest.spyOn(uploadHelpers, 'prepareUpload').mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const pending = kind === 'document' ? uploadDocument(file, 'documento') : uploadProfilePhoto('file:///photo.jpg', 'image/jpeg', 100);
  await cleanupSession();
  finish({ part: { uri: file.uri, name: file.fileName, type: file.mimeType }, name: file.fileName });
  await expect(pending).rejects.toThrow('sesión');
  expect(apiRequest).not.toHaveBeenCalled();
  prepare.mockRestore();
});
