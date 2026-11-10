import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IncrementalList } from './IncrementalList'

describe('IncrementalList', () => {
  it('renders received records in bounded batches without truncating access to the remainder', () => {
    const records = Array.from({ length: 120 }, (_, index) => `Registro ${index + 1}`)
    render(<IncrementalList items={records} renderItem={(record) => <li key={record}>{record}</li>}/>)
    expect(screen.getAllByRole('listitem')).toHaveLength(50)
    expect(screen.getByText('Mostrando 50 de 120 registros recibidos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar más registros' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(100)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar más registros' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(120)
    expect(screen.queryByRole('button', { name: 'Mostrar más registros' })).not.toBeInTheDocument()
  })

  it('starts at the first batch when the server result changes', () => {
    const renderItem = (record: string) => <li key={record}>{record}</li>
    const first = Array.from({ length: 120 }, (_, index) => `Primero ${index}`)
    const { rerender } = render(<IncrementalList items={first} renderItem={renderItem}/>)
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar más registros' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(100)
    const second = Array.from({ length: 80 }, (_, index) => `Segundo ${index}`)
    rerender(<IncrementalList items={second} renderItem={renderItem}/>)
    expect(screen.getAllByRole('listitem')).toHaveLength(50)
    expect(screen.getByText('Mostrando 50 de 80 registros recibidos')).toBeInTheDocument()
  })
})
