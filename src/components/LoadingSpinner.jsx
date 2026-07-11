import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 24, className = "text-primary" }) => {
    return (
        <div className="flex justify-center items-center p-8">
            <Loader2 size={size} className={`animate-spin ${className}`} />
            <span className="ml-2 text-textMuted">กำลังโหลดข้อมูล...</span>
        </div>
    );
};

export default LoadingSpinner;
