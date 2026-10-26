import { Component } from 'react';
import { CircleAlert, RotateCcw } from 'lucide-react';

/**
 * Catches render-time errors so a bug in one screen never produces a blank
 * page during a demo. Offers a local reset before falling back to a full
 * reload.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[LifeOS] Render error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="card w-full max-w-md p-6 text-center">
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
            <CircleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-lg font-semibold text-text">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            LifeOS hit an unexpected error. Your saved data is still in localStorage — try reloading the app.
          </p>
          <pre className="mt-3 max-h-24 overflow-auto rounded-lg bg-surface-3 p-2 text-left text-xs text-muted">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => this.setState({ error: null })}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
