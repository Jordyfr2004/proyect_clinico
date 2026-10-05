import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { PatientEvidenceSection } from './PatientEvidenceSection'
import { getPatientEvidence } from './evidenceService'

vi.mock('./evidenceService', () => ({ getPatientEvidence: vi.fn() }))
const evidence = { id: 'evidence-1', paciente_id: 'patient-1', tipo: 'rx' as const, nombre_archivo: 'Archivo recibido', ruta_archivo: 'internal/path', mime_type: 'image/png', tamano: 1024, descripcion: 'Descripción recibida', fecha: '2026-10-04' }
const patient = { id: 'patient-1', codigo_paciente: '001', nombres: 'Paciente recibido', cedula: '123', telefono: null, direccion: null, fecha_nacimiento: null }
function renderEvidence() {
  return render(<MemoryRouter initialEntries={['/pacientes/patient-1/radiografias']}><Routes><Route element={<Outlet context={patient}/>} path="/pacientes/:patientId"><Route element={<PatientEvidenceSection/>} path="radiografias"/></Route></Routes></MemoryRouter>)
}
beforeEach(() => { vi.resetAllMocks() })

describe('PatientEvidenceSection', () => {
  it('loads only received evidence metadata and offers no file or write action', async () => {
    vi.mocked(getPatientEvidence).mockResolvedValue([evidence])
    renderEvidence()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(await screen.findByText('Archivo recibido')).toBeInTheDocument()
    expect(getPatientEvidence).toHaveBeenCalledExactlyOnceWith(patient.id)
    expect(screen.getByText('1024 bytes')).toBeInTheDocument()
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
})
