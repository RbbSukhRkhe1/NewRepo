import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Shown in dev only for debugging */
  context?: string;
};

type State = {
  hasError: boolean;
  message: string | null;
};

/**
 * Catches React render/lifecycle errors in vault-related transaction UI.
 * Async API failures are still handled via explicit error state in parents;
 * this boundary covers thrown errors from children during render.
 */
export class VaultTxErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[VaultTxErrorBoundary]', this.props.context ?? 'vault-tx', error, info.componentStack);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/35 bg-rose-950/50 p-4 text-sm text-rose-100"
        >
          <p className="font-semibold text-rose-50">Transaction UI error</p>
          <p className="mt-1 text-xs text-zinc-400">
            Vault or chain interaction failed unexpectedly. Check your network and try again.
          </p>
          {this.state.message && (
            <p className="mt-2 font-mono text-xs text-rose-200/90">{this.state.message}</p>
          )}
          <button
            type="button"
            className="mt-3 text-sm font-medium text-cyan-400 underline hover:text-cyan-300"
            onClick={this.handleReset}
          >
            Dismiss and retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
