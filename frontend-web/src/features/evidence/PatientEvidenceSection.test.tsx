import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
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
  it('loads only received evidence metadata and offers no file or write action', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([evidence])
    renderEvidence()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(await screen.findByText('Archivo recibido')).toBeInTheDocument()
    expect(getPatientEvidence).toHaveBeenCalledExactlyOnceWith(patient.id, expect.any(AbortSignal))
    expect(screen.getByText('1 KB')).toBeInTheDocument()
    expect(screen.getByText('Radiografía')).toBeInTheDocument()
    expect(screen.getByText('4 de octubre de 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(evidence.ruta_archivo)).not.toBeInTheDocument()
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
})
