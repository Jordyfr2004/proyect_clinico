import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { clearClinicalQueries } from '../services/clinicalQuery'
import { clearClinicalViewState } from '../services/clinicalViewState'

afterEach(() => { cleanup(); clearClinicalQueries(); clearClinicalViewState() })
