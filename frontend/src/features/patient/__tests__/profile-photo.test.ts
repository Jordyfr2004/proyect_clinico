import { deleteProfilePhoto, uploadProfilePhoto } from '../profile';
import { apiRequest } from '@/api/client';

jest.mock('@/api/client', () => ({ apiRequest: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
test('rejects PDF and oversized profile photos before calling Laravel', async () => {
  await expect(uploadProfilePhoto('file:///photo.pdf', 'application/pdf', 1024)).rejects.toThrow('JPG');
  await expect(uploadProfilePhoto('file:///photo.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)).rejects.toThrow('5 MB');
  expect(apiRequest).not.toHaveBeenCalled();
});
test('returns the real Laravel confirmation for profile photo deletion', async () => {
  jest.mocked(apiRequest).mockResolvedValue({ message: 'Foto de perfil eliminada correctamente.' });
  await expect(deleteProfilePhoto()).resolves.toBe('Foto de perfil eliminada correctamente.');
  expect(apiRequest).toHaveBeenCalledWith('/perfil/foto', { method: 'DELETE' });
});
