import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 12, background: '#1e1e1e', color: '#ff6b6b', minHeight: '100vh', overflow: 'auto' }}>
          <h2 style={{ color: '#ffd93d' }}>⚠️ sandroad error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#ff6b6b', marginBottom: 10 }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#aaa', fontSize: 10 }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <button onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
            style={{ marginTop: 16, padding: '8px 16px', background: '#ffd93d', color: '#000', border: 'none', borderRadius: 6, fontWeight: 'bold' }}>
            에디터로 돌아가기
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
