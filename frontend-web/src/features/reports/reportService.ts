import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const money = z.string().regex(/^-?\d+\.\d{2}$/)
const balance = z.object({ ingresos: money, egresos: money, saldo: money })
const clinicalSchema = z.object({
  total_pacientes: z.number().int().nonnegative(),
  historiales_clinicos: z.number().int().nonnegative(),
  citas: z.object({ pendientes: z.number(), programadas: z.number(), completadas: z.number(), canceladas: z.number() }),
  total_actividades: z.number().int().nonnegative(),
  actividades_frecuentes: z.array(z.object({ actividad: z.string(), cantidad: z.coerce.number().int().nonnegative() })),
})
const financialSchema = z.object({ anio: z.number().int(), meses: z.array(balance.extend({ mes: z.number().int().min(1).max(12) })).length(12) })
const incomeSchema = z.object({
  total_ingresos: money,
  por_actividad: z.array(z.object({ actividad: z.string(), cantidad: z.number().int().nonnegative(), total: money })),
})
const dashboardSchema = z.object({
  pacientes: z.object({ total: z.number().int().nonnegative() }),
  citas: z.object({ hoy: z.number().int().nonnegative(), solicitudes_pendientes: z.number().int().nonnegative() }),
  mes_actual: balance,
})

export type ClinicalReport = z.infer<typeof clinicalSchema>
export type EconomicReport = z.infer<typeof balance>
export type FinancialReport = z.infer<typeof financialSchema>
export type IncomeReport = z.infer<typeof incomeSchema>
export type DashboardReport = z.infer<typeof dashboardSchema>

async function getReport<T extends z.ZodType>(path: string, schema: T, params?: Record<string, number>, signal?: AbortSignal): Promise<z.infer<T>> {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
  const { data } = await apiClient.get<unknown>(path, { params, ...(signal ? { signal } : {}) })
  return schema.parse(data)
}

export const getClinicalReport = (signal?: AbortSignal) => getReport('/reportes/clinicos', clinicalSchema, undefined, signal)
export const getEconomicReport = (signal?: AbortSignal) => getReport('/reportes/economicos', balance, undefined, signal)
export const getFinancialReport = (anio: number, signal?: AbortSignal) => getReport('/reportes/financieros', financialSchema, { anio }, signal)
export const getIncomeReport = (signal?: AbortSignal) => getReport('/reportes/ingresos', incomeSchema, undefined, signal)
export const getDashboardReport = (signal?: AbortSignal) => getReport('/reportes/dashboard', dashboardSchema, undefined, signal)
