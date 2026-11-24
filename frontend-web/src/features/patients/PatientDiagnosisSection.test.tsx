import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { AuthContext } from '../auth/authContext'
import { PatientDiagnosisSection } from './PatientDiagnosisSection'
import { markClinicalQueriesStale } from '../../services/clinicalQuery'
const patientId = '11111111-1111-4111-8111-111111111111'
function view(role: 'doctora' | 'asistente') {
 return render(<AuthContext.Provider value={{ status:'authenticated', user:{ id:'u', name:'D', username:'d', role, paciente_id:null, activo:true }, sessionError:null, login:async()=>{}, logout:async()=>{} }}><MemoryRouter initialEntries={['/diagnosticos?apartado=diagnostico']}><Routes><Route element={<Outlet context={{ id:patientId }}/>}><Route path="diagnosticos" element={<PatientDiagnosisSection/>}/></Route></Routes></MemoryRouter></AuthContext.Provider>)
}
beforeEach(()=>{ vi.restoreAllMocks(); apiClient.defaults.baseURL='http://api.test/api' })
it('reads official agenda, excludes other patient IDs and unlinked reservations', async()=>{
 const record = { id:'appointment', paciente_id:patientId, tipo:'cita_medica', fecha:'2026-11-04', diagnostico:'Diagnóstico propio', tratamiento:'Tratamiento propio', observacion:null }
 const get=vi.spyOn(apiClient,'get').mockResolvedValue({data:{data:[record,{...record,id:'other',paciente_id:'22222222-2222-4222-8222-222222222222',diagnostico:'Privado ajeno'},{...record,id:'reservation',paciente_id:null,diagnostico:'Reserva privada'}]}})
 view('doctora')
 expect(await screen.findByText('Diagnóstico propio')).toBeInTheDocument()
 expect(screen.queryByText('Privado ajeno')).not.toBeInTheDocument()
 expect(screen.queryByText('Reserva privada')).not.toBeInTheDocument()
 expect(get).toHaveBeenCalledWith('/agenda',expect.objectContaining({params:{tipo:'cita_medica'}}))
 fireEvent.click(screen.getByRole('button',{name:'Tratamientos'}))
 expect(await screen.findByText('Tratamiento propio')).toBeInTheDocument()
})

it('refreshes the patient record after official agenda invalidation', async () => {
 const record = { id: 'appointment', paciente_id: patientId, tipo: 'cita_medica', fecha: '2026-11-04', diagnostico: 'Previous finding', tratamiento: null, observacion: null }
 vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: [record] } }).mockResolvedValueOnce({ data: { data: [{ ...record, diagnostico: 'Updated finding' }] } })
 const first = view('doctora')
 expect(await screen.findByText('Previous finding')).toBeInTheDocument()
 first.unmount()
 await markClinicalQueriesStale(['agenda'])
 view('doctora')
 expect(await screen.findByText('Updated finding')).toBeInTheDocument()
})
it('does not request agenda for assistants', async()=>{
 const get=vi.spyOn(apiClient,'get')
 view('asistente')
 expect(await screen.findByText(/consulta de diagnósticos y tratamientos está disponible para la doctora/)).toBeInTheDocument()
 expect(get).not.toHaveBeenCalled()
 expect(screen.queryByRole('link',{name:/Citas médicas/})).not.toBeInTheDocument()
})
