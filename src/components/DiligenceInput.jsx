import React from 'react';

const DiligenceInput = ({ value, isOverridden, onCommit, style = {} }) => {
    const [localValue, setLocalValue] = React.useState(value);

    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
        const val = localValue;
        const isForced = (val === '' || val === null || val === undefined) ? null : true;
        const amount = (val === '' || val === null || val === undefined) ? null : Number(val);
        onCommit(isForced, amount);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };

    return (
        <input
            type="number"
            value={localValue === null || localValue === undefined ? '' : localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={`w-[80px] p-1 rounded border border-[#d1d5db] text-center ${
                isOverridden ? 'text-[#059669] font-bold bg-[#ecfdf5]' : 'text-[#4b5563] font-normal bg-white'
            }`}
            style={style}
        />
    );
};

export default DiligenceInput;
