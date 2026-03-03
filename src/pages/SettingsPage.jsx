import { useState, useEffect } from 'react';
import { Save, Clock, Settings, Briefcase, FileText } from 'lucide-react';
import { settingService } from '../services/settingService';
import { documentNumberHelper } from '../utils/documentNumbering';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';

const SettingsPage = () => {
    const [workSchedule, setWorkSchedule] = useState({
        start_time: '08:00',
        end_time: '17:00',
        late_threshold: 0,
        late_penalty_mins: 0
    });
    const [documentFormats, setDocumentFormats] = useState({
        invoice_format: 'IV{YY}{MM}{RUN}',
        billing_note_format: 'BN{YY}{MM}{RUN}',
        receipt_format: 'RE{YY}{MM}{RUN}'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        const schedule = await settingService.getSetting('work_schedule');
        if (schedule) {
            setWorkSchedule({
                start_time: schedule.start_time || '08:00',
                end_time: schedule.end_time || '17:00',
                late_threshold: schedule.late_threshold || 0,
                late_penalty_mins: schedule.late_penalty_mins || 0
            });
        }

        const formats = await settingService.getSetting('document_formats');
        if (formats) {
            setDocumentFormats({
                invoice_format: formats.invoice_format || (formats.invoice_prefix ? `${formats.invoice_prefix}{YY}{MM}{RUN}` : 'IV{YY}{MM}{RUN}'),
                billing_note_format: formats.billing_note_format || (formats.billing_note_prefix ? `${formats.billing_note_prefix}{YY}{MM}{RUN}` : 'BN{YY}{MM}{RUN}'),
                receipt_format: formats.receipt_format || (formats.receipt_prefix ? `${formats.receipt_prefix}{YY}{MM}{RUN}` : 'RE{YY}{MM}{RUN}')
            });
        }
        setIsLoading(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setWorkSchedule(prev => ({ ...prev, [name]: value }));
        setMessage(null);
    };

    const handleFormatChange = (e) => {
        const { name, value } = e.target;
        // Upper case and limit to 20 chars max for formats
        const upperValue = value.toUpperCase().slice(0, 20);
        setDocumentFormats(prev => ({ ...prev, [name]: upperValue }));
        setMessage(null);
    };

    const calculateDuration = () => {
        if (!workSchedule.start_time || !workSchedule.end_time) return '0 ชั่วโมง';

        const [startH, startM] = workSchedule.start_time.split(':').map(Number);
        const [endH, endM] = workSchedule.end_time.split(':').map(Number);

        let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight

        // Subtract 1 hour (60 minutes) for lunch break
        diffMinutes -= 60;
        if (diffMinutes < 0) diffMinutes = 0; // Ensure no negative duration

        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        return `${hours} ชั่วโมง ${minutes > 0 ? `${minutes} นาที` : ''} (หักพักเที่ยง 1 ชม.)`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await Promise.all([
                settingService.saveSetting('work_schedule', workSchedule, 'Work Schedule Configuration'),
                settingService.saveSetting('document_formats', documentFormats, 'Document Number Formats')
            ]);
            setMessage({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' });
        } catch (error) {
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล...</div>;

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
            <PageHeader
                title="ตั้งค่าระบบ"
                subtitle="จัดการการตั้งค่าต่างๆ ของระบบ"
                helpContent={HELP_CONTENT.settings}
            />

            {message && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderRadius: '8px',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    color: message.type === 'success' ? 'var(--success)' : 'var(--error)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Work Schedule Section */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6' }}>
                        <Briefcase size={20} /> เวลาทำงาน
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                <Clock size={16} style={{ display: 'inline', marginRight: '4px' }} />
                                เวลาเข้างาน
                            </label>
                            <input
                                type="time"
                                name="start_time"
                                value={workSchedule.start_time}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                <Clock size={16} style={{ display: 'inline', marginRight: '4px' }} />
                                เวลาเลิกงาน
                            </label>
                            <input
                                type="time"
                                name="end_time"
                                value={workSchedule.end_time}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontWeight: '500' }}>รวมเวลาทำงานทั้งหมด:</span>
                        <span style={{ color: '#3b82f6', fontWeight: '700', fontSize: '1.1rem' }}>{calculateDuration()}</span>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '2rem 0' }} />

                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
                        <Clock size={20} /> กฎการมาสาย (Late Penalty)
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                ห้ามสายเกิน (นาที)
                            </label>
                            <input
                                type="number"
                                name="late_threshold"
                                value={workSchedule.late_threshold}
                                onChange={handleChange}
                                placeholder="เช่น 30"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>ถ้าสายไม่เกินนี้ จะนับนาทีที่สายจริง</p>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                บทลงโทษหากสายเกิน (นาที)
                            </label>
                            <input
                                type="number"
                                name="late_penalty_mins"
                                value={workSchedule.late_penalty_mins}
                                onChange={handleChange}
                                placeholder="เช่น 60"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>ถ้าสายเกินเกณฑ์ข้างต้น จะถูกปรับเป็นจำนวนนี้ทันที</p>
                        </div>
                    </div>
                </div>

                {/* Document Formats Section */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6' }}>
                        <FileText size={20} /> รูปแบบเลขที่เอกสาร
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group" style={{ gridColumn: '1 / -1', background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1d4ed8', fontSize: '0.9rem' }}>ตัวแปรที่ใช้ได้ (Variables)</h4>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                <li><code>{`{YYYY}`}</code> - ปี ค.ศ. แบบ 4 หลัก เช่น 2026</li>
                                <li><code>{`{YY}`}</code> - ปี ค.ศ. แบบ 2 หลัก เช่น 26</li>
                                <li><code>{`{MM}`}</code> - เดือน แบบ 2 หลัก เช่น 02</li>
                                <li><code>{`{DD}`}</code> - วัน แบบ 2 หลัก เช่น 25</li>
                                <li><code>{`{RUN}`}</code> - เลขรันอัตโนมัติ (ต่อท้ายด้วยตัวเลขเพื่อระบุจำนวนหลักได้ เช่น <code>{`{RUN3}`}</code>, <code>{`{RUN5}`}</code> ค่าเริ่มต้นคือ 4 หลัก)</li>
                            </ul>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                รูปแบบ ใบกำกับภาษี (Invoice)
                            </label>
                            <input
                                type="text"
                                name="invoice_format"
                                value={documentFormats.invoice_format}
                                onChange={handleFormatChange}
                                placeholder="เช่น INV-{YYYY}-{MM}-{RUN}"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', textTransform: 'uppercase' }}
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: '#10b981' }}>ตัวอย่าง: {documentNumberHelper.getPreviewUrl(documentFormats.invoice_format || 'IV{YY}{MM}{RUN}')}</p>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                รูปแบบ ใบวางบิล (Billing Note)
                            </label>
                            <input
                                type="text"
                                name="billing_note_format"
                                value={documentFormats.billing_note_format}
                                onChange={handleFormatChange}
                                placeholder="เช่น BN-{YYYY}-{MM}-{RUN}"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', textTransform: 'uppercase' }}
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: '#10b981' }}>ตัวอย่าง: {documentNumberHelper.getPreviewUrl(documentFormats.billing_note_format || 'BN{YY}{MM}{RUN}')}</p>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                รูปแบบ ใบเสร็จรับเงิน (Receipt)
                            </label>
                            <input
                                type="text"
                                name="receipt_format"
                                value={documentFormats.receipt_format}
                                onChange={handleFormatChange}
                                placeholder="เช่น RE-{YYYY}-{MM}-{RUN}"
                                className="glass-input"
                                style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', textTransform: 'uppercase' }}
                            />
                            <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: '#10b981' }}>ตัวอย่าง: {documentNumberHelper.getPreviewUrl(documentFormats.receipt_format || 'RE{YY}{MM}{RUN}')}</p>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>ใบเสร็จจะดึงเลขรันชุดเดียวกับใบวางบิลมาแสดง</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="submit"
                        disabled={isSaving}
                        style={{
                            padding: '0.8rem 2rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: isSaving ? '#4b5563' : '#8b5cf6',
                            color: 'white',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: '500',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }}
                    >
                        <Save size={18} />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;
