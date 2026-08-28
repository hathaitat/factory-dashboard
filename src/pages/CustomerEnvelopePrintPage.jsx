import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { customerService } from '../services/customerService';
import { companyService } from '../services/companyService';

const ENVELOPE_SIZES = {
    'standard': { id: 'standard', name: 'ซองมาตรฐาน (235x108mm)', width: '235mm', height: '108mm', padding: '10mm 15mm' },
    'doc_a4_landscape': { id: 'doc_a4_landscape', name: 'ซองเอกสาร A4 แนวนอน (297x210mm)', width: '297mm', height: '210mm', padding: '20mm 25mm' }
};

const CustomerEnvelopePrintPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [envelopeSize, setEnvelopeSize] = useState('standard');

    const selectedSize = ENVELOPE_SIZES[envelopeSize];

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [customerData, companyData] = await Promise.all([
                customerService.getCustomerById(id),
                companyService.getCompanyInfo()
            ]);
            setCustomer(customerData);
            setCompany(companyData);
        } catch (error) {
            console.error('Error loading data for envelope:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-textMuted">กำลังเตรียมหน้าพิมพ์...</div>;
    if (!customer) return <div className="p-8 text-center text-error">ไม่พบข้อมูลลูกค้า</div>;

    return (
        <div className="bg-body min-h-screen pb-12 print-bg-white">
            {/* Non-printable controls */}
            <div className="max-w-[210mm] mx-auto pt-8 pb-4 px-4 flex justify-between items-center hide-on-print">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 bg-transparent border-none text-textMuted hover:text-textMain cursor-pointer"
                >
                    <ArrowLeft size={20} /> ย้อนกลับ
                </button>
                <div className="flex items-center gap-4">
                    <select 
                        className="glass-input text-sm p-2 rounded-lg border-slate-300 font-medium bg-white"
                        value={envelopeSize}
                        onChange={(e) => setEnvelopeSize(e.target.value)}
                    >
                        {Object.values(ENVELOPE_SIZES).map(size => (
                            <option key={size.id} value={size.id}>{size.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-colors shadow-sm"
                    >
                        <Printer size={20} /> พิมพ์ใบปะหน้า
                    </button>
                </div>
            </div>

            {/* Printable Envelope Page */}
            <div className={`print-page bg-white shadow-lg mx-auto relative text-black ${envelopeSize === 'doc_a4_landscape' ? 'text-[14pt] font-semibold' : 'text-[10pt] font-normal'}`} style={{
                width: selectedSize.width,
                height: selectedSize.height,
                padding: selectedSize.padding,
                boxSizing: 'border-box'
            }}>
                <div className="w-full h-full relative flex flex-col justify-between">
                    
                    {/* Top Left: Sender Info */}
                    <div className={`${envelopeSize === 'doc_a4_landscape' ? 'w-[120mm] p-4' : 'w-[85mm] p-2'} leading-snug rounded-2xl`} style={{ border: envelopeSize === 'doc_a4_landscape' ? '2px solid black' : '1px solid black' }}>
                        <div className="mb-2">
                            <div className={`mb-1 ${envelopeSize === 'doc_a4_landscape' ? 'font-bold' : 'font-semibold'}`}>ผู้ส่ง / Sender</div>
                            <div className={envelopeSize === 'doc_a4_landscape' ? 'font-semibold' : 'font-medium'}>{company?.name || 'บริษัท...'}</div>
                        </div>
                        <div className="whitespace-pre-wrap mt-1">
                            {company?.address || 'ที่อยู่บริษัท...'}
                        </div>
                        {company?.phone && (
                            <div className="mt-2">
                                โทร: {company.phone}
                            </div>
                        )}
                    </div>

                    {/* Bottom Area containing Receiver & Notes */}
                    <div className="flex justify-between items-end w-full gap-4">
                        
                        {/* Bottom Left: Notes Area */}
                        <div>
                            <div className={`${envelopeSize === 'doc_a4_landscape' ? 'w-[80mm] p-3' : 'w-[60mm] p-2'} rounded-xl`} style={{ border: envelopeSize === 'doc_a4_landscape' ? '2px dashed #9ca3af' : '1px dashed #9ca3af' }}>
                                <div className={`mb-1 ${envelopeSize === 'doc_a4_landscape' ? 'font-semibold' : 'font-medium'}`}>หมายเหตุ:</div>
                                <div className="border-b border-gray-300 h-5 w-full mt-2 mb-1"></div>
                            </div>
                        </div>

                        {/* Bottom Right: Receiver Info */}
                        <div className={`${envelopeSize === 'doc_a4_landscape' ? 'w-[140mm] p-5' : 'w-[105mm] p-3'} leading-snug text-left rounded-2xl`} style={{ border: envelopeSize === 'doc_a4_landscape' ? '2px solid black' : '1px solid black' }}>
                            <div className={`${envelopeSize === 'doc_a4_landscape' ? 'mb-3 text-lg font-bold' : 'mb-2 text-base font-semibold'}`}>กรุณาส่ง / To:</div>
                            
                            {(customer.billingAttention || customer.contactPerson) && (
                                <div className="mt-2">เรียน: {customer.billingAttention || customer.contactPerson}</div>
                            )}
                            
                            <div className={`${(customer.billingAttention || customer.contactPerson) ? "mt-1" : "mt-2"} ${envelopeSize === 'doc_a4_landscape' ? 'font-semibold' : 'font-medium'}`}>{customer.name}</div>
                            
                            <div className="whitespace-pre-wrap mt-2 leading-snug">
                                {customer.billingAddress || customer.address || 'ที่อยู่...'}
                            </div>

                            {(customer.billingPhone || customer.phone) && (
                                <div className="mt-2">
                                    โทร: {customer.billingPhone || customer.phone}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                @media print {
                    @page {
                        size: ${selectedSize.width} ${selectedSize.height};
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
                }
            `}</style>
        </div>
    );
};

export default CustomerEnvelopePrintPage;
