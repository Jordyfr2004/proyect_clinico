import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppRouter } from './app/AppRouter'
import { AuthProvider } from './features/auth/AuthProvider'
import { UnsavedNavigationGuard } from './services/UnsavedNavigationGuard'

const router = createBrowserRouter([{ path: '*', element: <AuthProvider><UnsavedNavigationGuard><AppRouter/></UnsavedNavigationGuard></AuthProvider> }])

export default function App() {
  return <RouterProvider router={router}/>
}
