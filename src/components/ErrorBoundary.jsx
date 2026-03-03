import React from 'react';
import { XCircle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
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

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 99999,
                    backdropFilter: 'blur(6px)'
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '480px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1.5rem',
                            background: 'rgba(239, 68, 68, 0.08)',
                            borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
                            display: 'flex', alignItems: 'center', gap: '0.6rem'
                        }}>
                            <XCircle size={24} color="#ef4444" />
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#111' }}>
                                ❌ เกิดข้อผิดพลาดร้ายแรง
                            </h2>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.12)',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '1rem',
                                fontFamily: 'monospace',
                                fontSize: '0.82rem',
                                color: '#dc2626',
                                maxHeight: '120px',
                                overflowY: 'auto',
                                wordBreak: 'break-all'
                            }}>
                                {this.state.error?.message || 'Unknown error'}
                            </div>

                            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 0.5rem 0', lineHeight: '1.6' }}>
                                ระบบขัดข้อง กรุณาลองรีโหลดหน้าใหม่<br />
                                หากปัญหายังไม่หายไป <strong>กรุณาติดต่อผู้ดูแลระบบ (Admin)</strong>
                            </p>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex', gap: '0.8rem', justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    background: '#fff',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                                }}
                            >
                                <Home size={16} /> กลับหน้าหลัก
                            </button>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                                }}
                            >
                                <RefreshCw size={16} /> รีโหลดหน้า
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
