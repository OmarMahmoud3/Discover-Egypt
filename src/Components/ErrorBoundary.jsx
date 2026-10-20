import { Component } from 'react';

/**
 * ErrorBoundary protects the application from completely unmounting into
 * a blank screen whenever an unhandled runtime error occurs.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--surface, #F7F5EF)',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              backgroundColor: '#FFFFFF',
              padding: '32px 24px',
              borderRadius: '12px',
              border: '1px solid #E5DDCA',
              boxShadow: '0 4px 16px rgba(18, 48, 74, 0.08)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#FEF2F2',
                color: '#B91C1C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
              }}
            >
              ⚠️
            </div>
            <h2 style={{ fontSize: '20px', color: '#12304A', marginBottom: '8px', fontWeight: 800 }}>
              حدث خطأ غير متوقع / An unexpected error occurred
            </h2>
            <p style={{ fontSize: '14px', color: '#4B5E70', marginBottom: '20px', lineHeight: 1.6 }}>
              نعتذر عن هذا الخطأ المؤقت. تم تسجيل المشكلة ويمكنك إعادة تحميل الصفحة للمتابعة.
            </p>
            {this.state.error && (
              <div style={{ textAlign: 'left', background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '8px', padding: '12px', margin: '16px 0', fontSize: '13px', color: '#991B1B', wordBreak: 'break-word', whiteSpace: 'pre-wrap', direction: 'ltr' }}>
                <strong>Error: </strong>{this.state.error.message || String(this.state.error)}
                {this.state.error.stack && (
                  <pre style={{ marginTop: '8px', fontSize: '11px', maxHeight: '180px', overflowY: 'auto' }}>
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
            <button
              onClick={this.handleReload}
              style={{
                backgroundColor: '#0F766E',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              إعادة تحميل الصفحة / Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
