import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render-time errors anywhere below it so a single failing component
 * shows a recoverable message instead of a blank white page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Unhandled UI error:', error, info.componentStack)
    }
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md rounded-card border border-gray-200 bg-white p-8 text-center shadow-elevation-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-card bg-warning-50 text-warning-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-navy-900">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            The page ran into an unexpected problem. Reloading usually clears it.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 overflow-x-auto rounded-control bg-surface p-3 text-left text-xs text-steel-600">
              {error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 w-full rounded-control bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-180 hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
