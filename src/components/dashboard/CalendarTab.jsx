import React, { useState, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, List as ListIcon, ShoppingCart
} from 'lucide-react';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { supplierPoService } from '../../services/supplierPoService';
import { useNavigate } from 'react-router-dom';

const CalendarTab = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month'); // month, week
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [supplierPos, setSupplierPos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDayEvents, setSelectedDayEvents] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const loadAllData = async () => {
            setIsLoading(true);
            try {
                const [poData, supplierPoData] = await Promise.all([
                    purchaseOrderService.getPurchaseOrders(),
                    supplierPoService.getSupplierPos()
                ]);
                setPurchaseOrders(poData || []);
                setSupplierPos(supplierPoData || []);
            } catch (err) {
                console.error('Error loading calendar data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadAllData();
    }, []);

    // Calendar Helper Functions
    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    const monthNames = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    const dayNames = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

    const getEventsForDate = (day, month, year) => {
        const clientEvents = [];
        purchaseOrders.forEach(po => {
            const uniqueDueDates = new Set();
            if (po.purchase_order_items && po.purchase_order_items.length > 0) {
                po.purchase_order_items.forEach(item => {
                    if (item.delivery_schedule && item.delivery_schedule.length > 0) {
                        item.delivery_schedule.forEach(schedule => {
                            if (schedule.date) uniqueDueDates.add(schedule.date);
                        });
                    } else if (item.due_date) {
                        uniqueDueDates.add(item.due_date);
                    } else if (po.due_date) {
                        uniqueDueDates.add(po.due_date);
                    }
                });
            } else if (po.due_date) {
                uniqueDueDates.add(po.due_date);
            }

            uniqueDueDates.forEach(dateStr => {
                const d = new Date(dateStr);
                if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
                    clientEvents.push({ ...po, event_due_date: dateStr, type: 'client' });
                }
            });
        });

        const supplierEvents = supplierPos.filter(po => {
            if (!po.delivery_date) return false;
            const d = new Date(po.delivery_date);
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
        }).map(po => ({ ...po, type: 'supplier' }));

        return [...clientEvents, ...supplierEvents];
    };

    const getStatusColor = (event) => {
        if (event.status === 'Completed') return 'completed';

        const date = event.type === 'client' ? (event.event_due_date || event.due_date) : event.delivery_date;
        if (!date) return 'upcoming';

        const targetDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (targetDate < today) return 'overdue';
        return 'upcoming';
    };

    const renderMonthView = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Padding for empty days at start
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        // Actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const allEvents = getEventsForDate(d, currentDate.getMonth(), currentDate.getFullYear());
            const displayEvents = allEvents.slice(0, 2); // Show only first 2
            const remainingCount = allEvents.length - displayEvents.length;

            const isToday = d === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();

            days.push(
                <div key={d} className={`calendar-day ${isToday ? 'today' : ''}`} onClick={() => {
                    if (allEvents.length > 0) {
                        setSelectedDayEvents({ day: d, events: allEvents });
                        setIsModalOpen(true);
                    }
                }}>
                    <div className="day-header">
                        <span className="day-number">{d}</span>
                        {isToday && <span className="today-badge">วันนี้</span>}
                    </div>
                    <div className="day-events">
                        {displayEvents.map(event => (
                            <div
                                key={`${event.type}-${event.id}-${event.event_due_date || 'default'}`}
                                className={`event-pill ${getStatusColor(event)} ${event.type}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const path = event.type === 'client' 
                                        ? `/dashboard/purchase-orders/${event.id}/edit` 
                                        : `/dashboard/supplier-pos/${event.id}/edit`;
                                    navigate(path);
                                }}
                            >
                                <div className="event-info">
                                    <div className="event-top-line">
                                        <span className="event-po">
                                            <span style={{ fontWeight: '800', marginRight: '4px' }}>
                                                {event.type === 'supplier' ? 'สั่งซื้อ' : 'ส่งงาน'}
                                            </span>
                                            {event.po_number}
                                        </span>
                                    </div>
                                    <span className="event-cust">
                                        {event.type === 'client' ? event.customers?.name : event.suppliers?.name}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {remainingCount > 0 && (
                            <div className="more-events-link">
                                + ดูอีก {remainingCount} รายการ
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Fill remaining empty boxes to make a perfect grid (at least 35 or 42 cells)
        const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
        for (let i = firstDay + daysInMonth; i < totalCells; i++) {
            days.push(<div key={`empty-end-${i}`} className="calendar-day empty"></div>);
        }

        return (
            <div className="calendar-grid">
                {dayNames.map(day => <div key={day} className="calendar-weekday">{day}</div>)}
                {days}
            </div>
        );
    };

    if (isLoading) return <div className="tab-loading">กำลังโหลดปฏิทินงาน...</div>;

    const formattedToday = new Intl.DateTimeFormat('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date());

    return (
        <div className="calendar-tab-wrapper">
            {/* Header with Today's Date */}
            <div className="calendar-header-info glass-panel">
                <div className="header-date-box">
                    <CalendarIcon size={24} className="date-icon" />
                    <div>
                        <div className="today-label">วันนี้คือวันที่:</div>
                        <div className="today-text">{formattedToday}</div>
                    </div>
                </div>
            </div>

            {/* Calendar Header Controls */}
            <div className="calendar-controls glass-panel">
                <div className="control-left">
                    <h2 className="current-month-display">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
                    </h2>
                    <div className="nav-buttons">
                        <button onClick={prevMonth} className="nav-btn"><ChevronLeft size={20} /></button>
                        <button onClick={goToToday} className="nav-btn today">วันนี้</button>
                        <button onClick={nextMonth} className="nav-btn"><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div className="control-right">
                    <div className="calendar-legend-inline">
                        <div className="legend-item"><span className="legend-type client"></span> PO ลูกค้า (ส่งงาน)</div>
                        <div className="legend-item"><span className="legend-type supplier"></span> PO ผู้ขาย (สั่งซื้อ)</div>
                        <div className="legend-divider"></div>
                        <div className="legend-item"><span className="dot overdue"></span> เลยกำหนด</div>
                        <div className="legend-item"><span className="dot upcoming"></span> เตรียมงาน</div>
                        <div className="legend-item"><span className="dot completed"></span> สำเร็จ</div>
                    </div>
                </div>
            </div>

            {/* Calendar Body */}
            <div className="calendar-body glass-panel">
                {view === 'month' ? renderMonthView() : <div className="placeholder">สัปดาห์ (เร็วๆ นี้)</div>}
            </div>

            {/* Events Modal */}
            {isModalOpen && selectedDayEvents && (
                <div className="calendar-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="calendar-modal-content glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>รายการงานวันที่ {selectedDayEvents.day} {monthNames[currentDate.getMonth()]}</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {selectedDayEvents.events.map(event => (
                                <div 
                                    key={`${event.type}-${event.id}-${event.event_due_date || 'default'}`}
                                    className={`modal-event-item ${getStatusColor(event)} ${event.type}`}
                                    onClick={() => {
                                        const path = event.type === 'client' 
                                            ? `/dashboard/purchase-orders/${event.id}/edit` 
                                            : `/dashboard/supplier-pos/${event.id}/edit`;
                                        navigate(path);
                                    }}
                                >
                                    <div className="modal-event-type">
                                        {event.type === 'client' ? (
                                            <span className="badge-client">📦 ส่งงานให้ลูกค้า (Client PO)</span>
                                        ) : (
                                            <span className="badge-supplier">🛒 สั่งซื้อของ (Vendor PO)</span>
                                        )}
                                    </div>
                                    <div className="modal-event-main">
                                        <div className="modal-event-po">{event.po_number}</div>
                                        <div className={`modal-event-status ${getStatusColor(event)}`}>
                                            {getStatusColor(event) === 'overdue' ? 'เลยกำหนด' : 
                                             getStatusColor(event) === 'completed' ? 'สำเร็จแล้ว' : 
                                             event.type === 'client' ? 'รอจัดส่ง' : 'รอรับสินค้า'}
                                        </div>
                                    </div>
                                    <div className="modal-event-cust">
                                        {event.type === 'client' ? event.customers?.name : event.suppliers?.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .calendar-tab-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .calendar-header-info {
                    padding: 1.5rem 2rem;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05));
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    border-radius: 24px;
                }

                .header-date-box {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .date-icon { color: #3b82f6; }
                .today-label { font-size: 0.85rem; color: #64748b; font-weight: 500; }
                .today-text { font-size: 1.4rem; font-weight: 800; color: #1e293b; }

                .calendar-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                }

                .current-month-display {
                    margin: 0;
                    font-size: 1.4rem;
                    font-weight: 800;
                    color: #1e293b;
                    min-width: 220px;
                }

                .control-left {
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                }

                .calendar-legend-inline {
                    display: flex;
                    align-items: center;
                    gap: 1.2rem;
                }

                .legend-divider {
                    width: 1px;
                    height: 20px;
                    background: #e2e8f0;
                    margin: 0 0.5rem;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #64748b;
                }

                .legend-type { width: 12px; height: 12px; border-radius: 3px; }
                .legend-type.client { background: #8b5cf6; }
                .legend-type.supplier { background: #0ea5e9; }

                .dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
                .dot.overdue { color: #ef4444; background: #ef4444; }
                .dot.upcoming { color: #f59e0b; background: #f59e0b; }
                .dot.completed { color: #10b981; background: #10b981; }

                .nav-buttons {
                    display: flex;
                    gap: 0.5rem;
                    background: rgba(255,255,255,0.05);
                    padding: 0.3rem;
                    border-radius: 12px;
                }

                .nav-btn {
                    background: none;
                    border: none;
                    color: #475569;
                    padding: 0.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .nav-btn:hover { background: rgba(0,0,0,0.05); color: #000; }
                .nav-btn.today { font-size: 0.85rem; font-weight: 700; padding: 0.5rem 1rem; }

                .calendar-body {
                    padding: 0;
                    overflow-x: auto;
                    border-radius: 24px;
                    border: 1px solid rgba(0,0,0,0.05);
                    background: #fff;
                }

                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    min-width: 1000px;
                }

                .calendar-weekday {
                    padding: 0.8rem 0.5rem;
                    text-align: center;
                    font-weight: 700;
                    font-size: 0.8rem;
                    color: #475569;
                    background: #f8fafc;
                    border-bottom: 2px solid #e2e8f0;
                }

                .calendar-day {
                    height: 140px;
                    padding: 0.5rem;
                    border-right: 1px solid #f1f5f9;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                    transition: all 0.2s;
                    background: #fff;
                    cursor: default;
                }
                
                .calendar-day:not(.empty):hover {
                    background: #fdfdfd;
                    box-shadow: inset 0 0 0 1px #3b82f644;
                }

                .calendar-day.today {
                    background: #f0f7ff;
                }

                .day-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2px;
                }

                .day-number { font-size: 0.9rem; font-weight: 700; color: #64748b; }
                .calendar-day.today .day-number { color: #3b82f6; }

                .day-events {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    overflow: hidden;
                    flex: 1;
                }

                .event-pill {
                    padding: 4px 8px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.15s;
                    border-left: 3px solid transparent;
                    font-size: 0.7rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .event-pill:hover { transform: translateX(2px); }

                /* Client PO Theme */
                .event-pill.client {
                    background: #f5f3ff;
                    color: #5b21b6;
                    border-color: #8b5cf6;
                }
                .event-pill.client.overdue { background: #fef2f2; color: #991b1b; border-color: #ef4444; }
                .event-pill.client.completed { background: #ecfdf5; color: #065f46; border-color: #10b981; }

                /* Supplier PO Theme */
                .event-pill.supplier {
                    background: #f0f9ff;
                    color: #075985;
                    border-color: #0ea5e9;
                }
                .event-pill.supplier.overdue { background: #fff1f2; color: #9f1239; border-color: #f43f5e; }
                .event-pill.supplier.completed { background: #f0fdf4; color: #166534; border-color: #22c55e; }

                .event-info { display: flex; flex-direction: column; }
                .event-po { font-weight: 700; font-size: 0.75rem; }
                .event-cust { font-size: 0.65rem; opacity: 0.8; }

                .more-events-link {
                    font-size: 0.65rem;
                    color: #3b82f6;
                    font-weight: 700;
                    text-align: center;
                    padding: 2px 0;
                    cursor: pointer;
                    margin-top: auto;
                }
                .more-events-link:hover { text-decoration: underline; }

                /* Modal Styles */
                .calendar-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease;
                }

                .calendar-modal-content {
                    width: 90%;
                    max-width: 500px;
                    background: white;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                }

                .modal-header {
                    padding: 1.2rem 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #f1f5f9;
                    background: #f8fafc;
                }
                .modal-header h3 { margin: 0; font-size: 1.1rem; color: #1e293b; }
                .close-btn { 
                    background: none; border: none; font-size: 1.5rem; cursor: pointer; 
                    color: #94a3b8; transition: color 0.2s;
                }
                .close-btn:hover { color: #1e293b; }

                .modal-body {
                    padding: 1rem;
                    max-height: 60vh;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                }

                .modal-event-item {
                    padding: 1rem;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border-left: 5px solid transparent;
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                }
                .modal-event-item:hover { transform: scale(1.01); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

                .modal-event-item.client { background: #f5f3ff; border-color: #8b5cf6; }
                .modal-event-item.supplier { background: #f0f9ff; border-color: #0ea5e9; }
                
                .badge-client, .badge-supplier {
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 4px;
                    text-transform: uppercase;
                }
                .badge-client { background: #ddd6fe; color: #5b21b6; }
                .badge-supplier { background: #bae6fd; color: #075985; }

                .modal-event-main {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-event-po { font-weight: 800; font-size: 1.1rem; color: #1e293b; }
                .modal-event-status { font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
                
                .modal-event-status.upcoming { background: #fef3c7; color: #92400e; }
                .modal-event-status.overdue { background: #fee2e2; color: #991b1b; }
                .modal-event-status.completed { background: #d1fae5; color: #065f46; }

                .modal-event-cust { font-size: 0.9rem; color: #64748b; font-weight: 500; }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default CalendarTab;
