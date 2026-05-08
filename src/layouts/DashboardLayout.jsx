import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Activity, Settings, LogOut, Hexagon, Users, Building, Shield, FileText, FileSymlink, DollarSign, Menu, X, Clock, ShoppingCart, HelpCircle, Truck, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { userService } from '../services/userService';
import { usePermissions } from '../hooks/usePermissions';
import '../styles/DashboardLayout.css';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = userService.getCurrentUser();
    const { hasPermission } = usePermissions();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // State for collapsible menus
    const [openGroups, setOpenGroups] = useState({
        ops: false,
        partners: false,
        system: false
    });

    const toggleGroup = (group) => {
        setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
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
                    <div className="flex-center" style={{ gap: '12px' }}>
                        <Hexagon className="sidebar-logo" size={28} />
                        <span className="sidebar-title">MAW OS</span>
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
                                </div>
                            )}
                        </div>
                    )}

                    {/* 2. Partners & Personnel */}
                    {(hasPermission('customers', 'view') || hasPermission('suppliers', 'view') || hasPermission('employees', 'view')) && (
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
                                        <>
                                            <NavLink to="/dashboard/customers" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <Users size={18} style={{ opacity: 0.7 }} />
                                                <span>ลูกค้า (Customers)</span>
                                            </NavLink>
                                            <NavLink to="/dashboard/certificates" onClick={closeSidebar} className={({ isActive }) => `nav-item sub ${isActive ? 'active' : ''}`}>
                                                <Shield size={18} style={{ opacity: 0.7 }} />
                                                <span>เอกสาร Certificate</span>
                                            </NavLink>
                                        </>
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
                    <button onClick={handleLogout} className="nav-item logout-btn" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <LogOut size={20} />
                        <span>ออกจากระบบ</span>
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="top-bar glass-panel">
                    <div className="flex-center" style={{ gap: '1rem' }}>
                        <button className="menu-toggle-btn" onClick={toggleSidebar}>
                            <Menu size={24} />
                        </button>
                        <div className="breadcrumbs">
                            <span className="text-muted">ระบบ</span> / <span className="text-highlight">แดชบอร์ด</span>
                        </div>
                    </div>

                    <div className="desktop-clock">
                        <div className="clock-date">
                            {currentTime.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="clock-time">
                            {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </div>
                    </div>
                    <div className="user-profile">
                        <div className="status-indicator online"></div>
                        <span className="user-name">{currentUser?.fullName || 'administrator'}</span>
                        <div className="avatar">{currentUser?.fullName?.charAt(0) || 'B'}</div>
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
