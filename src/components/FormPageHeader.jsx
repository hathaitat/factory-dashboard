import React from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * FormPageHeader - Shared component for form pages (Create/Edit)
 * Displays a back button, title, and actions (status select, save button).
 */
const FormPageHeader = ({ 
    title, 
    backUrl, 
    onSave, 
    isSaving, 
    saveText = 'บันทึกเอกสาร',
    status, 
    onStatusChange, 
    statusOptions = [],
    showStatus = false,
    children 
}) => {
    const navigate = useNavigate();

    return (
        <div className="px-4">
            <button
                type="button"
                onClick={() => navigate(backUrl)}
                className="flex items-center gap-2 bg-transparent border-none text-textMuted cursor-pointer mb-6 text-[0.9rem]"
            >
                <ArrowLeft size={18} /> ย้อนกลับ
            </button>

            <div className="flex justify-between items-center mb-8">
                <h1 className="m-0 text-[1.8rem] font-semibold text-textMain">
                    {title}
                </h1>
                
                <div className="flex gap-4 items-center">
                    {showStatus && statusOptions.length > 0 && (
                        <select
                            value={status}
                            onChange={(e) => onStatusChange(e.target.value)}
                            className="glass-input py-[0.6rem] px-4 bg-main rounded-lg text-textMain border border-border"
                        >
                            {statusOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    )}
                    
                    {children}

                    <button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                        className={`py-[0.6rem] px-6 bg-blue-500 text-white border-none rounded-lg font-semibold flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(59,130,246,0.3)] ${isSaving ? 'opacity-70' : 'opacity-100'}`}
                    >
                        <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : saveText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FormPageHeader;
