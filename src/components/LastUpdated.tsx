import React from 'react';
import { User } from 'lucide-react';

interface LastUpdatedProps {
    updatedBy?: string;
    updatedAt?: string | Date | null;
}

export const LastUpdated: React.FC<LastUpdatedProps> = ({ updatedBy, updatedAt }) => {
    if (!updatedBy && !updatedAt) return null;

    const formatDateTime = (dateString?: string | Date | null) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const dateStr = date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        const timeStr = date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `${dateStr} เวลา ${timeStr} น.`;
    };

    const formattedTime = formatDateTime(updatedAt);

    return (
        <div className="flex items-center gap-2">
            <User size={14} />
            <span>
                แก้ไขล่าสุดโดย:{' '}
                <span className="text-textMain font-semibold">
                    {updatedBy || 'ไม่ระบุ'}
                </span>
                {formattedTime && (
                    <span className="text-textMuted ml-[0.4rem]">
                        (เมื่อ {formattedTime})
                    </span>
                )}
            </span>
        </div>
    );
};

export default LastUpdated;
