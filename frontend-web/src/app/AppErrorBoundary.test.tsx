import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary'

function FailingView(): never {
  throw new Error('private-render-detail')
}

afterEach(() => vi.restoreAllMocks())

describe('AppErrorBoundary', () => {
  it('renders children while the application is healthy', () => {
    render(<AppErrorBoundary><p>Contenido disponible</p></AppErrorBoundary>)

    expect(screen.getByText('Contenido disponible')).toBeInTheDocument()
  })

  it('offers a safe way back when a child fails to render', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<AppErrorBoundary><FailingView/></AppErrorBoundary>)

    expect(screen.getByRole('heading', { name: 'Ocurrió un problema inesperado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
    expect(screen.queryByText('private-render-detail')).not.toBeInTheDocument()
  })
})
