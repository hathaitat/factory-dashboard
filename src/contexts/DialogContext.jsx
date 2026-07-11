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
                    <div className={`bg-white/95 backdrop-blur-xl rounded-2xl w-[90%] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 overflow-hidden animate-[slideUp_0.3s_ease-out] max-h-[90vh] flex flex-col ${
                        (dialogState.type === 'help' && dialogState.videoUrl) ? 'max-w-[720px]' : 'max-w-[420px]'
                    }`}>
                        
                        {/* Body */}
                        <div className="p-8 flex flex-col items-center text-center overflow-y-auto flex-1">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
                                dialogState.type === 'error' ? 'bg-red-100 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' :
                                dialogState.type === 'help' ? 'bg-indigo-100 text-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' :
                                dialogState.type === 'confirm' ? 'bg-amber-100 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-blue-100 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                            }`}>
                                {dialogState.type === 'error' ? <XCircle size={32} />
                                    : dialogState.type === 'help' ? <HelpCircle size={32} />
                                        : dialogState.type === 'confirm' ? <AlertCircle size={32} />
                                            : <Info size={32} />}
                            </div>
                            
                            <h3 className="m-0 text-xl font-bold text-slate-800 mb-3">{dialogState.title}</h3>
                            
                            <div className="text-slate-500 text-[0.95rem] leading-[1.6] whitespace-pre-line w-full">
                                {dialogState.type === 'error' ? (
                                    <>
                                        <div className="bg-red-50 border border-red-100 rounded-lg py-3 px-4 mb-4 font-mono text-[0.85rem] text-red-600 break-all text-left">
                                            {dialogState.message}
                                        </div>
                                        <div className="text-slate-400 text-[0.9rem]">
                                            หากปัญหายังไม่หายไป กรุณาติดต่อผู้ดูแลระบบ (Admin)
                                        </div>
                                    </>
                                ) : dialogState.type === 'help' ? (
                                    <div className="text-left">
                                        {dialogState.videoUrl && (
                                            <div className="mb-4 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shadow-inner">
                                                <img
                                                    src={dialogState.videoUrl}
                                                    alt="Tutorial Video"
                                                    className="w-full block max-h-[400px] object-contain"
                                                />
                                            </div>
                                        )}
                                        <div className="leading-[1.8] text-slate-600">
                                            {dialogState.message}
                                        </div>
                                    </div>
                                ) : (
                                    dialogState.message
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 pt-0 flex justify-center gap-3">
                            {dialogState.type === 'confirm' && (
                                <button
                                    onClick={() => handleClose(false)}
                                    className="py-2.5 px-6 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm flex-1 max-w-[140px]"
                                >
                                    ยกเลิก
                                </button>
                            )}
                            <button
                                onClick={() => handleClose(true)}
                                className={`py-2.5 px-6 rounded-xl border-none text-white font-medium flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-1 max-w-[140px] ${
                                    dialogState.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                    dialogState.type === 'help' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' :
                                    dialogState.type === 'confirm' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                }`}
                            >
                                <CheckCircle size={18} /> {dialogState.type === 'confirm' ? 'ยืนยัน' : dialogState.type === 'error' ? 'ปิด' : 'ตกลง'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast.isOpen && (
                <div className="fixed top-5 right-5 z-[10000] animate-[slideInRight_0.3s_ease-out] max-w-[350px]">
                    <div className={`py-4 px-[1.2rem] text-white rounded-xl shadow-2xl border border-white/20 backdrop-blur-md flex items-start gap-3 ${
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
