import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { deleteProfilePhoto, getProfilePhoto, uploadProfilePhoto } from './profilePhotoService'

const originalBase = apiClient.defaults.baseURL
afterEach(() => { apiClient.defaults.baseURL = originalBase; vi.restoreAllMocks() })

describe('profilePhotoService', () => {
  it('reads the protected photo as a Blob through authenticated Axios', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    const photo = new Blob(['photo'], { type: 'image/png' })
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: photo })
    expect(await getProfilePhoto('user-id')).toBe(photo)
    expect(get).toHaveBeenCalledExactlyOnceWith('/usuarios/user-id/foto', { responseType: 'blob' })
  })

  it('uploads multipart field foto and deletes only the current user photo', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    const file = new File(['photo'], 'foto.png', { type: 'image/png' })
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { data: { foto_perfil_url: '/api/usuarios/user-id/foto' } } })
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { data: { foto_perfil_url: null } } })
    expect(await uploadProfilePhoto(file)).toBe('/api/usuarios/user-id/foto')
    expect(post.mock.calls[0][0]).toBe('/perfil/foto')
    expect(post.mock.calls[0][1]).toBeInstanceOf(FormData)
    expect((post.mock.calls[0][1] as FormData).get('foto')).toBe(file)
    expect(await deleteProfilePhoto()).toBeNull()
    expect(remove).toHaveBeenCalledExactlyOnceWith('/perfil/foto')
  })
})
