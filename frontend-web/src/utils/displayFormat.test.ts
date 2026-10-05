import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatDateTime, formatFileSize } from './displayFormat'

describe('display formatting', () => {
  it('formats backend amounts as USD without calculating totals', () => {
    expect(formatCurrency('1250.00')).toBe('$1,250.00')
    expect(formatCurrency('45.50')).toBe('$45.50')
  })

  it('shows date-only values without shifting the calendar day', () => {
    expect(formatDate('2026-10-04')).toBe('4 de octubre de 2026')
    expect(formatDateTime('2026-10-04 10:00:00')).toContain('4 de octubre de 2026 · 10:00')
  })

  it('scales received file sizes for display', () => {
    expect(formatFileSize(512)).toBe('512 bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
  })
})
