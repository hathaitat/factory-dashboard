import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { customerService } from '../services/customerService';
import { companyService } from '../services/companyService';

const CustomerEnvelopePrintPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [company, setCompany] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

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
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-colors shadow-sm"
                >
                    <Printer size={20} /> พิมพ์ใบปะหน้า
                </button>
            </div>

            {/* Printable Envelope Page */}
            <div className="print-page bg-white shadow-lg mx-auto relative text-black text-[11pt] font-normal" style={{
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
                            <div>{company?.name || 'บริษัท...'}</div>
                        </div>
                        <div className="whitespace-pre-wrap mt-1">
                            {company?.address || 'ที่อยู่บริษัท...'}
                        </div>
                        {company?.phone && (
                            <div className="mt-1">
                                โทร: {company.phone}
                            </div>
                        )}
                    </div>

                    {/* Bottom Area containing Receiver & Notes */}
                    <div className="grid grid-cols-3 items-end w-full gap-4">
                        
                        {/* Bottom Left: Notes Area */}
                        <div className="col-span-2">
                            <div className="w-[70mm] border-2 border-dashed border-gray-300 rounded-xl p-2">
                                <div className="mb-1 font-semibold">หมายเหตุ:</div>
                                <div className="border-b border-gray-300 h-5 w-full mt-2 mb-1"></div>
                            </div>
                        </div>

                        {/* Bottom Right: Receiver Info */}
                        <div className="col-span-1 leading-snug text-left">
                            <div className="mb-1 border-b border-black inline-block pb-1">ผู้รับ / Receiver</div>
                            
                            {(customer.billingAttention || customer.contactPerson) && (
                                <div className="mt-2">เรียน: {customer.billingAttention || customer.contactPerson}</div>
                            )}
                            
                            <div className={(customer.billingAttention || customer.contactPerson) ? "mt-1" : "mt-2"}>บริษัท: {customer.name}</div>
                            
                            <div className="whitespace-pre-wrap mt-1 leading-snug">
                                ที่อยู่: {customer.billingAddress || customer.address || '-'}
                            </div>

                            {(customer.billingPhone || customer.phone) && (
                                <div className="mt-1">
                                    เบอร์โทร: {customer.billingPhone || customer.phone}
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
                }
            `}</style>
        </div>
    );
};

export default CustomerEnvelopePrintPage;
