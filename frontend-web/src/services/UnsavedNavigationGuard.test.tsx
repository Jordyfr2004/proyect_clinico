import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { UnsavedNavigationGuard } from './UnsavedNavigationGuard'
import { useClinicalUnsavedChanges } from '../features/patients/odontogramUnsavedChanges'
import { useState } from 'react'
import { AppLayout } from '../layouts/AppLayout'
import { AuthContext } from '../features/auth/authContext'
import { UnsavedEditorsContext } from './navigationGuardContext'
import { MemoryRouter } from 'react-router-dom'

afterEach(() => vi.restoreAllMocks())
function Edit() {
  const [draft, setDraft] = useState('')
  useClinicalUnsavedChanges(Boolean(draft))
  return <label>Draft<input onChange={(event) => setDraft(event.target.value)} value={draft}/></label>
}
it('retains a dirty draft on rejected history Back, then allows confirmed Back', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const router = createMemoryRouter([{ element: <UnsavedNavigationGuard><Outlet/></UnsavedNavigationGuard>, children: [
    { path: '/prior', element: <h1>Prior page</h1> }, { path: '/edit', element: <Edit/> },
  ] }], { initialEntries: ['/prior', '/edit'], initialIndex: 1 })
  render(<RouterProvider router={router}/>)
  fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'Unsaved data' } })
  await act(async () => { await router.navigate(-1) })
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1))
  expect(screen.getByLabelText('Draft')).toHaveValue('Unsaved data')
  expect(router.state.location.pathname).toBe('/edit')
  confirm.mockReturnValue(true)
  await act(async () => { await router.navigate(-1) })
  expect(await screen.findByRole('heading', { name: 'Prior page' })).toBeInTheDocument()
})
it('blocks programmatic navigation while dirty without double prompting', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const router = createMemoryRouter([{ element: <UnsavedNavigationGuard><Outlet/></UnsavedNavigationGuard>, children: [
    { path: '/edit', element: <Edit/> }, { path: '/other', element: <h1>Other page</h1> },
  ] }], { initialEntries: ['/edit'] })
  render(<RouterProvider router={router}/>)
  fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'Unsaved data' } })
  await act(async () => { await router.navigate('/other') })
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1))
  expect(router.state.location.pathname).toBe('/edit')
})

it('keeps the current session and editor when voluntary logout is declined', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const logout = vi.fn(async () => {})
  render(<MemoryRouter><AuthContext.Provider value={{ status: 'authenticated', user: { id: 'staff', name: 'Personal', username: 'staff', role: 'doctora', paciente_id: null, activo: true }, sessionError: null, login: async () => {}, logout }}><UnsavedEditorsContext.Provider value={true}><AppLayout/></UnsavedEditorsContext.Provider></AuthContext.Provider></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de perfil' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
  expect(confirm).toHaveBeenCalledTimes(1)
  expect(logout).not.toHaveBeenCalled()
  confirm.mockReturnValue(true)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
  await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
})
