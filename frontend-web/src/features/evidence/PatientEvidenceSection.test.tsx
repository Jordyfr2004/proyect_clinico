import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../auth/authContext'
import type { UserRole } from '../auth/authService'
import { PatientEvidenceSection } from './PatientEvidenceSection'
import { createPatientEvidence, deletePatientEvidence, getPatientEvidence, updatePatientEvidence } from './evidenceService'
import { AuthContext } from '../auth/authContext'

vi.mock('./evidenceService', () => ({ getPatientEvidence: vi.fn(), createPatientEvidence: vi.fn(), updatePatientEvidence: vi.fn(), deletePatientEvidence: vi.fn() }))
const evidence = { id: 'evidence-1', paciente_id: 'patient-1', tipo: 'rx' as const, nombre_archivo: 'Archivo recibido', ruta_archivo: 'internal/path', mime_type: 'image/png', tamano: 1024, descripcion: 'Descripción recibida', fecha: '2026-10-04' }
const patient = { id: 'patient-1', codigo_paciente: '001', nombres: 'Paciente recibido', cedula: '123', telefono: null, direccion: null, fecha_nacimiento: null }
function renderEvidence(role: 'doctora' | 'asistente' = 'asistente') {
  return render(<AuthContext.Provider value={{ status: 'authenticated', user: { id: 'staff-1', name: 'Personal', username: 'personal', role, paciente_id: null, activo: true }, sessionError: null, login: async () => {}, logout: async () => {} }}><MemoryRouter initialEntries={['/pacientes/patient-1/radiografias']}><Routes><Route element={<Outlet context={patient}/>} path="/pacientes/:patientId"><Route element={<PatientEvidenceSection/>} path="radiografias"/></Route></Routes></MemoryRouter></AuthContext.Provider>)
}
beforeEach(() => { vi.resetAllMocks() })

