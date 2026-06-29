import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Users, Building, FileText, ArrowRightLeft } from 'lucide-react';
import { companyService } from '../services/companyService';
import { customerService } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { useDialog } from '../contexts/DialogContext';

const EnvelopePrintToolPage = () => {
    const navigate = useNavigate();
    const { showError } = useDialog();

    const [isLoading, setIsLoading] = useState(false);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [searchType, setSearchType] = useState('none'); // 'customer' or 'supplier'

    // Editable Sender State
    const [sender, setSender] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        taxId: ''
    });

    // Editable Receiver State
    const [receiver, setReceiver] = useState({
        name: '',
        attention: '',
        address: '',
        phone: ''
    });

    // Notes State
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const companyData = await companyService.getCompanyInfo();
            setCompanyInfo(companyData);
            if (companyData) {
                setSender({
                    name: companyData.name || '',
                    address: companyData.address || '',
                    phone: companyData.phone || '',
                    email: companyData.email || '',
                    taxId: companyData.taxId || ''
                });
            }
        } catch (error) {
            console.error('Error loading company data:', error);
            showError('ไม่สามารถโหลดข้อมูลบริษัทได้');
        }
    };

    const loadCustomers = async () => {
        if (customers.length > 0) return;
        setIsLoading(true);
        try {
            const data = await customerService.getCustomers();
            setCustomers(data);
        } catch (error) {
            showError('ไม่สามารถโหลดข้อมูลลูกค้าได้');
        } finally {
            setIsLoading(false);
        }
    };

    const loadSuppliers = async () => {
        if (suppliers.length > 0) return;
        setIsLoading(true);
        try {
            const data = await supplierService.getSuppliers();
            setSuppliers(data);
        } catch (error) {
            showError('ไม่สามารถโหลดข้อมูลผู้ขายได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchTypeChange = (e) => {
        const type = e.target.value;
        setSearchType(type);
        if (type === 'customer') loadCustomers();
        if (type === 'supplier') loadSuppliers();
    };

    const handleSelectContact = (e) => {
        const id = e.target.value;
        if (!id) return;

        let contact = null;
        if (searchType === 'customer') {
            contact = customers.find(c => String(c.id) === String(id));
        } else if (searchType === 'supplier') {
            contact = suppliers.find(s => String(s.id) === String(id));
        }

        if (contact) {
            setReceiver({
                name: contact.name || '',
                attention: contact.billingAttention || contact.contactPerson || '',
                address: contact.billingAddress || contact.address || '',
                phone: contact.billingPhone || contact.phone || ''
            });
        }
    };

    const handleSwap = () => {
        const currentSender = { ...sender };
        const currentReceiver = { ...receiver };
        
        setSender({
            name: currentReceiver.name || '',
            address: currentReceiver.address || '',
            phone: currentReceiver.phone || '',
            email: currentSender.email, // keep email
            taxId: currentSender.taxId // keep taxId as it is for company usually
        });

        setReceiver({
            name: currentSender.name || '',
            attention: '',
            address: currentSender.address || '',
            phone: currentSender.phone || ''
        });
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="content-container pb-12 print-bg-white relative">
            {/* --- NON-PRINTABLE AREA --- */}
            <div className="hide-on-print">
                <div className="page-header glass-panel flex justify-between items-center mb-6 p-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="btn-secondary rounded-full p-2">
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-textMain m-0">เครื่องมือพิมพ์ใบปะหน้าซอง</h2>
                            <span className="text-textMuted">กรอกข้อมูลผู้ส่งและผู้รับเพื่อพิมพ์ลงบนซองจดหมาย</span>
                        </div>
                    </div>
                    <button onClick={handlePrint} className="btn-primary flex items-center gap-2 px-6 py-2.5">
                        <Printer size={18} /> พิมพ์ใบปะหน้าซอง
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 relative">
                    
                    {/* Swap Button (Desktop Center) */}
                    <div className="hidden lg:flex absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-10">
                        <button type="button" onClick={handleSwap} className="btn-secondary rounded-full p-3 shadow-lg bg-white border border-border text-primary hover:bg-cardHover transition-colors" title="สลับผู้ส่งและผู้รับ">
                            <ArrowRightLeft size={24} />
                        </button>
                    </div>

                    {/* Sender Form */}
                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                            <Building size={20} className="text-blue-500" />
                            <h3 className="text-lg font-bold">ข้อมูลผู้ส่ง (Sender)</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-textMuted mb-1">ชื่อผู้ส่ง / บริษัท</label>
                                <input type="text" className="glass-input w-full p-2.5 rounded-lg" value={sender.name} onChange={(e) => setSender({ ...sender, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm text-textMuted mb-1">ที่อยู่</label>
                                <textarea className="glass-input w-full p-2.5 rounded-lg h-24 resize-none" value={sender.address} onChange={(e) => setSender({ ...sender, address: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-textMuted mb-1">เบอร์โทร</label>
                                    <input type="text" className="glass-input w-full p-2.5 rounded-lg" value={sender.phone} onChange={(e) => setSender({ ...sender, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm text-textMuted mb-1">เลขประจำตัวผู้เสียภาษี</label>
                                    <input type="text" className="glass-input w-full p-2.5 rounded-lg" value={sender.taxId} onChange={(e) => setSender({ ...sender, taxId: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Receiver Form */}
                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Users size={20} className="text-primary" />
                                <h3 className="text-lg font-bold">ข้อมูลผู้รับ (Receiver)</h3>
                            </div>
                            
                            {/* Swap Button (Mobile) */}
                            <button type="button" onClick={handleSwap} className="lg:hidden p-2 rounded bg-cardHover border border-border text-primary flex items-center justify-center" title="สลับผู้ส่งและผู้รับ">
                                <ArrowRightLeft size={18} />
                            </button>
                            <div className="flex gap-2">
                                <select className="glass-input text-sm p-1.5 rounded-md border-primary/30" value={searchType} onChange={handleSearchTypeChange}>
                                    <option value="none">-- กรอกข้อมูลเอง --</option>
                                    <option value="customer">ดึงจากลูกค้า</option>
                                    <option value="supplier">ดึงจากผู้ขาย</option>
                                </select>
                                {searchType !== 'none' && (
                                    <select className="glass-input text-sm p-1.5 rounded-md w-48" onChange={handleSelectContact} defaultValue="">
                                        <option value="" disabled>เลือก{searchType === 'customer' ? 'ลูกค้า' : 'ผู้ขาย'}...</option>
                                        {(searchType === 'customer' ? customers : suppliers).map(item => (
                                            <option key={item.id} value={item.id}>{item.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-textMuted mb-1">ชื่อผู้รับ / บริษัท</label>
                                <input type="text" className="glass-input w-full p-2.5 rounded-lg" value={receiver.name} onChange={(e) => setReceiver({ ...receiver, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm text-textMuted mb-1">เรียน (ผู้ติดต่อ)</label>
                                <input type="text" className="glass-input w-full p-2.5 rounded-lg" value={receiver.attention} onChange={(e) => setReceiver({ ...receiver, attention: e.target.value })} placeholder="เช่น ฝ่ายบัญชี, คุณสมชาย..." />
                            </div>
                            <div>
                                <label className="block text-sm text-textMuted mb-1">ที่อยู่ผู้รับ</label>
                                <textarea className="glass-input w-full p-2.5 rounded-lg h-24 resize-none" value={receiver.address} onChange={(e) => setReceiver({ ...receiver, address: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm text-textMuted mb-1">เบอร์โทร</label>
                                    <input type="text" className="glass-input w-full p-2.5 rounded-lg" value={receiver.phone} onChange={(e) => setReceiver({ ...receiver, phone: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes Input */}
                <div className="glass-panel p-6 rounded-xl mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText size={20} className="text-orange-500" />
                        <h3 className="text-lg font-bold">พิมพ์หมายเหตุ (มุมซ้ายล่าง)</h3>
                    </div>
                    <textarea 
                        className="glass-input w-full p-3 rounded-lg h-24 resize-none text-base" 
                        placeholder="เช่น: รบกวนเซ็นเอกสารแล้วส่งกลับบริษัทฯ ภายใน..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
                
                <div className="text-center text-textMuted mb-4">
                    --- ตัวอย่างเอกสารที่จะพิมพ์ (ขนาดซอง 235x108mm) ---
                </div>
            </div>

            {/* --- PRINTABLE A4 AREA --- */}
            <div className="print-page bg-white shadow-2xl mx-auto relative text-black text-[11pt] font-normal" style={{
                width: '235mm',
                height: '108mm',
                padding: '10mm 15mm',
                boxSizing: 'border-box'
            }}>
                <div className="w-full h-full relative flex flex-col justify-between">
                    
                    {/* Top Left: Sender Info */}
                    <div className="w-[85mm] leading-snug">
                        <div className="mb-2">
                            <div className="mb-1">ผู้ส่ง / Sender</div>
                            <div>{sender.name || 'บริษัท...'}</div>
                        </div>
                        <div className="whitespace-pre-wrap mt-1">
                            {sender.address || 'ที่อยู่บริษัท...'}
                        </div>
                        {sender.phone && (
                            <div className="mt-1">
                                โทร: {sender.phone}
                            </div>
                        )}
                    </div>

                    {/* Bottom Area containing Receiver & Notes */}
                    <div className="grid grid-cols-3 items-end w-full gap-4">
                        
                        {/* Bottom Left: Notes Area */}
                        <div className="col-span-2">
                            <div className="w-[70mm] border-2 border-dashed border-gray-300 rounded-xl p-2">
                                <div className="mb-1 font-semibold">หมายเหตุ:</div>
                                
                                {notes ? (
                                    <div className="whitespace-pre-wrap leading-snug">
                                        {notes}
                                    </div>
                                ) : (
                                    <div className="border-b border-gray-300 h-5 w-full mt-2 mb-1"></div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Right: Receiver Info */}
                        <div className="col-span-1 leading-snug text-left">
                            <div className="mb-1 border-b border-black inline-block pb-1">ผู้รับ / Receiver</div>
                            
                            {receiver.attention && (
                                <div className="mt-2">เรียน: {receiver.attention}</div>
                            )}
                            
                            <div className={receiver.attention ? "mt-1" : "mt-2"}>บริษัท: {receiver.name}</div>
                            
                            <div className="whitespace-pre-wrap mt-1 leading-snug">
                                ที่อยู่: {receiver.address || '-'}
                            </div>

                            {receiver.phone && (
                                <div className="mt-1">
                                    เบอร์โทร: {receiver.phone}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                @media print {
                    @page {
                        size: 235mm 108mm;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print-page, .print-page * {
                        visibility: visible;
                    }
                    .print-page {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        margin: 0 !important;
                        padding: 10mm 15mm !important;
                        box-shadow: none !important;
                        background-color: white !important;
                        z-index: 9999;
                    }
                    .hide-on-print {
                        display: none !important;
                    }
                    html, body {
                        background: white !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default EnvelopePrintToolPage;
