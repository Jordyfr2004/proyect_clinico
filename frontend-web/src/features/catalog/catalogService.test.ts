import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../services/apiClient'
import { createCategory, createService, deleteService, getCategories, getServices, setCategoryActive, setServiceActive, updateCategory, updateService } from './catalogService'

const originalBase = apiClient.defaults.baseURL
afterEach(() => { apiClient.defaults.baseURL = originalBase; vi.restoreAllMocks() })
const category = { id: 'category-id', nombre: 'Categoría recibida', activo: true }
const service = { id: 'service-id', categoria_id: category.id, nombre: 'Servicio recibido', descripcion: 'Descripción recibida', imagen: null, precio: '15.00', duracion_minutos: 30, activo: true, categoria: category }

describe('catalogService', () => {
  it('uses only the confirmed category and service collection paths', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    const get = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { data: [category] } }).mockResolvedValueOnce({ data: { data: [service] } })
    expect(await getCategories()).toEqual([category])
    expect(await getServices()).toEqual([service])
    expect(get).toHaveBeenNthCalledWith(1, '/categorias-servicios')
    expect(get).toHaveBeenNthCalledWith(2, '/servicios-consultorio')
  })

  it('sends confirmed category mutations without exposing category deletion', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: 'Creada', data: category } })
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Actualizada', data: category } })
    expect(await createCategory(category.nombre)).toEqual(category)
    expect(await updateCategory(category.id, category.nombre)).toEqual(category)
    expect(await setCategoryActive(category.id, false)).toEqual(category)
    expect(post).toHaveBeenCalledExactlyOnceWith('/categorias-servicios', { nombre: category.nombre })
    expect(put).toHaveBeenNthCalledWith(1, '/categorias-servicios/category-id', { nombre: category.nombre })
    expect(put).toHaveBeenNthCalledWith(2, '/categorias-servicios/category-id/desactivar')
  })

  it('sends only confirmed service fields and id-specific mutations', async () => {
    apiClient.defaults.baseURL = 'https://api.test/api'
    const values = { categoria_id: category.id, nombre: service.nombre, descripcion: service.descripcion, imagen: null, precio: 15, duracion_minutos: 30 }
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { message: 'Creado', data: service } })
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { message: 'Actualizado', data: service } })
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { message: 'Eliminado' } })
    expect(await createService(values)).toEqual(service)
    expect(await updateService(service.id, values)).toEqual(service)
    expect(await setServiceActive(service.id, false)).toEqual(service)
    expect(await deleteService(service.id)).toBe('Eliminado')
    expect(post).toHaveBeenCalledExactlyOnceWith('/servicios-consultorio', values)
    expect(put).toHaveBeenNthCalledWith(1, '/servicios-consultorio/service-id', values)
    expect(put).toHaveBeenNthCalledWith(2, '/servicios-consultorio/service-id/desactivar')
    expect(remove).toHaveBeenCalledExactlyOnceWith('/servicios-consultorio/service-id')
  })
})