describe('PatientEvidenceSection', () => {
  it('loads evidence metadata without exposing the storage path', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([evidence])
    renderEvidence('asistente')
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(await screen.findByText('Archivo recibido')).toBeInTheDocument()
    expect(getPatientEvidence).toHaveBeenCalledExactlyOnceWith(patient.id, expect.any(AbortSignal))
    expect(screen.getByText('1 KB')).toBeInTheDocument()
    expect(screen.getByText('Radiografía')).toBeInTheDocument()
    expect(screen.getByText('4 de octubre de 2026')).toBeInTheDocument()
    expect(screen.getByText('Paciente (app móvil)')).toBeInTheDocument()
    expect(screen.queryByText(evidence.ruta_archivo)).not.toBeInTheDocument()
  })

  it('lets the assistant view files but not upload or delete them', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([evidence])
    renderEvidence('asistente')
    expect(await screen.findByRole('button', { name: 'Ver Archivo recibido' })).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Subir evidencia clínica' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar Archivo recibido' })).not.toBeInTheDocument()
  })

  it('uploads a radiograph and shows it in the list', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([])
    vi.mocked(uploadPatientEvidence).mockResolvedValue({ ...evidence, id: 'evidence-2', nombre_archivo: 'panoramica.png', subido_por: { id: 'staff-1', name: 'Doctora', role: 'doctora' } })
    renderEvidence()
    const form = await screen.findByRole('form', { name: 'Subir evidencia clínica' })
    const file = new File(['png'], 'panoramica.png', { type: 'image/png' })
    fireEvent.change(within(form).getByLabelText(/Archivo/), { target: { files: [file] } })
    fireEvent.change(within(form).getByLabelText('Descripción (opcional)'), { target: { value: 'Panorámica' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Subir al expediente' }))
    expect(await screen.findByText('panoramica.png')).toBeInTheDocument()
    expect(uploadPatientEvidence).toHaveBeenCalledExactlyOnceWith(patient.id, { tipo: 'rx', archivo: file, descripcion: 'Panorámica' })
  })

  it('rejects unsupported files before uploading', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([])
    renderEvidence()
    const form = await screen.findByRole('form', { name: 'Subir evidencia clínica' })
    fireEvent.change(within(form).getByLabelText(/Archivo/), { target: { files: [new File(['x'], 'script.exe', { type: 'application/x-msdownload' })] } })
    fireEvent.click(within(form).getByRole('button', { name: 'Subir al expediente' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('JPG, PNG, WebP o un PDF')
    expect(uploadPatientEvidence).not.toHaveBeenCalled()
  })

  it('shows the server message when the file server is down', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([evidence])
    vi.mocked(getEvidenceFile).mockRejectedValue({ isAxiosError: true, response: { status: 503, data: { message: 'El servidor de archivos no está disponible en este momento.' } } })
    vi.spyOn(window, 'open').mockReturnValue(null)
    renderEvidence()
    fireEvent.click(await screen.findByRole('button', { name: 'Ver Archivo recibido' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('El servidor de archivos no está disponible')
  })

  it('asks for confirmation before deleting', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([evidence])
    vi.mocked(deleteEvidence).mockResolvedValue()
    renderEvidence()
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar Archivo recibido' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminar evidencia' })
    expect(deleteEvidence).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByText('Archivo recibido')).not.toBeInTheDocument())
    expect(deleteEvidence).toHaveBeenCalledExactlyOnceWith('evidence-1')
  })

  it('shows an honest empty state', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([])
    renderEvidence()
    expect(await screen.findByText('Sin evidencias clínicas')).toBeInTheDocument()
  })

  it('distinguishes missing patient from a retryable request error', async () => {
    vi.mocked(getPatientEvidence).mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } }).mockRejectedValueOnce({ isAxiosError: true })
    const view = renderEvidence()
    expect(await screen.findByRole('alert')).toHaveTextContent('Paciente no encontrado.')
    view.unmount()
    renderEvidence()
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible comunicarse con el servidor.')
  })

  it('lets the doctor register an authorized file and reloads received evidence', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...evidence, nombre_archivo: 'radiografia.png' }])
    vi.mocked(createPatientEvidence).mockResolvedValue('Evidencia registrada correctamente.')
    renderEvidence('doctora')
    await screen.findByText('Sin evidencias clínicas')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evidencia' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar evidencia clínica' })
    const archivo = new File(['dato'], 'radiografia.png', { type: 'image/png' })
    fireEvent.change(within(dialog).getByLabelText('Archivo'), { target: { files: [archivo] } })
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-11-04' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar evidencia' }))
    await waitFor(() => expect(createPatientEvidence).toHaveBeenCalledWith({ paciente_id: 'patient-1', tipo: 'rx', archivo, descripcion: null, fecha: '2026-11-04' }))
    expect(await screen.findByText('radiografia.png')).toBeInTheDocument()
  })

  it('edits metadata without replacing the file and confirms deletion', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([evidence])
    vi.mocked(updatePatientEvidence).mockResolvedValue('Evidencia actualizada.')
    vi.mocked(deletePatientEvidence).mockResolvedValue('Evidencia eliminada.')
    renderEvidence('doctora')
    await screen.findByText('Archivo recibido')
    fireEvent.click(screen.getByRole('button', { name: 'Editar evidencia' }))
    const edit = screen.getByRole('dialog', { name: 'Editar evidencia clínica' })
    expect(within(edit).queryByLabelText('Archivo')).not.toBeInTheDocument()
    fireEvent.change(within(edit).getByLabelText('Descripción'), { target: { value: 'Nueva descripción' } })
    fireEvent.click(within(edit).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(updatePatientEvidence).toHaveBeenCalledWith('evidence-1', { tipo: 'rx', descripcion: 'Nueva descripción', fecha: '2026-10-04' }))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar evidencia' }))
    const confirmation = screen.getByRole('dialog', { name: 'Eliminar evidencia clínica' })
    expect(deletePatientEvidence).not.toHaveBeenCalled()
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Confirmar eliminación' }))
    await waitFor(() => expect(deletePatientEvidence).toHaveBeenCalledWith('evidence-1'))
  })

  it('rejects an oversized upload before sending it to Laravel', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([])
    renderEvidence('doctora')
    await screen.findByText('Sin evidencias clínicas')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evidencia' }))
    const dialog = screen.getByRole('dialog')
    const archivo = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' })
    fireEvent.change(within(dialog).getByLabelText('Archivo'), { target: { files: [archivo] } })
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-11-04' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar evidencia' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('10 MB')
    expect(createPatientEvidence).not.toHaveBeenCalled()
  })

  it('rejects an unsupported file extension before sending it', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([])
    renderEvidence('doctora')
    await screen.findByText('Sin evidencias clínicas')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evidencia' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Archivo'), { target: { files: [new File(['dato'], 'nota.txt', { type: 'text/plain' })] } })
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-11-04' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar evidencia' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('JPG, PNG, WebP o PDF')
    expect(createPatientEvidence).not.toHaveBeenCalled()
  })

  it('keeps the form open and shows a server validation error', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([])
    vi.mocked(createPatientEvidence).mockRejectedValue({ isAxiosError: true, response: { status: 422, data: { message: 'El archivo no es válido.' } } })
    renderEvidence('doctora')
    await screen.findByText('Sin evidencias clínicas')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evidencia' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Archivo'), { target: { files: [new File(['dato'], 'rx.png', { type: 'image/png' })] } })
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-11-04' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar evidencia' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El archivo no es válido.')
    expect(within(dialog).getByRole('button', { name: 'Guardar evidencia' })).toBeEnabled()
  })

  it('keeps the edit dialog open when Laravel rejects an update', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([evidence])
    vi.mocked(updatePatientEvidence).mockRejectedValue({ isAxiosError: true, response: { status: 404, data: { message: 'Evidencia no encontrada.' } } })
    renderEvidence('doctora')
    await screen.findByText('Archivo recibido')
    fireEvent.click(screen.getByRole('button', { name: 'Editar evidencia' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Evidencia no encontrada.')
    expect(getPatientEvidence).toHaveBeenCalledTimes(1)
  })

  it('keeps the delete confirmation open when Laravel rejects deletion', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([evidence])
    vi.mocked(deletePatientEvidence).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'No se puede eliminar.' } } })
    renderEvidence('doctora')
    await screen.findByText('Archivo recibido')
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar evidencia' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar eliminación' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No se puede eliminar.')
    expect(getPatientEvidence).toHaveBeenCalledTimes(1)
  })

  it('reports a confirmed write when the subsequent list refresh fails', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValueOnce([evidence]).mockRejectedValueOnce(new Error('offline'))
    vi.mocked(updatePatientEvidence).mockResolvedValue('Evidencia actualizada.')
    renderEvidence('doctora')
    await screen.findByText('Archivo recibido')
    fireEvent.click(screen.getByRole('button', { name: 'Editar evidencia' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Evidencia actualizada. No fue posible actualizar el listado')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getPatientEvidence).toHaveBeenCalledTimes(2)
  })

  it('sends only one creation while the first request is pending', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([])
    vi.mocked(createPatientEvidence).mockReturnValue(new Promise(() => {}))
    renderEvidence('doctora')
    await screen.findByText('Sin evidencias clínicas')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evidencia' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Archivo'), { target: { files: [new File(['dato'], 'rx.png', { type: 'image/png' })] } })
    fireEvent.change(within(dialog).getByLabelText('Fecha'), { target: { value: '2026-11-04' } })
    const save = within(dialog).getByRole('button', { name: 'Guardar evidencia' })
    fireEvent.click(save)
    fireEvent.click(save)
    expect(createPatientEvidence).toHaveBeenCalledTimes(1)
    expect(save).toBeDisabled()
  })

  it('uses real metadata as the title when Laravel returns a UUID filename', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([{ ...evidence, nombre_archivo: 'b4b8c861-83de-44fe-aa74-2273bb0601c2.png', descripcion: null }])
    renderEvidence()
    expect(await screen.findByText('Radiografía · 4 de octubre de 2026')).toBeInTheDocument()
    expect(screen.getByText('b4b8c861-83de-44fe-aa74-2273bb0601c2.png')).toBeInTheDocument()
  })
})
