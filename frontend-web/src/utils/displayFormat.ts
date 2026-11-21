const dateFormatter = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const localDateFormatter = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const sizeFormatter = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 })

export function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

export function formatDateTime(value: string): string {
  const date = new Date(value.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? value : `${localDateFormatter.format(date)} · ${timeFormatter.format(date)}`
}

export function formatCurrency(value: string | number): string {
  const amount = Number(value)
  return Number.isFinite(amount) ? currencyFormatter.format(amount) : String(value)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${sizeFormatter.format(bytes / 1024)} KB`
  return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`
}
