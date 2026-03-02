
const testFix = () => {
    // Mimic the data return from Supabase (snake_case)
    const mockSupabaseResponse = [
        { id: 1, label: 'Jan 2026', start_date: '2026-01-01', end_date: '2026-01-31' }
    ];

    // Fixed logic: Map to camelCase
    const periods = mockSupabaseResponse.map(p => ({
        ...p,
        startDate: p.start_date,
        endDate: p.end_date
    }));

    const selectedPeriod = periods[0];

    console.log('Selected Period:', selectedPeriod);

    // The previously problematic check
    const periodDate = new Date(selectedPeriod.startDate);
    console.log('periodDate:', periodDate);

    // Check if valid
    if (isNaN(periodDate.getTime())) {
        console.log('FAIL: Date is still invalid.');
    } else {
        const periodMonth = periodDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });
        console.log(`PASS: Date is valid. Formatted: ${periodMonth}`);
    }
};

testFix();
