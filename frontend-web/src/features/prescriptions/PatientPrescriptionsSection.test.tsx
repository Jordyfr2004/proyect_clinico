import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../auth/authContext'
import type { UserRole } from '../auth/authService'
import { PatientPrescriptionsSection } from './PatientPrescriptionsSection'
import { createPrescription, deletePrescription, getPatientPrescriptions, getPrescriptionTemplates } from './prescriptionService'
import { prescriptionHtml } from './printPrescription'

vi.mock('./prescriptionService', () => ({ getPatientPrescriptions: vi.fn(), createPrescription: vi.fn(), deletePrescription: vi.fn(), getPrescriptionTemplates: vi.fn() }))
const patient = { id: 'patient-1', codigo_paciente: '001', nombres: 'Ana Prueba', cedula: '1234567890', telefono: null, direccion: null, fecha_nacimiento: null }
const prescription = { id: 'rx-1', paciente_id: 'patient-1', agenda_id: null, fecha: '2026-10-18', diagnostico: 'Pulpitis', medicamentos: [{ nombre: 'Ibuprofeno', dosis: '400 mg', frecuencia: 'Cada 8 horas', duracion: '3 días', indicaciones: null }], indicaciones: 'Dieta blanda', emitida_por: { id: 'd-1', name: 'Dra. López', role: 'doctora' } }
const template = { id: 'tpl-1', nombre: 'Post extracción', medicamentos: [{ nombre: 'Amoxicilina', dosis: '500 mg', frecuencia: 'Cada 8 horas', duracion: '7 días', indicaciones: null }], indicaciones: 'No enjuagarse 24 horas', activo: true }

function renderSection(role: UserRole = 'doctora') {
  return render(<AuthContext.Provider value={{ status: 'authenticated', user: { id: 'staff-1', name: 'Personal', username: 'personal', role, paciente_id: null, activo: true }, sessionError: null, login: async () => {}, logout: async () => {} }}><MemoryRouter initialEntries={['/pacientes/patient-1/recetas']}><Routes><Route element={<Outlet context={patient}/>} path="/pacientes/:patientId"><Route element={<PatientPrescriptionsSection/>} path="recetas"/></Route></Routes></MemoryRouter></AuthContext.Provider>)
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getPrescriptionTemplates).mockResolvedValue([template]) })

describe('PatientPrescriptionsSection', () => {
  it('lists the patient prescriptions', async () => {
    vi.mocked(getPatientPrescriptions).mockResolvedValue([prescription])
    renderSection('asistente')
    expect(await screen.findByText('Receta del 18 de octubre de 2026')).toBeInTheDocument()
    expect(getPatientPrescriptions).toHaveBeenCalledWith('patient-1', expect.any(AbortSignal))
    expect(screen.getByText('Ibuprofeno')).toBeInTheDocument()
    expect(screen.getByText('Emitida por Dra. López')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Imprimir receta del 18 de octubre de 2026' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nueva receta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Eliminar receta/ })).not.toBeInTheDocument()
  })

  it('creates a prescription from a template', async () => {
    vi.mocked(getPatientPrescriptions).mockResolvedValue([])
    vi.mocked(createPrescription).mockResolvedValue({ ...prescription, id: 'rx-2', diagnostico: 'Extracción', medicamentos: template.medicamentos })
    renderSection()
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva receta' }))
    const form = screen.getByRole('form', { name: 'Nueva receta' })
    fireEvent.change(await within(form).findByLabelText('Usar plantilla'), { target: { value: 'tpl-1' } })
    expect(within(form).getByDisplayValue('Amoxicilina')).toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Diagnóstico'), { target: { value: 'Extracción' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Emitir receta' }))
    expect(await screen.findByText('Receta emitida. El paciente puede verla en la app móvil.')).toBeInTheDocument()
    expect(createPrescription).toHaveBeenCalledExactlyOnceWith({ paciente_id: 'patient-1', diagnostico: 'Extracción', indicaciones: 'No enjuagarse 24 horas', medicamentos: [{ nombre: 'Amoxicilina', dosis: '500 mg', frecuencia: 'Cada 8 horas', duracion: '7 días', indicaciones: null }] })
  })

  it('validates medications before sending', async () => {
    vi.mocked(getPatientPrescriptions).mockResolvedValue([])
    renderSection()
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva receta' }))
    const form = screen.getByRole('form', { name: 'Nueva receta' })
    fireEvent.change(within(form).getByLabelText('Medicamento *'), { target: { value: 'Ibuprofeno' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Emitir receta' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('Cada medicamento necesita nombre, dosis y frecuencia.')
    expect(createPrescription).not.toHaveBeenCalled()
  })

  it('asks for confirmation before deleting', async () => {
    vi.mocked(getPatientPrescriptions).mockResolvedValue([prescription])
    vi.mocked(deletePrescription).mockResolvedValue()
    renderSection()
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar receta del 18 de octubre de 2026' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Eliminar receta' })).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByText('Ibuprofeno')).not.toBeInTheDocument())
    expect(deletePrescription).toHaveBeenCalledExactlyOnceWith('rx-1')
  })

  it('escapes user content in the printable prescription', () => {
    const html = prescriptionHtml({ ...prescription, diagnostico: '<script>alert(1)</script>' }, 'Ana <b>Prueba</b>')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('Ana &lt;b&gt;Prueba&lt;/b&gt;')
  })
})
