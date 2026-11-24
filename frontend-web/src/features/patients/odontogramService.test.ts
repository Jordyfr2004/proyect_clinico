import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { getOdontogram, saveOdontogram, deleteOdontogram, mergeTooth, chartEditable, toothDrafts } from './odontogramService'
afterEach(() => vi.restoreAllMocks())
it('preserves unknown JSON while changing a tooth without assuming healthy', () => {
 const original = { legacy: { surfaces: ['a'] }, frontend_web_v1: { extra: 7, teeth: { '11': { condition: 'caries', note: '', surface: 'distal' } } } }
 const next = mergeTooth(original, 11, { condition: 'sano', note: 'control' })
 expect(next).toEqual({ legacy: { surfaces: ['a'] }, frontend_web_v1: { extra: 7, teeth: { '11': { condition: 'sano', note: 'control', surface: 'distal' } } } })
 expect(original.frontend_web_v1.teeth['11'].condition).toBe('caries')
 expect(mergeTooth({}, 12, { condition: 'pendiente', note: 'revisar' })).toEqual({ frontend_web_v1: { teeth: { '12': { condition: 'pendiente', note: 'revisar' } } } })
})
it('validates patient identity before exposing or saving a chart', async () => {
 apiClient.defaults.baseURL = 'http://api.test/api'
 vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { paciente: { id: 'other' }, odontograma: null } })
 await expect(getOdontogram('patient')).rejects.toThrow()
 vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { data: { id: 'one', paciente_id: 'other', datos: {} } } })
 await expect(saveOdontogram('patient', {})).rejects.toThrow()
})

it('uses only the official GET PUT DELETE patient routes and payload', async () => {
 apiClient.defaults.baseURL = 'http://api.test/api'
 const record = { id:'chart', paciente_id:'patient', datos:{ frontend_web_v1:{ teeth:{ '11':{condition:'sano',note:''} } } } }
 const get=vi.spyOn(apiClient,'get').mockResolvedValue({data:{paciente:{id:'patient'},odontograma:record}})
 const put=vi.spyOn(apiClient,'put').mockResolvedValue({data:{message:'Guardado.',data:record}})
 const remove=vi.spyOn(apiClient,'delete').mockResolvedValue({data:{message:'Eliminado.'}})
 expect(await getOdontogram('patient')).toEqual(record)
 expect(await saveOdontogram('patient',record.datos)).toEqual(record)
 expect(await deleteOdontogram('patient')).toBe('Eliminado.')
 expect(get).toHaveBeenCalledWith('/odontogramas/paciente/patient',{})
 expect(put).toHaveBeenCalledWith('/odontogramas/paciente/patient',{datos:record.datos})
 expect(remove).toHaveBeenCalledWith('/odontogramas/paciente/patient')
})
it('does not interpret opaque legacy values as healthy or permit destructive graphic conversion', () => {
 expect(toothDrafts({legacy:{'11':'healthy'}})).toEqual({})
 expect(chartEditable([{legacy:1}])).toBe(false)
 expect(chartEditable({frontend_web_v1:{teeth:42}})).toBe(false)
 expect(() => mergeTooth({frontend_web_v1:{teeth:42}},11,{condition:'sano',note:''})).toThrow()
})
it('preserves unrecognized tooth conditions and incompatible notes by refusing graphical conversion', () => {
 const unknown = { frontend_web_v1: { teeth: { '11': { condition: 'implante', note: 'Existing note', extra: true } } } }
 expect(chartEditable(unknown)).toBe(false)
 expect(chartEditable({ frontend_web_v1: { teeth: { '11': { condition: 'sano', note: { legacy: true } } } } })).toBe(false)
 expect(() => mergeTooth(unknown, 11, { condition: 'caries', note: '' })).toThrow()
 expect(unknown.frontend_web_v1.teeth['11'].note).toBe('Existing note')
})
