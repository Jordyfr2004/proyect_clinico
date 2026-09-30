import { describe, expect, it } from 'vitest'
import { loginSchema } from './loginSchema'

describe('loginSchema', () => {
  it('requires a username and a password', () => {
    const result = loginSchema.safeParse({ username: '   ', password: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.username).toContain('La cédula es obligatoria.')
      expect(result.error.flatten().fieldErrors.password).toContain('La contraseña es obligatoria.')
    }
  })

  it('rejects a password shorter than eight characters', () => {
    const result = loginSchema.safeParse({ username: '1234567890', password: '123' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain('La contraseña debe tener al menos 8 caracteres.')
    }
  })

  it('accepts a username without requiring an email or changing case', () => {
    const result = loginSchema.parse({ username: '  ABC1234567 ', password: 'Clave segura 2026' })

    expect(result).toEqual({ username: 'ABC1234567', password: 'Clave segura 2026' })
  })
})

