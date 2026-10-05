import { z } from 'zod'
import { apiClient } from '../../services/apiClient'

const expenseSchema = z.object({ id: z.string(), fecha: z.string(), concepto: z.string(), monto: z.union([z.string(), z.number()]) })
const summarySchema = z.object({ periodo: z.enum(['dia', 'semana', 'mes', 'anio']), ingresos: z.string(), egresos: z.string(), saldo: z.string() })
const messageSchema = z.object({ message: z.string() })

export type Expense = z.infer<typeof expenseSchema>
export type CashSummary = z.infer<typeof summarySchema>
export type CashPeriod = { periodo: 'dia' | 'semana'; fecha: string } | { periodo: 'mes'; mes: number; anio: number } | { periodo: 'anio'; anio: number }
export type ExpenseFilters = { fecha?: string; semana?: string; mes?: number; anio?: number }
export type ExpensePayload = { fecha: string; concepto: string; monto: number }

function requireApiBaseUrl() {
  if (!apiClient.defaults.baseURL) throw new Error('VITE_API_BASE_URL is not configured')
}

export async function getCashSummary(params: CashPeriod): Promise<CashSummary> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/reportes/caja', { params })
  return summarySchema.parse(data)
}

export async function getExpenses(params: ExpenseFilters): Promise<Expense[]> {
  requireApiBaseUrl()
  const { data } = await apiClient.get<unknown>('/egresos', { params })
  return z.object({ data: z.array(expenseSchema) }).parse(data).data
}

export async function createExpense(values: ExpensePayload): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.post<unknown>('/egresos', values)
  return messageSchema.parse(data).message
}

export async function updateExpense(id: string, values: ExpensePayload): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.put<unknown>(`/egresos/${encodeURIComponent(id)}`, values)
  return messageSchema.parse(data).message
}

export async function deleteExpense(id: string): Promise<string> {
  requireApiBaseUrl()
  const { data } = await apiClient.delete<unknown>(`/egresos/${encodeURIComponent(id)}`)
  return messageSchema.parse(data).message
}
