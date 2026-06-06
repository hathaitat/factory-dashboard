import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, Calendar, FileText, X } from 'lucide-react';
import { billingNoteService } from '../services/billingNoteService';
import { customerService } from '../services/customerService';
import { userService } from '../services/userService';
import { useDialog } from '../contexts/DialogContext';
import { getLocalDateString } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';

const BillingNoteFormPage = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isEdit = !!id;
    const { showAlert, showToast } = useDialog();

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
        date: getLocalDateString(),
        customerId: '',
        customerSnapshot: null,
        totalAmount: 0,
        status: 'Draft',
        notes: '',
        createdBy: '',
        updatedBy: ''
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
                        notes: bn.notes,
                        createdBy: bn.createdBy || '',
                        updatedBy: bn.updatedBy || ''
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
        
        // Only add back to available if it matches the current customer and month filter
        if (removed && formData.customerId) {
            const dateObj = new Date(formData.date);
            const invDate = new Date(removed.date);
            if (invDate.getMonth() === dateObj.getMonth() && invDate.getFullYear() === dateObj.getFullYear()) {
                setAvailableInvoices([...availableInvoices, removed]);
            }
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
            const currentUser = user;
            const operatorName = currentUser?.fullName || currentUser?.username || 'Unknown';
            const submissionData = {
                ...formData,
                createdBy: isEdit ? (formData.createdBy || operatorName) : operatorName,
                updatedBy: operatorName,
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
            
            // Check for customer remarks and show toast
            if (formData.customerId) {
                const customer = customers.find(c => String(c.id) === String(formData.customerId));
                if (customer) {
                    if (formData.status === 'Paid' && customer.receiptNote) {
                        showToast(customer.receiptNote, 5000);
                    } else if (customer.billingNoteNote) {
                        showToast(customer.billingNoteNote, 5000);
                    }
                }
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

    if (isLoading) return (
        <div className="flex justify-center items-center h-[60vh] flex-col gap-4 text-textMuted">
            <div className="loading-spinner"></div>
            <span>กำลังโหลดข้อมูล...</span>
        </div>
    );

    return (
        <div className="px-4 pb-8">
            <button
                onClick={() => navigate('/dashboard/billing-notes')}
                className="flex items-center gap-2 bg-transparent border-none text-textMuted cursor-pointer mb-6 text-[0.9rem] hover:opacity-80"
            >
                <ArrowLeft size={18} /> ย้อนกลับ
            </button>

            <form onSubmit={handleSubmit}>
                <div className="flex justify-between items-center mb-8">
                    <h1 className="m-0 text-[1.8rem] font-semibold text-textMain">
                        {isEdit ? 'แก้ไขใบวางบิล' : 'ออกใบวางบิลใหม่'}
                    </h1>
                    <div className="flex gap-4">
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className={`glass-input py-2.5 px-4 rounded-lg border border-border font-medium ${
                                formData.status === 'Paid' ? 'bg-[#10b981]/10 text-success' : 
                                formData.status === 'Cancelled' ? 'bg-[#ef4444]/10 text-error' : 'bg-main text-textMain'
                            }`}
                        >
                            <option value="Draft">แบบร่าง (Draft)</option>
                            <option value="Paid">ชำระเงินแล้ว (Paid)</option>
                            <option value="Cancelled">ยกเลิก (Cancelled)</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="py-2.5 px-6 bg-[#3b82f6] text-white border-none rounded-lg font-medium flex items-center gap-2 cursor-pointer hover:opacity-90"
                        >
                            <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </div>

                <div className="glass-panel p-8 mb-6">
                    <div className="grid grid-cols-3 gap-6 grid-mobile-stack">
                        <div className="relative">
                            <label className="block mb-2 text-textMuted text-[0.9rem]">เลือกลูกค้า</label>
                            <div className="relative flex items-center">
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
                                    className="glass-input w-full p-[0.7rem] pr-10 bg-main rounded-lg text-textMain border border-border"
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
                                        className="absolute right-3 bg-transparent border-none text-textMuted cursor-pointer flex items-center justify-center p-0.5 z-10"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            {showCustomerDropdown && (
                                <div className="absolute top-full left-0 right-0 max-h-[250px] overflow-y-auto bg-white z-50 border border-border rounded-lg mt-1 shadow-lg">
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
                                            className="p-[0.7rem] cursor-pointer border-b border-border text-textMain hover:bg-[#3b82f6]/10"
                                        >
                                            {c.name} <span className="text-textMuted text-[0.85rem]">({c.code})</span>
                                        </div>
                                    ))}
                                    {customers.filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.code?.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                                        <div className="p-[0.7rem] text-textMuted text-center">ไม่พบลูกค้าที่ค้นหา</div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block mb-2 text-textMuted text-[0.9rem]">เลขที่ใบวางบิล (Auto)</label>
                            <input
                                type="text"
                                value={formData.billingNoteNo}
                                onChange={e => setFormData({ ...formData, billingNoteNo: e.target.value })}
                                required
                                className="glass-input w-full p-[0.7rem] bg-main rounded-lg text-textMain border border-border"
                            />
                        </div>
                        <div>
                            <label className="block mb-2 text-textMuted text-[0.9rem]">วันที่</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                                className="glass-input w-full p-[0.7rem] bg-main rounded-lg text-textMain border border-border"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 grid-mobile-stack">
                    {/* Left side: Available invoices for the month */}
                    <div className="glass-panel p-0 overflow-hidden">
                        <div className="py-4 px-6 border-b border-border bg-[#3b82f6]/5">
                            <h3 className="m-0 text-base flex items-center gap-2 text-[#3b82f6]">
                                <FileText size={18} /> ใบกำกับภาษีประจำเดือนนี้
                            </h3>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto p-4">
                            {!formData.customerId ? (
                                <div className="text-center p-8 text-textMuted">กรุณาเลือกลูกค้าเพื่อดูรายการบิล</div>
                            ) : availableInvoices.length === 0 ? (
                                <div className="text-center p-8 text-textMuted">ไม่พบใบกำกับภาษีที่ยังไม่ได้วางบิลในเดือนนี้</div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {availableInvoices.map(inv => (
                                        <div key={inv.id} className="glass-panel p-3 flex justify-between items-center bg-card border border-border">
                                            <div>
                                                <div className="font-semibold text-textMain flex items-center gap-2">
                                                    {inv.invoiceNo}
                                                    {inv.poNumber && (
                                                        <span className="text-[0.75rem] py-0.5 px-1.5 bg-[#3b82f6]/10 text-[#37477C] rounded font-normal">
                                                            PO: {inv.poNumber} {inv.poStatus === 'Completed' ? '(ครบ)' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[0.85rem] text-textMuted mt-1">วันที่: {new Date(inv.date).toLocaleDateString('th-TH')}</div>
                                                <div className="font-medium text-success mt-1">฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAddInvoice(inv)}
                                                className="py-1.5 px-3 bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] rounded-md cursor-pointer text-[0.85rem] hover:bg-[#3b82f6]/20"
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
                    <div className="glass-panel p-0 overflow-hidden">
                        <div className="py-4 px-6 border-b border-border bg-[#10b981]/5">
                            <h3 className="m-0 text-base flex items-center gap-2 text-success">
                                <Calendar size={18} /> รายการที่เลือก ({selectedInvoices.length})
                            </h3>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            <div className="table-responsive-wrapper w-full overflow-x-auto [webkit-overflow-scrolling:touch]">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-card-hover text-left border-b border-border">
                                            <th className="py-3 px-4 text-[0.85rem] text-textMuted font-medium">เลขที่บิล</th>
                                            <th className="py-3 px-4 text-[0.85rem] text-textMuted font-medium">วันที่</th>
                                            <th className="py-3 px-4 text-[0.85rem] text-textMuted font-medium text-right">จำนวนเงิน</th>
                                            <th className="p-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedInvoices.map(inv => (
                                            <tr key={inv.id} className="border-b border-border">
                                                <td className="py-3 px-4 text-textMain text-[0.9rem]">
                                                    {inv.invoiceNo}
                                                    {inv.poNumber && <div className="text-[0.75rem] text-primary mt-1">PO: {inv.poNumber} {inv.poStatus === 'Completed' ? '(ครบ)' : ''}</div>}
                                                </td>
                                                <td className="py-3 px-4 text-[#888888] text-[0.85rem]">{new Date(inv.date).toLocaleDateString('th-TH')}</td>
                                                <td className="py-3 px-4 text-right font-medium text-success">฿{inv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td className="p-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveInvoice(inv.id)}
                                                        className="bg-transparent border-none text-error cursor-pointer p-0 hover:text-red-500"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {selectedInvoices.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="p-8 text-center text-textMuted">ยังไม่พบรายการที่เลือก</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="py-[1.2rem] px-[1.5rem] border-t-2 border-border bg-main flex justify-between items-center">
                            <span className="font-semibold text-textMuted">รวมทั้งสิ้น</span>
                            <span className="text-[1.5rem] font-bold text-success">฿{formData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 mt-6">
                    <label className="block mb-2 text-textMuted text-[0.9rem]">หมายเหตุ</label>
                    <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        rows="3"
                        className="glass-input w-full p-[0.7rem] bg-main rounded-lg text-textMain border border-border resize-none"
                        placeholder="ระบุข้อความแสดงในใบวางบิล..."
                    />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/billing-notes')}
                        className="py-[0.8rem] px-6 rounded-lg border border-border bg-transparent text-textMuted cursor-pointer hover:bg-card-hover"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="py-[0.8rem] px-6 bg-[#3b82f6] text-white border-none rounded-lg font-medium flex items-center gap-2 cursor-pointer hover:opacity-90"
                    >
                        <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BillingNoteFormPage;
