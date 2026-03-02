
const testInvalidDate = () => {
    // Mimic the data return from Supabase (snake_case)
    const mockSupabaseResponse = [
        { id: 1, label: 'Jan 2026', start_date: '2026-01-01', end_date: '2026-01-31' }
    ];

    // Current logic in EmployeeListPage (expecting camelCase)
    const periods = mockSupabaseResponse;
    const selectedPeriod = periods[0];

    console.log('Selected Period:', selectedPeriod);

    // The problematic check
    const periodDate = new Date(selectedPeriod.startDate);
    console.log('periodDate:', periodDate);

    const periodMonth = periodDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });
    console.log('periodMonth String:', periodMonth);

    if (periodMonth === 'Invalid Date') {
        console.log('FAIL: "Invalid Date" detected.');
    } else {
        console.log('PASS: Date is valid.');
    }
};

testInvalidDate();
