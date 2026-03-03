import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, HelpCircle } from 'lucide-react';

const DialogContext = createContext();

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        type: 'alert', // 'alert' | 'confirm' | 'error' | 'help'
        title: '',
        message: '',
        videoUrl: null,
        resolveProps: null
    });

    const showAlert = useCallback((message, title = 'แจ้งเตือน') => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                type: 'alert',
                title,
                message,
                resolveProps: resolve
            });
        });
    }, []);

    const showConfirm = useCallback((message, title = 'ยืนยันการทำรายการ') => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                type: 'confirm',
                title,
                message,
                resolveProps: resolve
            });
        });
    }, []);

    const showError = useCallback((errorMessage, title = '❌ เกิดข้อผิดพลาด') => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                type: 'error',
                title,
                message: errorMessage,
                resolveProps: resolve
            });
        });
    }, []);

    const showHelp = useCallback((helpContent, title = '❓ วิธีใช้งาน', videoUrl = null) => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                type: 'help',
                title,
                message: helpContent,
                videoUrl,
                resolveProps: resolve
            });
        });
    }, []);

    const handleClose = (result) => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        if (dialogState.resolveProps) {
            dialogState.resolveProps(result);
        }
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm, showError, showHelp }}>
            {children}
            {dialogState.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <style>
                        {`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes slideUp {
                            from { opacity: 0; transform: translateY(20px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        `}
                    </style>
                    <div style={{
                        background: 'var(--bg-main, #ffffff)',
                        borderRadius: '12px',
                        width: '90%',
                        maxWidth: (dialogState.type === 'help' && dialogState.videoUrl) ? '720px' : '400px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        overflow: 'hidden',
                        animation: 'slideUp 0.3s ease-out',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1.2rem',
                            borderBottom: '1px solid var(--border-color, #e5e7eb)',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: dialogState.type === 'error' ? 'rgba(239, 68, 68, 0.08)'
                                : dialogState.type === 'help' ? 'rgba(99, 102, 241, 0.08)'
                                    : dialogState.type === 'confirm' ? 'rgba(245, 158, 11, 0.05)'
                                        : 'rgba(59, 130, 246, 0.05)'
                        }}>
                            {dialogState.type === 'error' ? <XCircle size={20} color="#ef4444" />
                                : dialogState.type === 'help' ? <HelpCircle size={20} color="#6366f1" />
                                    : dialogState.type === 'confirm' ? <AlertCircle size={20} color="#f59e0b" />
                                        : <Info size={20} color="#3b82f6" />}
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main, #111)' }}>{dialogState.title}</h3>
                        </div>
                        {/* Body */}
                        <div style={{ padding: '1.5rem', color: 'var(--text-muted, #4b5563)', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-line', overflowY: 'auto', flex: 1 }}>
                            {dialogState.type === 'error' ? (
                                <>
                                    <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '0.8rem 1rem', marginBottom: '1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: '#dc2626', wordBreak: 'break-all' }}>
                                        {dialogState.message}
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                                        หากปัญหายังไม่หายไป กรุณาติดต่อผู้ดูแลระบบ (Admin)
                                    </div>
                                </>
                            ) : dialogState.type === 'help' ? (
                                <div>
                                    {dialogState.videoUrl && (
                                        <div style={{ marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', background: '#f8f9fa', border: '1px solid #e5e7eb' }}>
                                            <img
                                                src={dialogState.videoUrl}
                                                alt="Tutorial Video"
                                                style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'contain' }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ lineHeight: '1.8' }}>
                                        {dialogState.message}
                                    </div>
                                </div>
                            ) : (
                                dialogState.message
                            )}
                        </div>
                        {/* Footer */}
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color, #e5e7eb)', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', background: 'var(--bg-main, #ffffff)' }}>
                            {dialogState.type === 'confirm' && (
                                <button
                                    onClick={() => handleClose(false)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color, #e5e7eb)',
                                        background: 'transparent',
                                        color: 'var(--text-muted, #4b5563)',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    ยกเลิก
                                </button>
                            )}
                            <button
                                onClick={() => handleClose(true)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: dialogState.type === 'error' ? '#ef4444'
                                        : dialogState.type === 'help' ? '#6366f1'
                                            : dialogState.type === 'confirm' ? '#f59e0b' : '#3b82f6',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                <CheckCircle size={16} /> {dialogState.type === 'confirm' ? 'ยืนยัน' : dialogState.type === 'error' ? 'ปิด' : 'ตกลง'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};
