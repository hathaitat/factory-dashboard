export const getDeptColorClass = (index) => {
    const colors = [
        'bg-blue-100 border-blue-300 hover:border-blue-400',
        'bg-purple-100 border-purple-300 hover:border-purple-400',
        'bg-emerald-100 border-emerald-300 hover:border-emerald-400',
        'bg-amber-100 border-amber-300 hover:border-amber-400',
        'bg-rose-100 border-rose-300 hover:border-rose-400',
        'bg-cyan-100 border-cyan-300 hover:border-cyan-400',
    ];
    return colors[index % colors.length];
};
