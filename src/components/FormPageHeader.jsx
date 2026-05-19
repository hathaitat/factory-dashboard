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
        <div style={{ padding: '0 1rem 0 1rem' }}>
            <button
                type="button"
                onClick={() => navigate(backUrl)}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-muted)', 
                    cursor: 'pointer', 
                    marginBottom: '1.5rem', 
                    fontSize: '0.9rem' 
                }}
            >
                <ArrowLeft size={18} /> ย้อนกลับ
            </button>

            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '2rem' 
            }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600', color: 'var(--text-main)' }}>
                    {title}
                </h1>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {showStatus && statusOptions.length > 0 && (
                        <select
                            value={status}
                            onChange={(e) => onStatusChange(e.target.value)}
                            className="glass-input"
                            style={{ 
                                padding: '0.6rem 1rem', 
                                background: 'var(--bg-main)', 
                                borderRadius: '8px', 
                                color: 'var(--text-main)', 
                                border: '1px solid var(--border-color)' 
                            }}
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
                        style={{ 
                            padding: '0.6rem 1.5rem', 
                            background: '#3b82f6', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            fontWeight: '600', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            cursor: 'pointer', 
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                            opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : saveText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FormPageHeader;
