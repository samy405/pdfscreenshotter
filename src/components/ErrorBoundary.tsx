import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            padding: '2rem',
            maxWidth: '480px',
            margin: '0 auto',
            textAlign: 'center',
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
          }}
          role="alert"
        >
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            Something went wrong
          </h2>
          <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
