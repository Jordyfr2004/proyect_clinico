import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CatalogPage } from './CatalogPage'
import { createCategory, deleteService, getCategories, getServices, setCategoryActive } from './catalogService'

vi.mock('./catalogService', () => ({ getCategories: vi.fn(), getServices: vi.fn(), createCategory: vi.fn(), updateCategory: vi.fn(), setCategoryActive: vi.fn(), createService: vi.fn(), updateService: vi.fn(), setServiceActive: vi.fn(), deleteService: vi.fn() }))
const category = { id: 'category-id', nombre: 'Categoría recibida', activo: true }
const service = { id: 'service-id', categoria_id: category.id, nombre: 'Servicio recibido', descripcion: 'Descripción recibida', imagen: null, precio: '15.00', duracion_minutos: 30, activo: true, categoria: category }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getCategories).mockResolvedValue([category]); vi.mocked(getServices).mockResolvedValue([service]) })

describe('CatalogPage', () => {
  it('keeps all fetched services reachable while limiting the initial DOM', async () => {
    vi.mocked(getServices).mockResolvedValue(Array.from({ length: 120 }, (_, index) => ({ ...service, id: `service-${index}`, nombre: `Servicio ${index}` })))
    render(<MemoryRouter><CatalogPage/></MemoryRouter>)
    expect(await screen.findByText('Servicio 0')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 50 de 120 registros recibidos')).toBeInTheDocument()
    expect(screen.queryByText('Servicio 119')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar más registros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar más registros' }))
    expect(screen.getByText('Servicio 119')).toBeInTheDocument()
    expect(getServices).toHaveBeenCalledTimes(1)
  })

  it('keeps received services visible if the independent categories request fails', async () => {
    vi.mocked(getCategories).mockRejectedValue(new Error('network'))
    render(<MemoryRouter><CatalogPage/></MemoryRouter>)
    expect(await screen.findByText(service.nombre)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No fue posible completar la operación.')
    expect(screen.queryByRole('region', { name: 'Categorías' })).not.toBeInTheDocument()
  })

  it('lists backend categories and services without offering broken category deletion', async () => {
    render(<MemoryRouter><CatalogPage/></MemoryRouter>)
    const categories = await screen.findByRole('region', { name: 'Categorías' })
    expect(within(categories).getByText(category.nombre)).toBeInTheDocument()
    expect(screen.getByText(service.nombre)).toBeInTheDocument()
    expect(screen.getByText('$15.00', { exact: false })).toBeInTheDocument()
    expect(within(categories).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  it('creates and refreshes a category using the confirmed contract', async () => {
    vi.mocked(createCategory).mockResolvedValue(category)
    render(<MemoryRouter><CatalogPage/></MemoryRouter>)
    await screen.findByRole('region', { name: 'Categorías' })
    fireEvent.change(screen.getByLabelText('Nombre de la categoría'), { target: { value: 'Nueva categoría' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }))
    await waitFor(() => expect(createCategory).toHaveBeenCalledExactlyOnceWith('Nueva categoría'))
    await waitFor(() => expect(getCategories).toHaveBeenCalledTimes(2))
  })

  it('shows backend 409 and refreshes category status', async () => {
    vi.mocked(setCategoryActive).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'La categoría ya está inactiva.' } } })
    vi.mocked(getCategories).mockResolvedValueOnce([category]).mockResolvedValueOnce([{ ...category, activo: false }])
    render(<MemoryRouter><CatalogPage/></MemoryRouter>)
    const categories = await screen.findByRole('region', { name: 'Categorías' })
    fireEvent.click(await within(categories).findByRole('button', { name: 'Desactivar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La categoría ya está inactiva.')
    expect(await within(categories).findByRole('button', { name: 'Activar' })).toBeInTheDocument()
  })

  it('requires confirmation before deleting only the selected service', async () => {
    vi.mocked(deleteService).mockResolvedValue('Servicio eliminado correctamente.')
    vi.mocked(getServices).mockResolvedValueOnce([service]).mockResolvedValueOnce([])
    render(<MemoryRouter><CatalogPage/></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }))
    expect(deleteService).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))
    await waitFor(() => expect(deleteService).toHaveBeenCalledExactlyOnceWith(service.id))
    expect(await screen.findByText('Sin servicios')).toBeInTheDocument()
    expect(getCategories).toHaveBeenCalledTimes(1)
    expect(getServices).toHaveBeenCalledTimes(2)
  })
})
