import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/authContext'
import { OdontogramPreview } from './OdontogramPreview'
import { getOdontogram, saveOdontogram, deleteOdontogram } from './odontogramService'
vi.mock('./odontogramService', async (original) => ({ ...await original<typeof import('./odontogramService')>(), getOdontogram: vi.fn(), saveOdontogram: vi.fn(), deleteOdontogram: vi.fn() }))
function view(role: 'doctora' | 'asistente') {
 return render(<AuthContext.Provider value={{ status: 'authenticated', user: { id:'u', name:'D', username:'d', role, paciente_id:null, activo:true }, sessionError:null, login:async()=>{}, logout:async()=>{} }}><MemoryRouter><Routes><Route element={<Outlet context={{ id:'patient' }}/>}><Route index element={<OdontogramPreview/>}/></Route></Routes></MemoryRouter></AuthContext.Provider>)
}
beforeEach(()=>vi.resetAllMocks())
it('loads persisted teeth, preserves unknown fields and saves an explicit evaluation', async()=>{
 vi.mocked(getOdontogram).mockResolvedValue({ id:'o', paciente_id:'patient', datos:{ legacy: { retain:true } } })
 vi.mocked(saveOdontogram).mockResolvedValue({ id:'o', paciente_id:'patient', datos:{ legacy:{ retain:true }, frontend_web_v1:{ teeth:{ '11':{ condition:'caries', note:'' } } } } })
 view('doctora')
 expect(await screen.findByText('Sin evaluación registrada')).toBeInTheDocument()
 expect(screen.getByRole('radio', { name:'Sano' })).not.toBeChecked()
 fireEvent.click(screen.getByRole('radio', { name:'Caries' }))
 fireEvent.click(screen.getByRole('button', { name:'Guardar odontograma' }))
 expect(await screen.findByText('Odontograma guardado correctamente.')).toBeInTheDocument()
 expect(saveOdontogram).toHaveBeenCalledWith('patient', { legacy:{ retain:true }, frontend_web_v1:{ teeth:{ '11':{ condition:'caries', note:'' } } } })
})
it('allows assistant reading without any mutation controls', async()=>{
 vi.mocked(getOdontogram).mockResolvedValue(null)
 view('asistente')
 expect(await screen.findByText('Sin evaluación registrada')).toBeInTheDocument()
 expect(screen.queryByRole('button', {name:'Guardar odontograma'})).not.toBeInTheDocument()
 expect(screen.getByRole('radio', { name:'Sano' })).toBeDisabled()
 expect(deleteOdontogram).not.toHaveBeenCalled()
})
it('requires confirmation before deleting persisted chart', async()=>{
 vi.mocked(getOdontogram).mockResolvedValue({id:'o',paciente_id:'patient',datos:{}})
 vi.mocked(deleteOdontogram).mockResolvedValue('Odontograma eliminado correctamente.')
 view('doctora')
 fireEvent.click(await screen.findByRole('button',{name:'Eliminar odontograma'}))
 expect(deleteOdontogram).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'Confirmar eliminación'}))
 expect(await screen.findByText('Odontograma eliminado correctamente.')).toBeInTheDocument()
})

it('keeps the draft available after a failed save', async()=>{
 vi.mocked(getOdontogram).mockResolvedValue(null)
 vi.mocked(saveOdontogram).mockRejectedValue(new Error('offline'))
 view('doctora')
 await screen.findByText('Sin evaluación registrada')
 fireEvent.click(screen.getByRole('radio',{name:'Caries'}))
 fireEvent.click(screen.getByRole('button',{name:'Guardar odontograma'}))
 expect(await screen.findByRole('alert')).toHaveTextContent('Tus cambios siguen disponibles')
 expect(screen.getByRole('radio',{name:'Caries'})).toBeChecked()
 expect(screen.getByRole('button',{name:'Guardar odontograma'})).toBeEnabled()
})
it('does not overwrite a chart changed on the server after loading', async()=>{
 vi.mocked(getOdontogram).mockResolvedValueOnce(null).mockResolvedValueOnce({id:'other',paciente_id:'patient',datos:{foreign:'new'}})
 view('doctora')
 await screen.findByText('Sin evaluación registrada')
 fireEvent.click(screen.getByRole('radio',{name:'Caries'}))
 fireEvent.click(screen.getByRole('button',{name:'Guardar odontograma'}))
 expect(await screen.findByRole('alert')).toHaveTextContent('Tus cambios siguen disponibles')
 expect(saveOdontogram).not.toHaveBeenCalled()
})

it('does not delete a chart changed on the server after loading', async () => {
 vi.mocked(getOdontogram).mockResolvedValueOnce({ id: 'o', paciente_id: 'patient', datos: {} }).mockResolvedValueOnce({ id: 'o', paciente_id: 'patient', datos: { otherEditor: 'New findings' } })
 view('doctora')
 fireEvent.click(await screen.findByRole('button', { name: 'Eliminar odontograma' }))
 fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
 await waitFor(() => expect(getOdontogram).toHaveBeenCalledTimes(2))
 expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
 expect(deleteOdontogram).not.toHaveBeenCalled()
})

it('keeps incompatible persisted tooth values read-only', async () => {
 vi.mocked(getOdontogram).mockResolvedValue({ id: 'o', paciente_id: 'patient', datos: { frontend_web_v1: { teeth: { '11': { condition: 'implante', note: 'Existing finding' } } } } })
 view('doctora')
 expect(await screen.findByRole('radio', { name: 'Caries' })).toBeDisabled()
 expect(screen.getByRole('textbox', { name: 'Observación' })).toBeDisabled()
 expect(screen.getByRole('button', { name: 'Guardar odontograma' })).toBeDisabled()
})
