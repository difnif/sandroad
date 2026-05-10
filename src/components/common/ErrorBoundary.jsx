import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, resetKey: 0, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error?.message, error?.stack?.slice(0, 300));
    const { retryCount } = this.state;
    if (retryCount < 5) {
      setTimeout(() => {
        this.setState(prev => ({
          hasError: false, error: null, errorInfo: null,
          resetKey: prev.resetKey + 1,
          retryCount: prev.retryCount + 1
        }));
      }, 1000 * (retryCount + 1));
    }
  }

  render() {
    if (this.state.hasError && this.state.retryCount >= 5) {
      return (
        <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 11, background: '#1e1e1e', color: '#ff6b6b', minHeight: '100vh', overflow: 'auto' }}>
          <h2 style={{ color: '#ffd93d' }}>⚠️ sandroad error (5회 재시도 실패)</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#ff6b6b', marginBottom: 8 }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#777', fontSize: 9, maxHeight: 200, overflow: 'auto' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => this.setState({ hasError: false, retryCount: 0, resetKey: this.state.resetKey + 1 })}
              style={{ padding: '6px 12px', background: '#ffd93d', color: '#000', border: 'none', borderRadius: 6, fontWeight: 'bold', fontSize: 12 }}>
              다시 시도
            </button>
            <button onClick={() => { window.location.href = '/'; }}
              style={{ padding: '6px 12px', background: '#444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12 }}>
              에디터로
            </button>
          </div>
        </div>
      );
    }
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'monospace', fontSize: 12, color: '#999' }}>
          복구 중... ({this.state.retryCount + 1}/5)
        </div>
      );
    }
    return React.createElement('div', { key: this.state.resetKey, style: { height: '100%' } }, this.props.children);
  }
}
