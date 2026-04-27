import React, { useState, useEffect } from 'react';
import { 
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
    Clock, AlertCircle, CheckCircle2, ShoppingCart, Filter,
    Search, LayoutGrid, List as ListIcon, Info
} from 'lucide-react';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { useNavigate } from 'react-router-dom';

const CalendarTab = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month'); // month, week
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPOs = async () => {
            setIsLoading(true);
            try {
                const data = await purchaseOrderService.getPurchaseOrders();
                setPurchaseOrders(data || []);
            } catch (err) {
                console.error('Error loading POs for calendar:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadPOs();
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

    const getPOsForDate = (day, month, year) => {
        return purchaseOrders.filter(po => {
            if (!po.due_date) return false;
            const d = new Date(po.due_date);
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
        });
    };

    const getStatusColor = (po) => {
        if (po.status === 'Completed') return 'completed'; // Green
        
        const dueDate = new Date(po.due_date);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (dueDate < today) return 'overdue'; // Red
        return 'upcoming'; // Orange
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
            const pos = getPOsForDate(d, currentDate.getMonth(), currentDate.getFullYear());
            const isToday = d === new Date().getDate() && 
                          currentDate.getMonth() === new Date().getMonth() && 
                          currentDate.getFullYear() === new Date().getFullYear();

            days.push(
                <div key={d} className={`calendar-day ${isToday ? 'today' : ''}`}>
                    <div className="day-header">
                        <span className="day-number">{d}</span>
                        {isToday && <span className="today-badge">วันนี้</span>}
                    </div>
                    <div className="day-events">
                        {pos.map(po => (
                            <div 
                                key={po.id} 
                                className={`event-pill ${getStatusColor(po)}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/dashboard/purchase-orders/${po.id}/edit`);
                                }}
                            >
                                <div className="event-info">
                                    <div className="event-top-line">
                                        <span className="event-po">{po.po_number}</span>
                                        {getStatusColor(po) === 'overdue' && <span className="status-tag overdue">เลยกำหนด</span>}
                                        {getStatusColor(po) === 'upcoming' && <span className="status-tag upcoming">เตรียมจัดส่ง</span>}
                                        {getStatusColor(po) === 'completed' && <span className="status-tag completed">ส่งแล้ว</span>}
                                    </div>
                                    <span className="event-cust">{po.customers?.name}</span>
                                </div>
                            </div>
                        ))}
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
                        <div className="legend-item"><span className="dot overdue"></span> เลยกำหนด</div>
                        <div className="legend-item"><span className="dot upcoming"></span> เตรียมจัดส่ง</div>
                        <div className="legend-item"><span className="dot completed"></span> ส่งแล้ว</div>
                    </div>
                </div>
            </div>

            {/* Calendar Body */}
            <div className="calendar-body glass-panel">
                {view === 'month' ? renderMonthView() : <div className="placeholder">สัปดาห์ (เร็วๆ นี้)</div>}
            </div>

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
                    gap: 1.5rem;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #475569;
                }

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
                    grid-template-columns: repeat(7, minmax(120px, 1fr));
                    min-width: 840px;
                }

                .calendar-weekday {
                    padding: 1rem 0.5rem;
                    text-align: center;
                    font-weight: 800;
                    font-size: 0.75rem;
                    color: #fff;
                    background: #475569;
                    border-bottom: 1px solid rgba(0,0,0,0.05);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .calendar-day {
                    min-height: 120px;
                    padding: 0.6rem;
                    border-right: 1px solid rgba(0,0,0,0.03);
                    border-bottom: 1px solid rgba(0,0,0,0.03);
                    display: flex;
                    flex-direction: column;
                    gap: 0.6rem;
                    transition: all 0.3s;
                    background: #fff;
                }

                .calendar-day:nth-child(7n) { border-right: none; }
                .calendar-day:hover:not(.empty) { background: rgba(59, 130, 246, 0.05); }

                .calendar-day.today {
                    background: rgba(59, 130, 246, 0.04);
                    position: relative;
                }

                .day-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .day-number { font-size: 1rem; font-weight: 800; color: #1e293b; opacity: 0.6; }
                .calendar-day.today .day-number { color: #3b82f6; }

                .today-badge {
                    font-size: 0.6rem;
                    font-weight: 800;
                    padding: 0.2rem 0.5rem;
                    background: #3b82f6;
                    color: #fff;
                    border-radius: 4px;
                    text-transform: uppercase;
                }

                .day-events {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                    overflow-y: auto;
                    flex: 1;
                }

                .event-pill {
                    padding: 0.5rem 0.8rem;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }

                .event-pill:hover { transform: scale(1.03); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }

                .event-pill.overdue { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
                .event-pill.upcoming { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.2); }
                .event-pill.completed { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }

                .event-info { display: flex; flex-direction: column; gap: 0.1rem; }
                .event-top-line {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 0.4rem;
                }
                .event-po { font-size: 0.75rem; font-weight: 800; }
                
                .status-tag {
                    font-size: 0.6rem;
                    padding: 0.1rem 0.3rem;
                    border-radius: 4px;
                    font-weight: 800;
                    white-space: nowrap;
                }
                .status-tag.overdue { background: #ef4444; color: #fff; }
                .status-tag.upcoming { background: #f59e0b; color: #fff; }
                .status-tag.completed { background: #10b981; color: #fff; }

                .event-cust { font-size: 0.7rem; font-weight: 500; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

                .calendar-day.empty { background: #f8fafc; opacity: 1; }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default CalendarTab;
