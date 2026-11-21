import { z } from 'zod'

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    current_page: z.number().int().positive(),
    last_page: z.number().int().positive(),
    per_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    next_page_url: z.string().nullable(),
    prev_page_url: z.string().nullable(),
  })
}
