import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, Calendar, FileText, X } from 'lucide-react';
import { billingNoteService } from '../services/billingNoteService';
import { customerService } from '../services/customerService';
import { useDialog } from '../contexts/DialogContext';

const BillingNoteFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isEdit = !!id;
    const { showAlert } = useDialog();

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [availableInvoices, setAvailableInvoices] = useState([]);

    // Add states for customer search dropdown
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        billingNoteNo: '',
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        customerSnapshot: null,
        totalAmount: 0,
        status: 'Draft',
        notes: ''
    });

    // Selected invoices
    const [selectedInvoices, setSelectedInvoices] = useState([]);

    useEffect(() => {
        const handlePreselection = async () => {
            await loadInitialData();

            // Handle preselected invoice from navigation state
            if (!isEdit && location.state?.preselectInvoice) {
                const inv = location.state.preselectInvoice;
                setFormData(prev => ({
                    ...prev,
                    customerId: inv.customerId || inv.customer?.id || '',
                    customerSnapshot: inv.customerSnapshot || inv.customer || null
                }));

                const formattedInv = {
                    id: inv.id,
                    invoiceNo: inv.invoiceNo,
                    date: inv.date,
                    grandTotal: inv.grandTotal,
                    poNumber: inv.poNumber || inv.po?.po_number,
                    poStatus: inv.poStatus || inv.po?.status
                };
                setSelectedInvoices([formattedInv]);
            }

            // Handle preselected customer name from dashboard
            if (!isEdit && location.state?.preselectCustomerName) {
                const customerName = location.state.preselectCustomerName;
                // customers state might not be updated yet if we don't wait for loadInitialData
                // but loadInitialData sets the customers state.
                // Since we await loadInitialData (if we make it return something or just wait for its completion), 
                // we can then find the customer.
            }

            // Clear history state gently to avoid re-triggering on refresh
            if (location.state) {
                window.history.replaceState({}, document.title);
            }
        };

        handlePreselection();
    }, []);

    // Effect to handle preselectCustomerName once customers are loaded
    useEffect(() => {
        if (!isEdit && location.state?.preselectCustomerName && customers.length > 0) {
            const customer = customers.find(c => c.name === location.state.preselectCustomerName);
            if (customer) {
                setFormData(prev => ({
                    ...prev,
                    customerId: customer.id
                }));
            }
        }
    }, [customers, location.state, isEdit]);

    // Load available invoices when customer or date changes
    useEffect(() => {
        const targetId = formData.customerId || formData.customerSnapshot?.id;
        if (targetId && formData.date) {
            const dateObj = new Date(formData.date);
            loadAvailableInvoices(targetId, dateObj.getMonth() + 1, dateObj.getFullYear());
        } else {
            setAvailableInvoices([]);
        }
    }, [formData.customerId, formData.customerSnapshot, formData.date]);

    // Recalculate total when selected invoices change
    useEffect(() => {
        const total = selectedInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        setFormData(prev => ({ ...prev, totalAmount: Math.round((total + Number.EPSILON) * 100) / 100 }));
    }, [selectedInvoices]);

    // Sync search text when customerId changes (e.g. on edit load or clear)
    useEffect(() => {
        if (formData.customerId && customers.length > 0) {
            const selected = customers.find(c => String(c.id) === String(formData.customerId));
            if (selected) {
                setCustomerSearch(`${selected.name} (${selected.code})`);
            }
        } else if (!formData.customerId && formData.customerSnapshot) {
            setCustomerSearch(`${formData.customerSnapshot.name} (ลูกค้าที่ถูกลบ)`);
        } else if (!formData.customerId) {
            setCustomerSearch('');
        }
    }, [formData.customerId, customers, formData.customerSnapshot]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const customerData = await customerService.getCustomers();
            setCustomers(customerData || []);

            if (isEdit) {
                const bn = await billingNoteService.getBillingNoteById(id);
                if (bn) {
                    setFormData({
                        billingNoteNo: bn.billingNoteNo,
                        date: bn.date,
                        customerId: bn.customerId,
                        customerSnapshot: bn.customerSnapshot,
                        totalAmount: bn.totalAmount,
                        status: bn.status,
                        notes: bn.notes
                    });
                    setSelectedInvoices(bn.invoices || []);
                }
            } else {
                const nextNo = await billingNoteService.getNextBillingNoteNo();
                setFormData(prev => ({ ...prev, billingNoteNo: nextNo }));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAvailableInvoices = async (customerId, month, year) => {
        try {
            const data = await billingNoteService.getAvailableInvoices(customerId, month, year);
            // Filter out those already in selectedInvoices (for edit mode)
            const selectedIds = new Set(selectedInvoices.map(inv => inv.id));
            setAvailableInvoices(data.filter(inv => !selectedIds.has(inv.id)));
        } catch (error) {
            console.error('Error loading available invoices:', error);
        }
    };

    const handleAddInvoice = (inv) => {
        setSelectedInvoices([...selectedInvoices, inv]);
        setAvailableInvoices(availableInvoices.filter(i => i.id !== inv.id));
    };

    const handleRemoveInvoice = (invId) => {
        const removed = selectedInvoices.find(i => i.id === invId);
        setSelectedInvoices(selectedInvoices.filter(i => i.id !== invId));
        // Add back to available if it matches the current customer and month
        if (removed) {
            setAvailableInvoices([...availableInvoices, removed]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customerId && !formData.customerSnapshot) {
            await showAlert('กรุณาเลือกลูกค้า');
            return;
        }
        if (selectedInvoices.length === 0) {
            await showAlert('กรุณาเลือกอย่างน้อย 1 ใบกำกับภาษี');
            return;
        }

        setIsSaving(true);
        try {
            const invoiceIds = selectedInvoices.map(inv => inv.id);

            // Find selected customer object to save as snapshot
            const selectedCustomer = customers.find(c => String(c.id) === String(formData.customerId));
            const submissionData = {
                ...formData,
                customerId: selectedCustomer ? formData.customerId : null,
                customerSnapshot: selectedCustomer ? {
                    id: selectedCustomer.id,
                    code: selectedCustomer.code,
                    name: selectedCustomer.name,
                    taxId: selectedCustomer.taxId,
                    branch: selectedCustomer.branch,
                    phone: selectedCustomer.phone,
                    address: selectedCustomer.address
                } : formData.customerSnapshot
            };

            if (isEdit) {
                await billingNoteService.updateBillingNote(id, submissionData, invoiceIds);
            } else {
                await billingNoteService.createBillingNote(submissionData, invoiceIds);
            }
            navigate('/dashboard/billing-notes');
        } catch (error) {
            console.error('Save error:', error);
            // Check for duplicate key error (PostgreSQL code 23505)
            if (error.code === '23505' || (error.message && error.message.includes('duplicate key'))) {
                await showAlert(`เลขที่ใบวางบิล "${formData.billingNoteNo}" มีอยู่ในระบบแล้ว กรุณาเปลี่ยนเลขที่ใหม่`);
            } else {
                await showAlert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (error.message || 'Unknown error'));
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div style={{ padding: '2rem' }}>กำลังโหลด...</div>;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
            <button
                onClick={() => navigate('/dashboard/billing-notes')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '1.5rem' }}
            >
                <ArrowLeft size={20} /> ย้อนกลับ
            </button>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>
                        {isEdit ? 'แก้ไขใบวางบิล' : 'ออกใบวางบิลใหม่'}
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="glass-input"
                            style={{ padding: '0.6rem 1rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                        >
                            <option value="Draft">แบบร่าง (Draft)</option>
                            <option value="Sent">ส่งแล้ว (Sent)</option>
                            <option value="Paid">ชำระเงินแล้ว (Paid)</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{ padding: '0.6rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                        >
                            <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
                    <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>เลือกลูกค้า</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={customerSearch}
                                    onChange={e => {
                                        setCustomerSearch(e.target.value);
                                        setShowCustomerDropdown(true);
                                        if (!e.target.value) {
                                            setFormData({ ...formData, customerId: '', customerSnapshot: null, totalAmount: 0 });
                                            setSelectedInvoices([]);
                                            setAvailableInvoices([]);
                                        }
                                    }}
                                    onFocus={() => setShowCustomerDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                    placeholder="ค้นหาชื่อ หรือ รหัสลูกค้า..."
                                    className="glass-input"
                                    style={{ width: '100%', padding: '0.7rem', paddingRight: '2.5rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                />
                                {customerSearch && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomerSearch('');
                                            setFormData({ ...formData, customerId: '', customerSnapshot: null, totalAmount: 0 });
                                            setSelectedInvoices([]);
                                            setAvailableInvoices([]);
                                            setShowCustomerDropdown(false);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            background: 'none',
                                            border: 'none',
                                            color: '#888',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '2px',
                                            zIndex: 2
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            {showCustomerDropdown && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '250px', overflowY: 'auto', background: 'var(--card-hover)', zIndex: 50, border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    {customers.filter(c =>
                                        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                        c.code?.toLowerCase().includes(customerSearch.toLowerCase())
                                    ).map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => {
                                                if (formData.customerId !== c.id) {
                                                    setSelectedInvoices([]);
                                                    setFormData({ ...formData, customerId: c.id, customerSnapshot: null, totalAmount: 0 });
                                                } else {
                                                    setFormData({ ...formData, customerId: c.id });
                                                }
                                                setShowCustomerDropdown(false);
                                            }}
                                            style={{ padding: '0.7rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {c.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({c.code})</span>
                                        </div>
                                    ))}
                                    {customers.filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.code?.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                                        <div style={{ padding: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>ไม่พบลูกค้าที่ค้นหา</div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>เลขที่ใบวางบิล (Auto)</label>
                            <input
                                type="text"
                                value={formData.billingNoteNo}
                                onChange={e => setFormData({ ...formData, billingNoteNo: e.target.value })}
                                required
                                className="glass-input"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>วันที่</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                                className="glass-input"
                                style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Left side: Available invoices for the month */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(59, 130, 246, 0.05)' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6' }}>
                                <FileText size={18} /> ใบกำกับภาษีประจำเดือนนี้
                            </h3>
                        </div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem' }}>
                            {!formData.customerId ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>กรุณาเลือกลูกค้าเพื่อดูรายการบิล</div>
                            ) : availableInvoices.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>ไม่พบใบกำกับภาษีที่ยังไม่ได้วางบิลในเดือนนี้</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {availableInvoices.map(inv => (
                                        <div key={inv.id} className="glass-panel" style={{ padding: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {inv.invoiceNo}
                                                    {inv.poNumber && (
                                                        <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 'normal' }}>
                                                            PO: {inv.poNumber} {inv.poStatus === 'Completed' ? '(ครบ)' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.2rem' }}>วันที่: {new Date(inv.date).toLocaleDateString('th-TH')}</div>
                                                <div style={{ fontWeight: '500', color: 'var(--success)', marginTop: '0.2rem' }}>฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAddInvoice(inv)}
                                                style={{ padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                                            >
                                                เพิ่มรายการ
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right side: Selected invoices */}
                    <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(16, 185, 129, 0.05)' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                                <Calendar size={18} /> รายการที่เลือก ({selectedInvoices.length})
                            </h3>
                        </div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--card-hover)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#888' }}>เลขที่บิล</th>
                                        <th style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#888' }}>วันที่</th>
                                        <th style={{ padding: '0.8rem 1rem', fontSize: '0.85rem', color: '#888', textAlign: 'right' }}>จำนวนเงิน</th>
                                        <th style={{ padding: '0.8rem', width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedInvoices.map(inv => (
                                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.8rem 1rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                                {inv.invoiceNo}
                                                {inv.poNumber && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.2rem' }}>PO: {inv.poNumber} {inv.poStatus === 'Completed' ? '(ครบ)' : ''}</div>}
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', color: '#888', fontSize: '0.85rem' }}>{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: '500', color: 'var(--success)' }}>฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '0.8rem' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveInvoice(inv.id)}
                                                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {selectedInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>ยังไม่พบรายการที่เลือก</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
</div>
                        </div>
                        <div style={{ padding: '1.2rem 1.5rem', borderTop: '2px solid var(--border-color)', background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600', color: '#888' }}>รวมทั้งสิ้น</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>฿{formData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.9rem' }}>หมายเหตุ</label>
                    <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        rows="3"
                        className="glass-input"
                        placeholder="ระบุข้อความแสดงในใบวางบิล..."
                        style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-main)', borderRadius: '8px', color: 'var(--text-main)', border: '1px solid var(--border-color)', resize: 'none' }}
                    />
                </div>
            </form>
        </div>
    );
};

export default BillingNoteFormPage;
