import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-8">
          <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-bold text-red-900 mb-2">오류가 발생했습니다</h2>
            <pre className="text-xs text-red-700 whitespace-pre-wrap">{String(this.state.error)}</pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
