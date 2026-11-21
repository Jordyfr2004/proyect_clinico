import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from './authContext'
import { ProfilePhotoControl } from './ProfilePhotoControl'
import { deleteProfilePhoto, getProfilePhoto, uploadProfilePhoto } from './profilePhotoService'

vi.mock('./profilePhotoService', () => ({ getProfilePhoto: vi.fn(), uploadProfilePhoto: vi.fn(), deleteProfilePhoto: vi.fn() }))
const user = { id: 'user-id', name: 'Doctora', username: 'doctora', role: 'doctora' as const, paciente_id: null, activo: true, foto_perfil_url: '/api/usuarios/user-id/foto' }
const renderControl = (photo: string | null = user.foto_perfil_url) => render(<AuthContext.Provider value={{ status: 'authenticated', user: { ...user, foto_perfil_url: photo }, sessionError: null, login: async () => {}, logout: async () => {} }}><ProfilePhotoControl initialPhotoUrl={photo}/></AuthContext.Provider>)

beforeEach(() => {
  vi.resetAllMocks()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:protected-photo') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})
afterEach(() => { vi.restoreAllMocks() })

describe('ProfilePhotoControl', () => {
  it('shows the protected photo and releases its Blob URL on unmount', async () => {
    vi.mocked(getProfilePhoto).mockResolvedValue(new Blob(['photo'], { type: 'image/png' }))
    const view = renderControl()
    await waitFor(() => expect(document.querySelector('img')).toHaveAttribute('src', 'blob:protected-photo'))
    expect(getProfilePhoto).toHaveBeenCalledExactlyOnceWith(user.id, expect.any(AbortSignal))
    view.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:protected-photo')
  })

  it('shows initials without a photo and rejects invalid files', () => {
    renderControl(null)
    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar foto' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Seleccionar foto'), { target: { files: [new File(['bad'], 'bad.txt', { type: 'text/plain' })] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Selecciona una imagen JPG')
    expect(uploadProfilePhoto).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Seleccionar foto'), { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' })] } })
    expect(uploadProfilePhoto).not.toHaveBeenCalled()
  })

  it('keeps initials and explains a failed protected photo read', async () => {
    vi.mocked(getProfilePhoto).mockRejectedValue(new Error('network'))
    renderControl()
    expect(await screen.findByRole('status')).toHaveTextContent('No fue posible mostrar la foto guardada')
    expect(screen.getByText('D')).toBeInTheDocument()
  })

  it('uploads a valid image and refreshes the large avatar only after success', async () => {
    vi.mocked(uploadProfilePhoto).mockResolvedValue(user.foto_perfil_url)
    vi.mocked(getProfilePhoto).mockResolvedValue(new Blob(['photo'], { type: 'image/png' }))
    const changed = vi.fn()
    window.addEventListener('clinic:profile-photo-changed', changed)
    renderControl(null)
    const file = new File(['photo'], 'perfil.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Seleccionar foto'), { target: { files: [file] } })
    await waitFor(() => expect(uploadProfilePhoto).toHaveBeenCalledExactlyOnceWith(file))
    await waitFor(() => expect(document.querySelector('img')).toHaveAttribute('src', 'blob:protected-photo'))
    expect(screen.getByRole('button', { name: 'Eliminar foto' })).toBeInTheDocument()
    expect((changed.mock.calls[0][0] as CustomEvent<string>).detail).toBe(user.foto_perfil_url)
    window.removeEventListener('clinic:profile-photo-changed', changed)
  })

  it('keeps the current image when upload fails', async () => {
    vi.mocked(getProfilePhoto).mockResolvedValue(new Blob(['photo'], { type: 'image/png' }))
    vi.mocked(uploadProfilePhoto).mockRejectedValue(new Error('network'))
    renderControl()
    await waitFor(() => expect(document.querySelector('img')).toHaveAttribute('src', 'blob:protected-photo'))
    fireEvent.change(screen.getByLabelText('Seleccionar foto'), { target: { files: [new File(['other'], 'otra.png', { type: 'image/png' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible actualizar la foto')
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:protected-photo')
  })

  it('requires confirmation before deleting the current user photo', async () => {
    vi.mocked(getProfilePhoto).mockResolvedValue(new Blob(['photo'], { type: 'image/png' }))
    vi.mocked(deleteProfilePhoto).mockResolvedValue(null)
    const changed = vi.fn()
    window.addEventListener('clinic:profile-photo-changed', changed)
    renderControl()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar foto' }))
    expect(deleteProfilePhoto).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(deleteProfilePhoto).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar foto' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
    await waitFor(() => expect(deleteProfilePhoto).toHaveBeenCalledExactlyOnceWith())
    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar foto' })).not.toBeInTheDocument()
    expect((changed.mock.calls[0][0] as CustomEvent<null>).detail).toBeNull()
    window.removeEventListener('clinic:profile-photo-changed', changed)
  })
})
