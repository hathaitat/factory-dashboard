import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Activity, Settings, LogOut, Hexagon, Users, Building, Shield, FileText, Menu, X, Clock } from 'lucide-react';
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

    useState(() => {
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
                    <NavLink to="/dashboard" end onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={20} />
                        <span>ภาพรวม</span>
                    </NavLink>

                    {hasPermission('customers', 'view') && (
                        <NavLink to="/dashboard/customers" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Users size={20} />
                            <span>ลูกค้า</span>
                        </NavLink>
                    )}

                    {hasPermission('invoices', 'view') && (
                        <NavLink to="/dashboard/invoices" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <FileText size={20} />
                            <span>ใบกำกับภาษี</span>
                        </NavLink>
                    )}

                    {hasPermission('billing', 'view') && (
                        <>
                            <NavLink to="/dashboard/billing-notes" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <FileText size={20} />
                                <span>ใบวางบิล</span>
                            </NavLink>
                            <NavLink to="/dashboard/receipts" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <FileText size={20} />
                                <span>ใบเสร็จรับเงิน</span>
                            </NavLink>
                        </>
                    )}

                    {hasPermission('company', 'view') && (
                        <NavLink to="/dashboard/company-info" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Building size={20} />
                            <span>ข้อมูลบริษัท</span>
                        </NavLink>
                    )}

                    {hasPermission('users', 'view') && (
                        <NavLink to="/dashboard/users" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Shield size={20} />
                            <span>สิทธิ์การใช้งาน</span>
                        </NavLink>
                    )}

                    {hasPermission('production', 'view') && (
                        <NavLink to="/dashboard/production" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Activity size={20} />
                            <span>การผลิต</span>
                        </NavLink>
                    )}

                    {hasPermission('employees', 'view') && (
                        <>
                            <NavLink to="/dashboard/employees?mode=timesheet" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive && location.search.includes('mode=timesheet') ? 'active' : ''}`}>
                                <Clock size={20} />
                                <span>ลงเวลาทำงาน</span>
                            </NavLink>
                            <NavLink to="/dashboard/employees?mode=info" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive && location.search.includes('mode=info') ? 'active' : ''}`}>
                                <Users size={20} />
                                <span>รายชื่อพนักงาน</span>
                            </NavLink>
                        </>
                    )}

                    <NavLink to="/dashboard/settings" onClick={closeSidebar} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Settings size={20} />
                        <span>ตั้งค่า</span>
                    </NavLink>
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
        </div>
    );
};

export default DashboardLayout;
