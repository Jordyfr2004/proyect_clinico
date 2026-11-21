import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrescriptionTemplatesPage } from './PrescriptionTemplatesPage'
import { createPrescriptionTemplate, getPrescriptionTemplates, updatePrescriptionTemplate } from './prescriptionService'

vi.mock('./prescriptionService', () => ({ getPrescriptionTemplates: vi.fn(), createPrescriptionTemplate: vi.fn(), updatePrescriptionTemplate: vi.fn(), deletePrescriptionTemplate: vi.fn() }))
const template = { id: 'tpl-1', nombre: 'Post extracción', medicamentos: [{ nombre: 'Amoxicilina', dosis: '500 mg', frecuencia: 'Cada 8 horas', duracion: null, indicaciones: null }], indicaciones: null, activo: true }
beforeEach(() => { vi.resetAllMocks() })

describe('PrescriptionTemplatesPage', () => {
  it('creates a template', async () => {
    vi.mocked(getPrescriptionTemplates).mockResolvedValue([])
    vi.mocked(createPrescriptionTemplate).mockResolvedValue({ ...template, id: 'tpl-2', nombre: 'Analgésico' })
    render(<PrescriptionTemplatesPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva plantilla' }))
    const form = screen.getByRole('form', { name: 'Nueva plantilla' })
    fireEvent.change(within(form).getByLabelText('Nombre'), { target: { value: 'Analgésico' } })
    fireEvent.change(within(form).getByLabelText('Medicamento *'), { target: { value: 'Paracetamol' } })
    fireEvent.change(within(form).getByLabelText('Dosis *'), { target: { value: '500 mg' } })
    fireEvent.change(within(form).getByLabelText('Frecuencia *'), { target: { value: 'Cada 6 horas' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Guardar plantilla' }))
    expect(await screen.findByText('Plantilla guardada.')).toBeInTheDocument()
    expect(createPrescriptionTemplate).toHaveBeenCalledExactlyOnceWith({ nombre: 'Analgésico', medicamentos: [{ nombre: 'Paracetamol', dosis: '500 mg', frecuencia: 'Cada 6 horas', duracion: null, indicaciones: null }] })
  })

  it('deactivates a template', async () => {
    vi.mocked(getPrescriptionTemplates).mockResolvedValue([template])
    vi.mocked(updatePrescriptionTemplate).mockResolvedValue({ ...template, activo: false })
    render(<PrescriptionTemplatesPage/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar Post extracción' }))
    expect(await screen.findByText('Inactiva')).toBeInTheDocument()
    expect(updatePrescriptionTemplate).toHaveBeenCalledExactlyOnceWith('tpl-1', { activo: false })
  })
})
