import type { Medication } from './prescriptionService'

export const emptyMedication = (): Medication => ({ nombre: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' })

/** Quita filas vacías y espacios, y descarta campos opcionales vacíos. */
export function cleanMedications(rows: Medication[]): Medication[] {
  return rows
    .map((row) => ({ nombre: row.nombre.trim(), dosis: row.dosis.trim(), frecuencia: row.frecuencia.trim(), duracion: row.duracion?.trim() || null, indicaciones: row.indicaciones?.trim() || null }))
    .filter((row) => row.nombre || row.dosis || row.frecuencia)
}

export function medicationsError(rows: Medication[]): string | null {
  if (rows.length === 0) return 'Agrega al menos un medicamento.'
  return rows.some((row) => !row.nombre || !row.dosis || !row.frecuencia) ? 'Cada medicamento necesita nombre, dosis y frecuencia.' : null
}
