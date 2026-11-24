/// <reference types="node" />
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve('src/app', path), 'utf8')
describe('retired production integrations', () => {
  it('has no prescription routes, permissions, tabs or obsolete service directory', () => {
    expect(read('./AppRouter.tsx')).not.toMatch(/prescriptions|path="recetas"|plantillas-recetas/)
    expect(read('../features/patients/PatientWorkspace.tsx')).not.toMatch(/recetas|Recetas/)
    expect(read('../features/auth/roleAccess.ts')).not.toMatch(/recetas/)
    expect(existsSync(resolve('src/features/prescriptions'))).toBe(false)
  })
})
