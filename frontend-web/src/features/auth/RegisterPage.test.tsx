import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from './authContext'
import { RegisterPage } from './RegisterPage'
import type { RegisterPatientValues } from './registerPatientSchema'

function setup(registerPatient = vi.fn<(values: RegisterPatientValues) => Promise<void>>().mockResolvedValue()) {
  render(<MemoryRouter><AuthContext.Provider value={{ status: 'guest', user: null, sessionError: null, login: async () => {}, registerPatient, logout: async () => {} }}><RegisterPage/></AuthContext.Provider></MemoryRouter>)
  return registerPatient
}

function completeForm() {
  fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'Nombre recibido' } })
  fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: '0912345678' } })
  fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '0991234567' } })
  fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: 'Dirección recibida' } })
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '1990-01-01' } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-confirmada' } })
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'clave-confirmada' } })
}

describe('RegisterPage', () => {
  it('starts every confirmed field empty and rejects missing data', async () => {
    const registerPatient = setup()
    for (const label of ['Nombres', 'Cédula', 'Teléfono', 'Dirección', 'Fecha de nacimiento', 'Contraseña', 'Confirmar contraseña']) {
      expect(screen.getByLabelText(label)).toHaveValue('')
    }
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByText('Los nombres son obligatorios.')).toBeInTheDocument()
    expect(registerPatient).not.toHaveBeenCalled()
  })

  it('rejects a future birth date and mismatched confirmation', async () => {
    const registerPatient = setup()
    completeForm()
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2999-01-01' } })
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'otra-clave' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByText('La fecha de nacimiento no puede ser futura.')).toBeInTheDocument()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(registerPatient).not.toHaveBeenCalled()
  })

  it('submits only the confirmed registration payload', async () => {
    const registerPatient = setup()
    completeForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await waitFor(() => expect(registerPatient).toHaveBeenCalledWith({ nombres: 'Nombre recibido', cedula: '0912345678', telefono: '0991234567', direccion: 'Dirección recibida', fecha_nacimiento: '1990-01-01', password: 'clave-confirmada', password_confirmation: 'clave-confirmada' }))
  })

  it.each([
    ['422', { isAxiosError: true, response: { status: 422, data: { message: 'La cédula ya está registrada.' } } }, 'La cédula ya está registrada.'],
    ['network', { isAxiosError: true }, 'No fue posible comunicarse con el servidor.'],
  ])('shows the %s registration failure without claiming success', async (_kind, failure, message) => {
    const registerPatient = setup(vi.fn().mockRejectedValue(failure))
    completeForm()
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(registerPatient).toHaveBeenCalledTimes(1)
  })
})
