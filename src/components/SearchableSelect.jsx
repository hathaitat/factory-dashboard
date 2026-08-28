import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

const SearchableSelect = ({ 
    options = [], 
    value, 
    onChange, 
    placeholder = 'ค้นหา...',
    disabled = false,
    className = '',
    menuPortalTarget = null // Not strictly needed, but good if we want to mount outside
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Find the currently selected option
    const selectedOption = options.find(opt => opt.value === value);

    // Sync search term with selected option when closed
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm(selectedOption ? selectedOption.label : '');
        }
    }, [isOpen, selectedOption]);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Filter options based on search term
    const filteredOptions = options.filter(opt => {
        const searchLower = searchTerm.toLowerCase();
        const labelMatch = opt.label?.toLowerCase().includes(searchLower);
        const subLabelMatch = opt.subLabel?.toLowerCase().includes(searchLower);
        return labelMatch || subLabelMatch;
    });

    const handleSelect = (opt) => {
        onChange(opt.value);
        setSearchTerm(opt.label);
        setIsOpen(false);
    };

    const clearSelection = (e) => {
        e.stopPropagation();
        onChange(null);
        setSearchTerm('');
        inputRef.current?.focus();
    };

    return (
        <div ref={wrapperRef} className={`relative w-full ${className}`}>
            <div className="relative flex items-center">
                <input
                    ref={inputRef}
                    type="text"
                    className="glass-input w-full p-3 rounded-lg pr-10"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    disabled={disabled}
                    style={{
                        borderColor: isOpen ? 'var(--primary)' : 'var(--border-color)',
                        boxShadow: isOpen ? '0 0 0 3px var(--primary-glow)' : 'none'
                    }}
                />
                
                <div className="absolute right-3 flex items-center gap-1 text-slate-400">
                    {!disabled && searchTerm && (
                        <button 
                            type="button"
                            onClick={clearSelection}
                            className="p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600 border-none bg-transparent"
                            title="ล้างค่า"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                </div>
            </div>

            {isOpen && !disabled && (
                <div 
                    className="absolute z-[9999] w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-[300px] overflow-y-auto"
                    style={{ top: '100%', left: 0 }}
                >
                    {filteredOptions.length > 0 ? (
                        <div className="p-1">
                            {filteredOptions.map((opt, index) => (
                                <div
                                    key={opt.value || index}
                                    onClick={() => handleSelect(opt)}
                                    className={`px-4 py-3 cursor-pointer rounded-lg transition-colors flex flex-col gap-1 ${
                                        value === opt.value 
                                            ? 'bg-primary/5 border border-primary/10' 
                                            : 'hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span className={`text-[0.95rem] ${value === opt.value ? 'text-primary font-semibold' : 'text-textMain font-medium'}`}>
                                        {opt.label}
                                    </span>
                                    {opt.subLabel && (
                                        <span className="text-[0.8rem] text-textMuted">
                                            {opt.subLabel}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-textMuted text-sm">
                            ไม่พบข้อมูลที่ค้นหา
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
