import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const DialogContext = createContext();

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        type: 'alert', // 'alert' | 'confirm'
        title: '',
        message: '',
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

    const handleClose = (result) => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        if (dialogState.resolveProps) {
            dialogState.resolveProps(result);
        }
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
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
                        maxWidth: '400px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-color, #e5e7eb)',
                        overflow: 'hidden',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border-color, #e5e7eb)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.05)' }}>
                            {dialogState.type === 'alert' ? <Info size={20} color="#3b82f6" /> : <AlertCircle size={20} color="#f59e0b" />}
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main, #111)' }}>{dialogState.title}</h3>
                        </div>
                        {/* Body */}
                        <div style={{ padding: '1.5rem', color: 'var(--text-muted, #4b5563)', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                            {dialogState.message}
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
                                    background: dialogState.type === 'confirm' ? '#f59e0b' : '#3b82f6',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                <CheckCircle size={16} /> {dialogState.type === 'confirm' ? 'ยืนยัน' : 'ตกลง'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};
