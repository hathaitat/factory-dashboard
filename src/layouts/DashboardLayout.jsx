import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Activity, Settings, LogOut, Users, Building, Shield, FileText, FileSymlink, DollarSign, Menu, X, Clock, ShoppingCart, HelpCircle, Truck, Package, ChevronDown, ChevronUp, ChevronRight, Bell, ArrowRight, History as HistoryIcon, Target, Edit2, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { internalRequisitionService } from '../services/internalRequisitionService';
import { companyService } from '../services/companyService';
import { warehouseService } from '../services/warehouseService';
import { usePermissions } from '../hooks/usePermissions';
import '../styles/DashboardLayout.css';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user: currentUser, logout } = useAuth();
    const { hasPermission } = usePermissions();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [pendingCount, setPendingCount] = useState(0);
    const [negativeStockCount, setNegativeStockCount] = useState(0);
    const [recentNotifications, setRecentNotifications] = useState([]);
    const [negativeStockAlerts, setNegativeStockAlerts] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [companyLogo, setCompanyLogo] = useState(null);
    const [companyName, setCompanyName] = useState('MAW');
    const notificationRef = useRef(null);

    // State for collapsible menus
    const [openGroups, setOpenGroups] = useState({
        ops: false,
        internal: false,
        partners: false,
        system: false,
        forms: false
    });

    const toggleGroup = (group) => {
        setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const fetchPendingData = async () => {
        try {
            if (hasPermission('alerts', 'view')) {
                const [count, recent] = await Promise.all([
                    internalRequisitionService.getPendingApprovalCount(),
                    internalRequisitionService.getRecentPendingRequisitions(5)
                ]);
                setPendingCount(count);
                setRecentNotifications(recent);
            }

            // Fetch negative inventory if user has alerts view permission
            if (hasPermission('alerts', 'view')) {
                const negativeInv = await warehouseService.getNegativeInventory();
                setNegativeStockCount(negativeInv.length);
                setNegativeStockAlerts(negativeInv.slice(0, 5)); // Show top 5
            }
        } catch (err) {
            console.error('Error fetching pending notifications:', err);
        }
    };

    const fetchCompanyInfo = async () => {
        try {
            const info = await companyService.getCompanyInfo();
            if (info?.logoUrl) {
                setCompanyLogo(info.logoUrl);
            }
            if (info?.name) {
                // Try to extract a short name or abbreviation, or use the first word
                const shortName = info.name.split(' ')[0];
                setCompanyName(shortName);
            }
        } catch (err) {
            console.error('Error fetching company info:', err);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        fetchPendingData();
        fetchCompanyInfo();
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
        logout();
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

            <aside className={`sidebar glass-panel ${isSidebarOpen ? 'active' : ''} ${isDesktopCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <img src={companyLogo || "/images/logo-nobg.png"} className="sidebar-logo shrink-0 object-contain" alt="Logo" />
                        <span className="sidebar-title leading-none whitespace-nowrap">{companyName}</span>
                    </div>
                    {/* Desktop Toggle Button */}
                    <button
                        className="desktop-toggle-btn"
                        onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
                    >
                        <ChevronRight size={18} className={`transition-transform duration-300 ${isDesktopCollapsed ? 'rotate-0' : 'rotate-180'}`} />
                    </button>
                    {/* Mobile Close Button */}
                    <button className="mobile-close-btn" onClick={closeSidebar}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {/* 6 Core Menus (Flat Items) */}
                    {hasPermission('overview', 'view') && (
                        <NavLink to="/dashboard" end onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <LayoutDashboard size={20} className="text-[#3b82f6]" />
                            <span>ภาพรวม</span>
                        </NavLink>
                    )}

                    {hasPermission('purchase_orders', 'view') && (
                        <NavLink to="/dashboard/purchase-orders" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <ShoppingCart size={20} className="text-[#10b981]" />
                            <span>ใบสั่งซื้อของลูกค้า</span>
                        </NavLink>
                    )}

                    {hasPermission('quotations', 'view') && (
                        <NavLink to="/dashboard/quotations" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <FileText size={20} className="text-[#6366f1]" />
                            <span>ใบเสนอราคา</span>
                        </NavLink>
                    )}

                    {hasPermission('invoices', 'view') && (
                        <NavLink to="/dashboard/invoices" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <FileText size={20} className="text-[#f59e0b]" />
                            <span>ใบกำกับภาษี</span>
                        </NavLink>
                    )}

                    {hasPermission('billing', 'view') && (
                        <>
                            <NavLink to="/dashboard/billing-notes" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <FileSymlink size={20} className="text-[#ec4899]" />
                                <span>ใบวางบิล</span>
                            </NavLink>
                            <NavLink to="/dashboard/receipts" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <DollarSign size={20} className="text-[#06b6d4]" />
                                <span>ใบเสร็จรับเงิน</span>
                            </NavLink>
                        </>
                    )}

                    {/* Form Tools Group */}
                    {(hasPermission('certificate_receipts', 'view') || hasPermission('envelopes', 'view') || hasPermission('internal_requisitions', 'view')) && (
                        <div className={`nav-group ${openGroups.forms ? 'open' : ''}`}>
                            <button className="nav-item group-header" onClick={() => toggleGroup('forms')}>
                                <FileText size={20} className="text-[#06b6d4]" />
                                <span>เครื่องมือพิมพ์เอกสาร</span>
                                <div className="group-chevron">
                                    {openGroups.forms ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>
                            {openGroups.forms && (
                                <div className="group-content">
                                    {hasPermission('certificate_receipts', 'view') && (
                                        <NavLink to="/dashboard/certificate-receipts" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <FileText size={18} className="opacity-70" />
                                            <span>ใบรับรองแทนใบเสร็จ</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('envelopes', 'view') && (
                                        <NavLink to="/dashboard/envelopes" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail opacity-70"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                            <span>ปะหน้าซองจดหมาย</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('internal_requisitions', 'view') && (
                                        <NavLink to="/dashboard/production-requisition-print" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <FileText size={18} className="opacity-70" />
                                            <span>ใบเบิกการผลิต</span>
                                        </NavLink>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {hasPermission('supplier_pos', 'view') && (
                        <NavLink to="/dashboard/supplier-pos" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <ShoppingCart size={20} className="text-[#8b5cf6]" />
                            <span>ใบสั่งซื้อจากผู้ขาย</span>
                        </NavLink>
                    )}
                    {/* COLLAPSIBLE GROUPS */}

                    {/* 1. Warehouse & Production */}
                    {(hasPermission('warehouses', 'view') || hasPermission('production', 'view')) && (
                        <div className={`nav-group ${openGroups.ops ? 'open' : ''}`}>
                            <button className="nav-item group-header" onClick={() => toggleGroup('ops')}>
                                <Package size={20} className="text-[#14b8a6]" />
                                <span>คลังสินค้าและการผลิต</span>
                                <div className="group-chevron">
                                    {openGroups.ops ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>
                            {openGroups.ops && (
                                <div className="group-content">
                                    {hasPermission('warehouses', 'view') && (
                                        <>
                                            <NavLink to="/dashboard/warehouses" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <Package size={18} className="opacity-70" />
                                                <span>คลังสินค้า</span>
                                            </NavLink>
                                            <NavLink to="/dashboard/demand-report" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <Activity size={18} className="opacity-70" />
                                                <span>วิเคราะห์ Demand</span>
                                            </NavLink>
                                            {hasPermission('customer_forecasts', 'view', true) && (
                                                <NavLink to="/dashboard/customer-forecasts" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                    <TrendingUp size={18} className="opacity-70" />
                                                    <span>ประมาณการยอดขาย</span>
                                                </NavLink>
                                            )}
                                        </>
                                    )}
                                    {hasPermission('production', 'view') && (
                                        <>
                                            <NavLink to="/dashboard/production" end onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <Activity size={18} className="opacity-70" />
                                                <span>ภาพรวมการผลิต</span>
                                            </NavLink>
                                            <NavLink to="/dashboard/production/plans" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <Target size={18} className="opacity-70" />
                                                <span>เป้าหมายการผลิต</span>
                                            </NavLink>
                                            <NavLink to="/dashboard/production/daily-log" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <Edit2 size={18} className="opacity-70" />
                                                <span>บันทึกผลผลิต</span>
                                            </NavLink>
                                            <NavLink to="/dashboard/production/requisitions" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <Package size={18} className="opacity-70" />
                                                <span>เบิกวัตถุดิบ (ผลิต)</span>
                                            </NavLink>
                                            <NavLink to="/dashboard/production/returns" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <HistoryIcon size={18} className="opacity-70" />
                                                <span>คืนวัตถุดิบ (ผลิต)</span>
                                            </NavLink>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 1.5 Internal Items */}
                    {(hasPermission('internal_items', 'view') || hasPermission('internal_requisitions', 'view')) && (
                        <div className={`nav-group ${openGroups.internal ? 'open' : ''}`}>
                            <button className="nav-item group-header" onClick={() => toggleGroup('internal')}>
                                <Package size={20} className="text-[#f59e0b]" />
                                <span>ของใช้ในโรงงาน</span>
                                <div className="group-chevron">
                                    {openGroups.internal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>
                            {openGroups.internal && (
                                <div className="group-content">
                                    {hasPermission('internal_items', 'view') && (
                                        <NavLink to="/dashboard/internal-items" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Package size={18} className="opacity-70" />
                                            <span>รายการของใช้</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('internal_requisitions', 'view') && (
                                        <NavLink to="/dashboard/internal-requisitions" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <HistoryIcon size={18} className="opacity-70" />
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
                                <Users size={20} className="text-[#3b82f6]" />
                                <span>คู่ค้าและพนักงาน</span>
                                <div className="group-chevron">
                                    {openGroups.partners ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>
                            {openGroups.partners && (
                                <div className="group-content">
                                    {hasPermission('customers', 'view') && (
                                        <NavLink to="/dashboard/customers" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Users size={18} className="opacity-70" />
                                            <span>ลูกค้า</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('certificates', 'view') && (
                                        <NavLink to="/dashboard/certificates" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Shield size={18} className="opacity-70" />
                                            <span>เอกสาร Certificate</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('suppliers', 'view') && (
                                        <NavLink to="/dashboard/suppliers" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Truck size={18} className="opacity-70" />
                                            <span>ผู้ขาย</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('employees', 'view') && (
                                        <NavLink to="/dashboard/employees" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Users size={18} className="opacity-70" />
                                            <span>รายชื่อพนักงาน</span>
                                        </NavLink>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. System Settings */}
                    {(hasPermission('settings', 'view') || hasPermission('company', 'view') || hasPermission('users', 'view') || hasPermission('production', 'edit')) && (
                        <div className={`nav-group ${openGroups.system ? 'open' : ''}`}>
                            <button className="nav-item group-header" onClick={() => toggleGroup('system')}>
                                <Settings size={20} className="text-[#64748b]" />
                                <span>ตั้งค่าระบบ</span>
                                <div className="group-chevron">
                                    {openGroups.system ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </button>
                            {openGroups.system && (
                                <div className="group-content">
                                    {hasPermission('company', 'view') && (
                                        <NavLink to="/dashboard/company-info" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Building size={18} className="opacity-70" />
                                            <span>ข้อมูลบริษัท</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('users', 'view') && (
                                        <NavLink to="/dashboard/users" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Shield size={18} className="opacity-70" />
                                            <span>สิทธิ์การใช้งาน</span>
                                        </NavLink>
                                    )}
                                    {hasPermission('settings', 'view') && (
                                        <>
                                            <NavLink to="/dashboard/guide" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <HelpCircle size={18} className="opacity-70" />
                                                <span>คู่มือใช้งาน</span>
                                            </NavLink>
                                            <NavLink to="/dashboard/settings" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <Settings size={18} className="opacity-70" />
                                                <span>ตั้งค่า</span>
                                            </NavLink>
                                        </>
                                    )}
                                    {hasPermission('production', 'edit') && (
                                        <NavLink to="/dashboard/production/settings" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                            <Settings size={18} className="opacity-70" />
                                            <span>ตั้งค่าแผนก/เครื่อง</span>
                                        </NavLink>
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
                        {hasPermission('alerts', 'view') && (
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
                                        <div className="notification-header">
                                            <h3>การแจ้งเตือน</h3>
                                            {(pendingCount + negativeStockCount) > 0 && <span>{(pendingCount + negativeStockCount)} รายการใหม่</span>}
                                        </div>
                                        <div className="notification-list">
                                            {recentNotifications.length === 0 && negativeStockAlerts.length === 0 ? (
                                                <div className="notification-empty">ไม่มีการแจ้งเตือน</div>
                                            ) : (
                                                <>
                                                    {negativeStockAlerts.map(item => (
                                                        <div key={`inv-${item.id}`} className="notification-item" onClick={() => {
                                                            setShowNotifications(false);
                                                            navigate('/dashboard/inventory');
                                                        }}>
                                                            <div className="notification-icon bg-[#ef4444]/10 text-[#ef4444]">
                                                                <Package size={16} />
                                                            </div>
                                                            <div className="notification-content">
                                                                <div className="notification-title text-error">สินค้าติดลบ</div>
                                                                <div className="notification-desc">{item.product_name} ({item.product_code || '-'}) ใน {item.warehouse?.name || ''} จำนวน {item.quantity} {item.unit}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {recentNotifications.map(req => (
                                                        <div key={`req-${req.id}`} className="notification-item" onClick={() => {
                                                            setShowNotifications(false);
                                                            navigate('/dashboard/internal-items/requisitions');
                                                        }}>
                                                            <div className="notification-icon bg-[#3b82f6]/10 text-[#3b82f6]">
                                                                <FileText size={16} />
                                                            </div>
                                                            <div className="notification-content">
                                                                <div className="notification-title">รออนุมัติเบิก</div>
                                                                <div className="notification-desc">{req.document_no || req.requisition_number} - {req.requester_name || req.requested_by} ({req.department || 'ไม่ระบุ'})</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                        {recentNotifications.length > 0 && (
                                            <div className="notification-footer" onClick={() => {
                                                setShowNotifications(false);
                                                navigate('/dashboard/internal-items/requisitions');
                                            }}>
                                                ดูทั้งหมด <ArrowRight size={14} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="sidebar-divider h-6 m-0 opacity-20"></div>

                        <div className="user-profile">
                            <div className="status-indicator online"></div>
                            <div className="flex flex-col text-right">
                                <span className="user-name leading-[1.2]">{currentUser?.fullName || 'administrator'}</span>
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
