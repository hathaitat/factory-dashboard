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
            style={{
                width: '80px',
                padding: '4px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                textAlign: 'center',
                color: isOverridden ? '#059669' : '#4b5563',
                fontWeight: isOverridden ? 'bold' : 'normal',
                background: isOverridden ? '#ecfdf5' : 'white',
                ...style
            }}
        />
    );
};

export default DiligenceInput;
