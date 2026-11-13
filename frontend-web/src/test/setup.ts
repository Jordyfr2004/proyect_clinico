import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { clearClinicalQueries } from '../services/clinicalQuery'
import { clearClinicalViewState } from '../services/clinicalViewState'

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
})

afterEach(() => { cleanup(); clearClinicalQueries(); clearClinicalViewState() })
