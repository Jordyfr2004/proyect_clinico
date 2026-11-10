import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../auth/authContext'
import type { UserRole } from '../auth/authService'
import { PatientEvidenceSection } from './PatientEvidenceSection'
import { deleteEvidence, getEvidenceFile, getPatientEvidence, uploadPatientEvidence } from './evidenceService'

vi.mock('./evidenceService', async (importOriginal) => ({ ...(await importOriginal<typeof import('./evidenceService')>()), getPatientEvidence: vi.fn(), uploadPatientEvidence: vi.fn(), getEvidenceFile: vi.fn(), deleteEvidence: vi.fn() }))
const evidence = { id: 'evidence-1', paciente_id: 'patient-1', tipo: 'rx' as const, nombre_archivo: 'Archivo recibido', ruta_archivo: 'internal/path', mime_type: 'image/png', tamano: 1024, descripcion: 'Descripción recibida', fecha: '2026-10-04', subido_por: { id: 'u-2', name: 'Paciente', role: 'paciente' } }
const patient = { id: 'patient-1', codigo_paciente: '001', nombres: 'Paciente recibido', cedula: '123', telefono: null, direccion: null, fecha_nacimiento: null }
function renderEvidence(role: UserRole = 'doctora') {
  return render(<AuthContext.Provider value={{ status: 'authenticated', user: { id: 'staff-1', name: 'Personal', username: 'personal', role, paciente_id: null, activo: true }, sessionError: null, login: async () => {}, logout: async () => {} }}><MemoryRouter initialEntries={['/pacientes/patient-1/radiografias']}><Routes><Route element={<Outlet context={patient}/>} path="/pacientes/:patientId"><Route element={<PatientEvidenceSection/>} path="radiografias"/></Route></Routes></MemoryRouter></AuthContext.Provider>)
}
beforeEach(() => { vi.resetAllMocks() })

describe('PatientEvidenceSection', () => {
  it('loads evidence metadata without exposing the storage path', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([evidence])
    renderEvidence('asistente')
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(await screen.findByText('Archivo recibido')).toBeInTheDocument()
    expect(getPatientEvidence).toHaveBeenCalledExactlyOnceWith(patient.id)
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
})
