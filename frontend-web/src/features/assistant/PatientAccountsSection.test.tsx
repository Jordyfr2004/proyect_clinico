import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PatientAccountsSection } from './PatientAccountsSection'
import { activatePatientAccount, deactivatePatientAccount, getPatientAccounts, unlinkPatientAccount } from './patientAccountsService'

vi.mock('./patientAccountsService', () => ({ getPatientAccounts: vi.fn(), activatePatientAccount: vi.fn(), deactivatePatientAccount: vi.fn(), unlinkPatientAccount: vi.fn() }))

const linked = { id: 'patient-account-1', name: 'Cuenta recibida', username: '0912345678', email: null, role: 'paciente' as const, paciente_id: 'patient-1', activo: true, created_at: null }
const unlinked = { ...linked, paciente_id: null, activo: false }

beforeEach(() => { vi.resetAllMocks(); vi.mocked(getPatientAccounts).mockResolvedValue([linked]) })

describe('PatientAccountsSection', () => {
  it('loads patient accounts and distinguishes linked and inactive accounts', async () => {
    render(<PatientAccountsSection/>)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(await screen.findByText('Cuenta recibida')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toHaveClass('admin-pill-ready')
    expect(screen.getByText('Vinculada a expediente')).toHaveClass('admin-pill-ready')
    expect(screen.queryByText('Asistente')).not.toBeInTheDocument()
  })

  it('deactivates and refetches the actual state', async () => {
    vi.mocked(deactivatePatientAccount).mockResolvedValue('Cuenta desactivada.')
    vi.mocked(getPatientAccounts).mockResolvedValueOnce([linked]).mockResolvedValueOnce([{ ...linked, activo: false }])
    render(<PatientAccountsSection/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar' }))
    await waitFor(() => expect(deactivatePatientAccount).toHaveBeenCalledExactlyOnceWith(linked.id))
    expect(await screen.findByText(/Inactiva/)).toBeInTheDocument()
    expect(getPatientAccounts).toHaveBeenCalledTimes(2)
  })

  it('activates an existing inactive account and refetches', async () => {
    vi.mocked(getPatientAccounts).mockResolvedValueOnce([{ ...linked, activo: false }]).mockResolvedValueOnce([linked])
    vi.mocked(activatePatientAccount).mockResolvedValue('Cuenta activada.')
    render(<PatientAccountsSection/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    await waitFor(() => expect(activatePatientAccount).toHaveBeenCalledExactlyOnceWith(linked.id))
    expect(await screen.findByText(/Activa/)).toBeInTheDocument()
    expect(getPatientAccounts).toHaveBeenCalledTimes(2)
  })

  it('confirms unlinking, then refetches the inactive unlinked account', async () => {
    vi.mocked(unlinkPatientAccount).mockResolvedValue('Cuenta desvinculada.')
    vi.mocked(getPatientAccounts).mockResolvedValueOnce([linked]).mockResolvedValueOnce([unlinked])
    render(<PatientAccountsSection/>)
    fireEvent.click(await screen.findByRole('button', { name: 'Desvincular paciente' }))
    expect(unlinkPatientAccount).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Desvincular cuenta de paciente' })
    expect(dialog).toHaveTextContent('inactiva')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar desvinculación' }))
    await waitFor(() => expect(unlinkPatientAccount).toHaveBeenCalledExactlyOnceWith(linked.id))
    expect(await screen.findByText(/Desvinculada/)).toBeInTheDocument()
    expect(screen.getByText('Inactiva')).toHaveClass('admin-pill-pending')
    expect(screen.getByText('Desvinculada')).toHaveClass('admin-pill-pending')
    expect(getPatientAccounts).toHaveBeenCalledTimes(2)
  })
})
