import { Component } from 'react';

/**
 * React Error Boundary — catches runtime rendering errors and
 * shows a user-friendly recovery screen instead of a blank white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in dev; in production you'd send to Sentry / LogRocket
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#f3f8fc',
          fontFamily: "'Manrope', 'Inter', system-ui, sans-serif",
          padding: 24,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '40px 36px',
            maxWidth: 480,
            width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#fef2f2', color: '#dc2626',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, marginBottom: 16,
            }}>
              ⚠
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, color: '#163a52' }}>
              Something went wrong
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6b8499', lineHeight: 1.6 }}>
              An unexpected error occurred. You can try again or go back to the home page.
            </p>
            {this.state.error && (
              <details style={{
                textAlign: 'left', marginBottom: 20,
                background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
                fontSize: 12, color: '#94a3b8',
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#64748b' }}>
                  Error details
                </summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 8 }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: '1px solid #d5e3ef',
                  background: '#fff', color: '#175888', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 0,
                  background: '#175888', color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
