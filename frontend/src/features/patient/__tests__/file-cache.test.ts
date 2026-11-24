import { Platform } from 'react-native';
import { releasePickedFile } from '../file-cache';

test('discarding a Web picker file revokes its blob without touching unrelated URLs', async () => {
  const original = Platform.OS;
  const revoke = URL.revokeObjectURL;
  const spy = jest.fn();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  URL.revokeObjectURL = spy;
  try {
    await releasePickedFile('blob:http://localhost/patient-file');
    await releasePickedFile('https://clinic.example/file');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('blob:http://localhost/patient-file');
  } finally { URL.revokeObjectURL = revoke; Object.defineProperty(Platform, 'OS', { configurable: true, value: original }); }
});
