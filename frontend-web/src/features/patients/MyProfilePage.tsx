import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { PatientFacts } from './PatientFacts'
import { getMyProfile, type PatientProfile } from './patientService'
import { patientLoadError } from './patientLoadError'

type ProfileState = { kind: 'loading' } | { kind: 'ready'; profile: PatientProfile } | { kind: 'missing'; message: string } | { kind: 'error'; message: string }

export function MyProfilePage() {
  const [state, setState] = useState<ProfileState>({ kind: 'loading' })
  const load = () => {
    setState({ kind: 'loading' })
    void getMyProfile().then(
      (profile) => setState({ kind: 'ready', profile }),
      (error: unknown) => setState(profileError(error)),
    )
  }

  useEffect(() => {
    let active = true
    void getMyProfile().then(
      (profile) => { if (active) setState({ kind: 'ready', profile }) },
      (error: unknown) => { if (active) setState(profileError(error)) },
    )
    return () => { active = false }
  }, [])

  return (
    <div className="max-w-4xl">
      <div className="border-b border-slate-200 pb-7">
        <h1 className="text-3xl font-bold tracking-tight text-ink-950">Mi perfil</h1>
        <p className="mt-2 leading-7 text-slate-600">Datos registrados en tu cuenta de paciente.</p>
      </div>
      {state.kind === 'loading' ? <div className="mt-6"><LoadingState/></div> : null}
      {state.kind === 'error' ? <div className="mt-6 rounded-2xl border border-slate-200 bg-white"><ErrorState description={state.message} onRetry={load}/></div> : null}
      {state.kind === 'missing' ? <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950" role="alert">{state.message}</p> : null}
      {state.kind === 'ready' ? <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-label="Datos de mi perfil"><PatientFacts patient={state.profile}/></section> : null}
    </div>
  )
}

function profileError(error: unknown): ProfileState {
  if (isAxiosError(error) && error.response?.status === 404) {
    const message = (error.response.data as { message?: unknown } | undefined)?.message
    return { kind: 'missing', message: typeof message === 'string' && message.trim() ? message : 'No se encontró el perfil del paciente.' }
  }
  return { kind: 'error', message: patientLoadError(error) }
}
