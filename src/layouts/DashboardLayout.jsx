import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Activity, Settings, LogOut, Hexagon, Users, Building, Shield, FileText, FileSymlink, DollarSign, Menu, X, Clock, ShoppingCart, HelpCircle, Truck, Package, ChevronDown, ChevronUp, Bell, ArrowRight, History as HistoryIcon } from 'lucide-react';
import { userService } from '../services/userService';
import { internalRequisitionService } from '../services/internalRequisitionService';
import { usePermissions } from '../hooks/usePermissions';
import '../styles/DashboardLayout.css';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = userService.getCurrentUser();
    const { hasPermission } = usePermissions();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [pendingCount, setPendingCount] = useState(0);
    const [recentNotifications, setRecentNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);

    // State for collapsible menus
    const [openGroups, setOpenGroups] = useState({
        ops: false,
        partners: false,
        system: false
    });

    const toggleGroup = (group) => {
        setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const fetchPendingData = async () => {
        try {
            // Only fetch if user has permission to see/manage internal items
            if (hasPermission('internal_items', 'edit') || hasPermission('internal_items', 'create')) {
                const [count, recent] = await Promise.all([
                    internalRequisitionService.getPendingApprovalCount(),
                    internalRequisitionService.getRecentPendingRequisitions(5)
                ]);
                setPendingCount(count);
                setRecentNotifications(recent);
            }
        } catch (err) {
            console.error('Error fetching pending notifications:', err);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        
        fetchPendingData();
        const pendingTimer = setInterval(fetchPendingData, 30000); // Refresh every 30s
        
        return () => {
            clearInterval(timer);
            clearInterval(pendingTimer);
        };
    }, []);

    // Close notifications when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        userService.logout();
        navigate('/login');
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    return (
        <div className="dashboard-container">
            {/* Mobile Overlay */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
                onClick={closeSidebar}
            ></div>

            <aside className={`sidebar glass-panel ${isSidebarOpen ? 'active' : ''}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Hexagon className="sidebar-logo" size={26} />
                        <span className="sidebar-title" style={{ lineHeight: 1 }}>MAW OS</span>
                    </div>
                    <button className="mobile-close-btn" onClick={closeSidebar}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {/* 6 Core Menus (Flat Items) */}
                    {hasPermission('overview', 'view') && (
                        <NavLink to="/dashboard" end onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <LayoutDashboard size={20} style={{ color: '#3b82f6' }} />
                            <span>ภาพรวม</span>
                        </NavLink>
                    )}

                    {hasPermission('purchase_orders', 'view') && (
                        <NavLink to="/dashboard/purchase-orders" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <ShoppingCart size={20} style={{ color: '#10b981' }} />
                            <span>ใบสั่งซื้อ (PO) ของลูกค้า</span>
                        </NavLink>
                    )}

                    {hasPermission('quotations', 'view') && (
                        <NavLink to="/dashboard/quotations" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <FileText size={20} style={{ color: '#6366f1' }} />
                            <span>ใบเสนอราคา (Quotations)</span>
                        </NavLink>
                    )}

                    {hasPermission('invoices', 'view') && (
                        <NavLink to="/dashboard/invoices" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <FileText size={20} style={{ color: '#f59e0b' }} />
                            <span>ใบกำกับภาษี (Invoice)</span>
                        </NavLink>
                    )}

                    {hasPermission('billing', 'view') && (
                        <>
                            <NavLink to="/dashboard/billing-notes" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <FileSymlink size={20} style={{ color: '#ec4899' }} />
                                <span>ใบวางบิล</span>
                            </NavLink>
                            <NavLink to="/dashboard/receipts" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <DollarSign size={20} style={{ color: '#06b6d4' }} />
                                <span>ใบเสร็จรับเงิน (Receipt)</span>
                            </NavLink>
                        </>
                    )}

                    {hasPermission('supplier_pos', 'view') && (
                        <NavLink to="/dashboard/supplier-pos" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <ShoppingCart size={20} style={{ color: '#8b5cf6' }} />
                            <span>ใบสั่งซื้อจากผู้ขาย (Vendor PO)</span>
                        </NavLink>
                    )}
                    {/* COLLAPSIBLE GROUPS */}

                    {/* 1. Warehouse & Production */}
                    {(hasPermission('warehouses', 'view') || hasPermission('production', 'view')) && (
                        <div className={`nav-group ${openGroups.ops ? 'open' : ''}`}>
                            <button className="nav-item group-header" onClick={() => toggleGroup('ops')}>
                                <Package size={20} style={{ color: '#14b8a6' }} />
                                <span>คลังสินค้าและการผลิต</span>
                                <div className="group-chevron">
                                    {openGroups.ops ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>
                            {openGroups.ops && (
                                <div className="group-content">
                                    {hasPermission('warehouses', 'view') && (
                                        <NavLink to="/dashboard/warehouses" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Package size={18} style={{ opacity: 0.7 }} />
                                            <span>คลังสินค้า (Warehouse)</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('production', 'view') && (
                                        <NavLink to="/dashboard/production" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Activity size={18} style={{ opacity: 0.7 }} />
                                            <span>การผลิต</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('internal_items', 'view') && (
                                        <NavLink to="/dashboard/internal-items" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Package size={18} style={{ opacity: 0.7 }} />
                                            <span>ของใช้ในโรงงาน</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('internal_requisitions', 'view') && (
                                        <NavLink to="/dashboard/internal-requisitions" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <HistoryIcon size={18} style={{ opacity: 0.7 }} />
                                            <span>ประวัติการเบิก/สั่งซื้อ</span>
                                        </NavLink>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. Partners & Personnel */}
                    {(hasPermission('customers', 'view') || hasPermission('suppliers', 'view') || hasPermission('employees', 'view') || hasPermission('certificates', 'view')) && (
                        <div className={`nav-group ${openGroups.partners ? 'open' : ''}`}>
                            <button className="nav-item group-header" onClick={() => toggleGroup('partners')}>
                                <Users size={20} style={{ color: '#3b82f6' }} />
                                <span>คู่ค้าและพนักงาน</span>
                                <div className="group-chevron">
                                    {openGroups.partners ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>
                            {openGroups.partners && (
                                <div className="group-content">
                                    {hasPermission('customers', 'view') && (
                                        <NavLink to="/dashboard/customers" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Users size={18} style={{ opacity: 0.7 }} />
                                            <span>ลูกค้า (Customers)</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('certificates', 'view') && (
                                        <NavLink to="/dashboard/certificates" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Shield size={18} style={{ opacity: 0.7 }} />
                                            <span>เอกสาร Certificate</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('suppliers', 'view') && (
                                        <NavLink to="/dashboard/suppliers" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Truck size={18} style={{ opacity: 0.7 }} />
                                            <span>ผู้ขาย (Suppliers)</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('employees', 'view') && (
                                        <>
                                            <NavLink to="/dashboard/employees?mode=timesheet" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive && location.search.includes('mode=timesheet') ? 'active' : ''}`}>
                                                <Clock size={18} style={{ opacity: 0.7 }} />
                                                <span>ลงเวลาทำงาน</span>
                                            </NavLink>
                                            <NavLink to="/dashboard/employees?mode=info" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive && location.search.includes('mode=info') ? 'active' : ''}`}>
                                                <Users size={18} style={{ opacity: 0.7 }} />
                                                <span>รายชื่อพนักงาน</span>
                                            </NavLink>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. System Settings */}
                    {(hasPermission('settings', 'view') || hasPermission('company', 'view') || hasPermission('users', 'view')) && (
                        <div className={`nav-group ${openGroups.system ? 'open' : ''}`}>
                            <button className="nav-item group-header" onClick={() => toggleGroup('system')}>
                                <Settings size={20} style={{ color: '#64748b' }} />
                                <span>ตั้งค่าระบบ</span>
                                <div className="group-chevron">
                                    {openGroups.system ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>
                            {openGroups.system && (
                                <div className="group-content">
                                    {hasPermission('company', 'view') && (
                                        <NavLink to="/dashboard/company-info" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Building size={18} style={{ opacity: 0.7 }} />
                                            <span>ข้อมูลบริษัท</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('users', 'view') && (
                                        <NavLink to="/dashboard/users" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Shield size={18} style={{ opacity: 0.7 }} />
                                            <span>สิทธิ์การใช้งาน</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('settings', 'view') && (
                                        <>
                                            <NavLink to="/dashboard/guide" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <HelpCircle size={18} style={{ opacity: 0.7 }} />
                                                <span>คู่มือใช้งาน</span>
                                            </NavLink>
                                            <NavLink to="/dashboard/settings" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <Settings size={18} style={{ opacity: 0.7 }} />
                                                <span>ตั้งค่า</span>
                                            </NavLink>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="nav-item logout-btn w-full bg-transparent border-none cursor-pointer text-left">
                        <LogOut size={20} />
                        <span>ออกจากระบบ</span>
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="top-bar glass-panel">
                    {/* Left: Menu & Breadcrumbs */}
                    <div className="flex items-center gap-4">
                        <button className="menu-toggle-btn" onClick={toggleSidebar}>
                            <Menu size={24} />
                        </button>
                        <div className="breadcrumbs">
                            <span className="text-muted">ระบบ</span> / <span className="text-highlight">แดชบอร์ด</span>
                        </div>
                    </div>

                    {/* Right: Clock, Notifications & Profile */}
                    <div className="flex items-center gap-4">
                        <div className="desktop-clock">
                            <div className="clock-date">
                                {currentTime.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            <div className="clock-time">
                                {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </div>
                        </div>

                        {/* Notification Bell Dropdown */}
                        {(hasPermission('internal_items', 'edit') || hasPermission('internal_items', 'create')) && (
                            <div className="notification-wrapper" ref={notificationRef}>
                                <div 
                                    className={`flex items-center gap-2 p-2 px-3 rounded-lg cursor-pointer transition-all ${showNotifications ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-textMuted hover:bg-white/5 hover:text-primary'}`}
                                    onClick={() => setShowNotifications(!showNotifications)}
                                >
                                    <Bell size={20} />
                                    <span className="hidden xl:inline font-medium text-xs uppercase tracking-wider">Alerts</span>
                                    {pendingCount > 0 && (
                                        <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${showNotifications ? 'bg-white text-primary' : 'bg-[#ef4444] text-white'}`}>
                                            {pendingCount > 99 ? '99+' : pendingCount}
                                        </span>
                                    )}
                                </div>

                                {showNotifications && (
                                    <div className="notification-dropdown">
                                        <div className="max-h-[400px] overflow-y-auto">
                                            {recentNotifications.length > 0 ? (
                                                recentNotifications.map((notif) => (
                                                    <div 
                                                        key={notif.id} 
                                                        className="notification-item unread"
                                                        onClick={() => {
                                                            setShowNotifications(false);
                                                            navigate(`/dashboard/internal-requisitions/${notif.id}`);
                                                        }}
                                                    >
                                                        <div className="notification-item-title">
                                                            ใบสั่งซื้อใหม่: {notif.requisition_number}
                                                        </div>
                                                        <div className="text-xs text-textMain opacity-80 mb-1">
                                                            โดย {notif.requested_by} • {notif.items?.[0]?.count || 0} รายการ
                                                        </div>
                                                        <div className="notification-item-time">
                                                            {new Date(notif.created_at).toLocaleDateString('th-TH')} {new Date(notif.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="notification-empty">
                                                    <Bell size={32} className="opacity-10 mx-auto mb-2" />
                                                    <p>ไม่มีรายการแจ้งเตือนใหม่</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="notification-footer">
                                            <button 
                                                className="view-all-btn flex items-center gap-2"
                                                onClick={() => {
                                                    setShowNotifications(false);
                                                    navigate('/dashboard/internal-items?tab=history');
                                                }}
                                            >
                                                ดูทั้งหมด <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="sidebar-divider" style={{ height: '24px', margin: '0', opacity: 0.2 }}></div>

                        <div className="user-profile">
                            <div className="status-indicator online"></div>
                            <div className="flex flex-col text-right">
                                <span className="user-name" style={{ lineHeight: 1.2 }}>{currentUser?.fullName || 'administrator'}</span>
                                <span className="text-[10px] text-textMuted uppercase tracking-tighter">Online Now</span>
                            </div>
                            <div className="avatar">{currentUser?.fullName?.charAt(0) || 'B'}</div>
                        </div>
                    </div>
                </header>

                <div className="content-scroll">
                    <Outlet />
                </div>
            </main>
        </div >
    );
};

export default DashboardLayout;
