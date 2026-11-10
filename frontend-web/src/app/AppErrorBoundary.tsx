import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-10">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Ocurrió un problema inesperado</h1>
          <p className="mt-3 leading-7 text-slate-600">No fue posible mostrar esta página. Puedes volver al inicio para intentarlo de nuevo.</p>
          <a className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-clinic-600 px-4 text-sm font-semibold text-white hover:bg-clinic-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-600" href="/">Volver al inicio</a>
        </div>
      </main>
    )
  }
}
