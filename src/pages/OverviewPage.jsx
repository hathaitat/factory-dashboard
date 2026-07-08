import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, FileText, Receipt, Users, Clock, Calendar as CalendarIcon, Truck, Package, Activity } from 'lucide-react';
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
const SupplierTab = lazy(() => import('../components/dashboard/SupplierTab'));
const SupplierPoTab = lazy(() => import('../components/dashboard/SupplierPoTab'));
const WarehouseTab = lazy(() => import('../components/dashboard/WarehouseTab'));
const InternalRequisitionTab = lazy(() => import('../components/dashboard/InternalRequisitionTab'));
const ProductionTab = lazy(() => import('../components/dashboard/ProductionTab'));

const TabLoader = () => (
    <div className="tab-loading">
        <div className="loading-spinner"></div>
        กำลังโหลด...
    </div>
);

const TABS = [
    { id: 'overview', label: 'ภาพรวม', icon: LayoutDashboard, module: 'overview', action: 'view' },
    { id: 'calendar', label: 'ปฏิทินงาน', icon: CalendarIcon, module: 'purchase_orders', action: 'view' },
    { id: 'po', label: 'ใบสั่งซื้อ', icon: ShoppingCart, module: 'purchase_orders', action: 'view' },
    { id: 'quotation', label: 'ใบเสนอราคา', icon: FileText, module: 'quotations', action: 'view' },
    { id: 'invoice', label: 'ใบกำกับภาษี', icon: FileText, module: 'invoices', action: 'view' },
    { id: 'billing', label: 'ใบวางบิล', icon: FileText, module: 'billing', action: 'view' },
    { id: 'receipt', label: 'ใบเสร็จ', icon: Receipt, module: 'billing', action: 'view' },
    { id: 'supplier_po', label: 'ใบสั่งซื้อผู้ขาย', icon: ShoppingCart, module: 'supplier_pos', action: 'view' },
    { id: 'customer', label: 'ลูกค้า', icon: Users, module: 'customers', action: 'view' },
    { id: 'supplier', label: 'ผู้ขาย', icon: Truck, module: 'suppliers', action: 'view' },
    { id: 'warehouse', label: 'คลังสินค้า', icon: Package, module: 'warehouses', action: 'view' },
    { id: 'production', label: 'การผลิต', icon: Activity, module: 'production', action: 'view' },
    { id: 'employee', label: 'พนักงาน', icon: Clock, module: 'employees', action: 'view' },
    { id: 'internal', label: 'ของใช้ในโรงงาน', icon: ShoppingCart, module: 'internal_items', action: 'view' },
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
            case 'supplier_po': return <SupplierPoTab />;
            case 'customer': return <CustomerTab />;
            case 'supplier': return <SupplierTab />;

            case 'warehouse': return <WarehouseTab />;
            case 'production': return <ProductionTab />;
            case 'employee': return <EmployeeTab />;
            case 'internal': return <InternalRequisitionTab />;
            case 'calendar': return <CalendarTab />;
            default: return <OverviewTab />;
        }
    };

    return (
        <div className="overview-container">
            <PageHeader
                title="ภาพรวมระบบ"
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
