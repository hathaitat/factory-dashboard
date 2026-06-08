import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, HelpCircle, X } from 'lucide-react';
import { translateError } from '../utils/errorTranslator';

const DialogContext = createContext();

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
    const [toast, setToast] = useState({
        isOpen: false,
        message: '',
        title: '',
        type: 'info', // 'success' | 'error' | 'info'
        duration: 5000
    });

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
                message: translateError(message),
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
                message: translateError(errorMessage),
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

    const showToast = useCallback((message, typeOrDuration = 'info', title = '', duration = 3000) => {
        // Backwards-compatible: if second arg is a number, treat as duration (old API)
        let resolvedType = 'info';
        let resolvedTitle = title;
        let resolvedDuration = duration;
        if (typeof typeOrDuration === 'number') {
            resolvedDuration = typeOrDuration;
        } else if (typeof typeOrDuration === 'string') {
            resolvedType = typeOrDuration;
        }

        setToast({
            isOpen: true,
            message: translateError(message),
            type: resolvedType,
            title: resolvedTitle,
            duration: resolvedDuration
        });
        setTimeout(() => {
            setToast(prev => ({ ...prev, isOpen: false }));
        }, resolvedDuration);
    }, []);

    const handleClose = (result) => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        if (dialogState.resolveProps) {
            dialogState.resolveProps(result);
        }
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm, showError, showHelp, showToast }}>
            {children}
            {dialogState.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-[4px] animate-[fadeIn_0.2s_ease-out]">
                    <style>
                        {`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes fadeOut {
                            from { opacity: 1; }
                            to { opacity: 0; }
                        }
                        @keyframes slideUp {
                            from { opacity: 0; transform: translateY(20px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        @keyframes slideInRight {
                            from { opacity: 0; transform: translateX(100%); }
                            to { opacity: 1; transform: translateX(0); }
                        }
                        `}
                    </style>
                    <div className={`bg-main rounded-xl w-[90%] shadow-2xl border border-border overflow-hidden animate-[slideUp_0.3s_ease-out] max-h-[90vh] flex flex-col ${
                        (dialogState.type === 'help' && dialogState.videoUrl) ? 'max-w-[720px]' : 'max-w-[400px]'
                    }`}>
                        {/* Header */}
                        <div className={`p-[1.2rem] border-b border-border flex items-center gap-2 ${
                            dialogState.type === 'error' ? 'bg-[#ef4444]/[0.08]' :
                            dialogState.type === 'help' ? 'bg-[#6366f1]/[0.08]' :
                            dialogState.type === 'confirm' ? 'bg-[#f59e0b]/[0.05]' : 'bg-[#3b82f6]/[0.05]'
                        }`}>
                            {dialogState.type === 'error' ? <XCircle size={20} className="text-error" />
                                : dialogState.type === 'help' ? <HelpCircle size={20} className="text-[#6366f1]" />
                                    : dialogState.type === 'confirm' ? <AlertCircle size={20} className="text-warning" />
                                        : <Info size={20} className="text-[#3b82f6]" />}
                            <h3 className="m-0 text-[1.1rem] font-semibold text-textMain">{dialogState.title}</h3>
                        </div>
                        {/* Body */}
                        <div className="p-6 text-textMuted text-[0.95rem] leading-[1.5] whitespace-pre-line overflow-y-auto flex-1">
                            {dialogState.type === 'error' ? (
                                <>
                                    <div className="bg-[#ef4444]/[0.06] border border-[#ef4444]/[0.15] rounded-lg py-3 px-4 mb-4 font-mono text-[0.85rem] text-[#dc2626] break-all">
                                        {dialogState.message}
                                    </div>
                                    <div className="text-[#6b7280] text-[0.9rem]">
                                        หากปัญหายังไม่หายไป กรุณาติดต่อผู้ดูแลระบบ (Admin)
                                    </div>
                                </>
                            ) : dialogState.type === 'help' ? (
                                <div>
                                    {dialogState.videoUrl && (
                                        <div className="mb-4 rounded-lg overflow-hidden bg-[#f8f9fa] border border-[#e5e7eb]">
                                            <img
                                                src={dialogState.videoUrl}
                                                alt="Tutorial Video"
                                                className="w-full block max-h-[400px] object-contain"
                                            />
                                        </div>
                                    )}
                                    <div className="leading-[1.8]">
                                        {dialogState.message}
                                    </div>
                                </div>
                            ) : (
                                dialogState.message
                            )}
                        </div>
                        {/* Footer */}
                        <div className="py-4 px-6 border-t border-border flex justify-end gap-3 bg-[#f8fafc]">
                            {dialogState.type === 'confirm' && (
                                <button
                                    onClick={() => handleClose(false)}
                                    className="py-2 px-4 rounded-md border border-border bg-transparent text-textMuted cursor-pointer font-medium hover:bg-card-hover"
                                >
                                    ยกเลิก
                                </button>
                            )}
                            <button
                                onClick={() => handleClose(true)}
                                className={`py-2 px-4 rounded-md border-none text-white cursor-pointer font-medium flex items-center gap-1.5 hover:opacity-90 ${
                                    dialogState.type === 'error' ? 'bg-[#ef4444]' :
                                    dialogState.type === 'help' ? 'bg-[#6366f1]' :
                                    dialogState.type === 'confirm' ? 'bg-[#f59e0b]' : 'bg-[#3b82f6]'
                                }`}
                            >
                                <CheckCircle size={16} /> {dialogState.type === 'confirm' ? 'ยืนยัน' : dialogState.type === 'error' ? 'ปิด' : 'ตกลง'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast.isOpen && (
                <div className="fixed top-5 right-5 z-[10000] animate-[slideInRight_0.3s_ease-out] max-w-[350px]">
                    <div className={`glass-panel py-4 px-[1.2rem] text-white rounded-xl shadow-2xl border border-white/20 backdrop-blur-md flex items-start gap-3 ${
                        toast.type === 'success' ? 'bg-[#10b981]/95' :
                        toast.type === 'error' ? 'bg-[#ef4444]/95' : 'bg-[#3b82f6]/95'
                    }`}>
                        <div className="mt-[2px]">
                            {toast.type === 'success' ? <CheckCircle size={20} />
                                : toast.type === 'error' ? <XCircle size={20} />
                                : <Info size={20} />}
                        </div>
                        <div className="flex-1">
                            {toast.title && <div className="text-[0.85rem] opacity-80 mb-[2px] font-medium">{toast.title}</div>}
                            <div className="text-[0.95rem] leading-[1.4] font-medium">{toast.message}</div>
                        </div>
                        <button
                            onClick={() => setToast(prev => ({ ...prev, isOpen: false }))}
                            className="bg-transparent border-none text-white opacity-70 cursor-pointer p-0.5 hover:opacity-100"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};
