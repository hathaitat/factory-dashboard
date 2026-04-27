import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, FileText, Receipt, Users, Clock, HelpCircle, Calendar as CalendarIcon } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';
import '../styles/OverviewPage.css';

// Lazy-loaded tab components
const OverviewTab = lazy(() => import('../components/dashboard/OverviewTab'));
const POTab = lazy(() => import('../components/dashboard/POTab'));
const QuotationTab = lazy(() => import('../components/dashboard/QuotationTab'));
const InvoiceTab = lazy(() => import('../components/dashboard/InvoiceTab'));
const BillingNoteTab = lazy(() => import('../components/dashboard/BillingNoteTab'));
const ReceiptTab = lazy(() => import('../components/dashboard/ReceiptTab'));
const CustomerTab = lazy(() => import('../components/dashboard/CustomerTab'));
const EmployeeTab = lazy(() => import('../components/dashboard/EmployeeTab'));
const CalendarTab = lazy(() => import('../components/dashboard/CalendarTab'));

const TabLoader = () => (
    <div className="tab-loading">
        <div className="loading-spinner"></div>
        กำลังโหลด...
    </div>
);

const TABS = [
    { id: 'overview', label: 'ภาพรวม', icon: LayoutDashboard, module: 'overview', action: 'view' },
    { id: 'po', label: 'ใบสั่งซื้อ', icon: ShoppingCart, module: 'purchase_orders', action: 'view' },
    { id: 'quotation', label: 'ใบเสนอราคา', icon: FileText, module: 'invoices', action: 'view' },
    { id: 'invoice', label: 'ใบกำกับภาษี', icon: FileText, module: 'invoices', action: 'view' },
    { id: 'billing', label: 'ใบวางบิล', icon: FileText, module: 'billing', action: 'view' },
    { id: 'receipt', label: 'ใบเสร็จ', icon: Receipt, module: 'billing', action: 'view' },
    { id: 'customer', label: 'ลูกค้า', icon: Users, module: 'customers', action: 'view' },
    { id: 'employee', label: 'พนักงาน', icon: Clock, module: 'employees', action: 'view' },
    { id: 'calendar', label: 'ปฏิทินงาน', icon: CalendarIcon, module: 'purchase_orders', action: 'view' },
];

const OverviewPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { hasPermission } = usePermissions();

    // Filter tabs by permission
    const visibleTabs = TABS.filter(tab => hasPermission(tab.module, tab.action));

    // Get active tab from URL or default to first visible tab
    const tabParam = searchParams.get('tab');
    const activeTab = visibleTabs.find(t => t.id === tabParam)?.id || visibleTabs[0]?.id || 'overview';

    const handleTabChange = (tabId) => {
        setSearchParams({ tab: tabId });
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview': return <OverviewTab />;
            case 'po': return <POTab />;
            case 'quotation': return <QuotationTab />;
            case 'invoice': return <InvoiceTab />;
            case 'billing': return <BillingNoteTab />;
            case 'receipt': return <ReceiptTab />;
            case 'customer': return <CustomerTab />;
            case 'employee': return <EmployeeTab />;
            case 'calendar': return <CalendarTab />;
            default: return <OverviewTab />;
        }
    };

    return (
        <div className="overview-container">
            <PageHeader
                title="ภาพรวมระบบ (Dashboard)"
                helpContent={HELP_CONTENT.overview}
            >
                <div className="status-badge live">
                    <span className="pulse-dot"></span>
                    ข้อมูลอัพเดทล่าสุด
                </div>
            </PageHeader>

            {/* Tab Bar */}
            <div className="dashboard-tab-bar">
                <div className="dashboard-tab-scroll">
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                className={`dashboard-tab ${isActive ? 'active' : ''}`}
                                onClick={() => handleTabChange(tab.id)}
                            >
                                <Icon size={16} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <Suspense fallback={<TabLoader />}>
                {renderTabContent()}
            </Suspense>
        </div>
    );
};

export default OverviewPage;
