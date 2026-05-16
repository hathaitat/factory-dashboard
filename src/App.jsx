import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded pages (Code Splitting — reduces initial bundle from ~1.2MB to ~300KB)
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardLayout = React.lazy(() => import('./layouts/DashboardLayout'));
const OverviewPage = React.lazy(() => import('./pages/OverviewPage'));
const CustomerListPage = React.lazy(() => import('./pages/CustomerListPage'));
const CustomerCreatePage = React.lazy(() => import('./pages/CustomerCreatePage'));
const CustomerEditPage = React.lazy(() => import('./pages/CustomerEditPage'));
const CustomerDetailPage = React.lazy(() => import('./pages/CustomerDetailPage'));
const CustomerProductHistoryPrint = React.lazy(() => import('./pages/CustomerProductHistoryPrint'));
const CompanyInfoPage = React.lazy(() => import('./pages/CompanyInfoPage'));
const UserListPage = React.lazy(() => import('./pages/UserListPage'));
const UserFormPage = React.lazy(() => import('./pages/UserFormPage'));
const CertificateListPage = React.lazy(() => import('./pages/CertificateListPage'));
const CertificateFormPage = React.lazy(() => import('./pages/CertificateFormPage'));
const InvoiceListPage = React.lazy(() => import('./pages/InvoiceListPage'));
const InvoiceDetailPage = React.lazy(() => import('./pages/InvoiceDetailPage'));
const InvoiceFormPage = React.lazy(() => import('./pages/InvoiceFormPage'));
const InvoicePrintTemplate = React.lazy(() => import('./components/InvoicePrintTemplate'));
const BillingNoteListPage = React.lazy(() => import('./pages/BillingNoteListPage'));
const BillingNoteFormPage = React.lazy(() => import('./pages/BillingNoteFormPage'));
const BillingNoteDetailPage = React.lazy(() => import('./pages/BillingNoteDetailPage'));
const BillingNotePrintTemplate = React.lazy(() => import('./components/BillingNotePrintTemplate'));
const ReceiptListPage = React.lazy(() => import('./pages/ReceiptListPage'));
const ReceiptDetailPage = React.lazy(() => import('./pages/ReceiptDetailPage'));
const ReceiptPrintTemplate = React.lazy(() => import('./components/ReceiptPrintTemplate'));
const EmployeeListPage = React.lazy(() => import('./pages/EmployeeListPage'));
const EmployeeFormPage = React.lazy(() => import('./pages/EmployeeFormPage'));
const EmployeeDashboardPage = React.lazy(() => import('./pages/EmployeeDashboardPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const PurchaseOrderListPage = React.lazy(() => import('./pages/PurchaseOrderListPage'));
const PurchaseOrderFormPage = React.lazy(() => import('./pages/PurchaseOrderFormPage'));
const QuotationListPage = React.lazy(() => import('./pages/QuotationListPage'));
const QuotationFormPage = React.lazy(() => import('./pages/QuotationFormPage'));
const QuotationPrintTemplate = React.lazy(() => import('./components/QuotationPrintTemplate'));
const GuidePage = React.lazy(() => import('./pages/GuidePage'));
const SupplierListPage = React.lazy(() => import('./pages/SupplierListPage'));
const SupplierCreatePage = React.lazy(() => import('./pages/SupplierCreatePage'));
const SupplierEditPage = React.lazy(() => import('./pages/SupplierEditPage'));
const SupplierDetailPage = React.lazy(() => import('./pages/SupplierDetailPage'));
const SupplierPoListPage = React.lazy(() => import('./pages/SupplierPoListPage'));
const SupplierPoFormPage = React.lazy(() => import('./pages/SupplierPoFormPage'));
const SupplierPoDetailPage = React.lazy(() => import('./pages/SupplierPoDetailPage'));
const SupplierPoPrintPage = React.lazy(() => import('./pages/SupplierPoPrintPage'));
const WarehouseListPage = React.lazy(() => import('./pages/WarehouseListPage'));
const WarehouseDetailPage = React.lazy(() => import('./pages/WarehouseDetailPage'));
const InventoryHistoryPage = React.lazy(() => import('./pages/InventoryHistoryPage'));
const InternalItemListPage = React.lazy(() => import('./pages/InternalItemListPage'));
const InternalRequisitionListPage = React.lazy(() => import('./pages/InternalRequisitionListPage'));
const InternalRequisitionFormPage = React.lazy(() => import('./pages/InternalRequisitionFormPage'));
const InternalRequisitionDetailPage = React.lazy(() => import('./pages/InternalRequisitionDetailPage'));
// Loading fallback component
const PageLoader = () => (
  <div className="flex justify-center items-center h-screen text-textMuted bg-main">
    <div className="text-center">
      <div className="loading-spinner mx-auto mb-3 w-10 h-10"></div>
      <p className="font-medium">กำลังโหลด...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DialogProvider>
          <Router>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route element={<PermissionRoute module="overview" action="view" />}>
                      <Route index element={<OverviewPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="settings" action="view" />}>
                      <Route path="settings" element={<SettingsPage />} />
                    </Route>

                    {/* Customers Module */}
                    <Route element={<PermissionRoute module="customers" action="view" />}>
                      <Route path="customers" element={<CustomerListPage />} />
                      <Route path="customers/:id" element={<CustomerDetailPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="customers" action="create" />}>
                      <Route path="customers/new" element={<CustomerCreatePage />} />
                    </Route>
                    <Route element={<PermissionRoute module="customers" action="edit" />}>
                      <Route path="customers/:id/edit" element={<CustomerEditPage />} />
                    </Route>

                    {/* Suppliers Module */}
                    <Route element={<PermissionRoute module="suppliers" action="view" />}>
                      <Route path="suppliers" element={<SupplierListPage />} />
                      <Route path="suppliers/:id" element={<SupplierDetailPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="suppliers" action="create" />}>
                      <Route path="suppliers/new" element={<SupplierCreatePage />} />
                    </Route>
                    <Route element={<PermissionRoute module="suppliers" action="edit" />}>
                      <Route path="suppliers/:id/edit" element={<SupplierEditPage />} />
                    </Route>

                    {/* Supplier POs */}
                    <Route element={<PermissionRoute module="supplier_pos" action="create" />}>
                      <Route path="supplier-pos/create" element={<SupplierPoFormPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="supplier_pos" action="view" />}>
                      <Route path="supplier-pos" element={<SupplierPoListPage />} />
                      <Route path="supplier-pos/:id" element={<SupplierPoDetailPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="supplier_pos" action="edit" />}>
                      <Route path="supplier-pos/:id/edit" element={<SupplierPoFormPage />} />
                    </Route>

                    {/* Warehouse Module */}
                    <Route element={<PermissionRoute module="warehouses" action="view" />}>
                      <Route path="warehouses" element={<WarehouseListPage />} />
                      <Route path="warehouses/:id" element={<WarehouseDetailPage />} />
                      <Route path="inventory/:id" element={<InventoryHistoryPage />} />
                    </Route>

                    {/* Internal Items & Requisitions Module */}
                    <Route element={<PermissionRoute module="internal_items" action="view" />}>
                      <Route path="internal-items" element={<InternalItemListPage />} />
                      <Route path="internal-requisitions" element={<InternalRequisitionListPage />} />
                      <Route path="internal-requisitions/:id" element={<InternalRequisitionDetailPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="internal_items" action="create" />}>
                      <Route path="internal-requisitions/new" element={<InternalRequisitionFormPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="internal_items" action="edit" />}>
                      <Route path="internal-requisitions/:id/edit" element={<InternalRequisitionFormPage />} />
                    </Route>

                    {/* Certificates Module */}
                    <Route element={<PermissionRoute module="certificates" action="view" />}>
                      <Route path="certificates" element={<CertificateListPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="certificates" action="create" />}>
                      <Route path="certificates/new" element={<CertificateFormPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="certificates" action="edit" />}>
                      <Route path="certificates/:id/edit" element={<CertificateFormPage />} />
                    </Route>

                    {/* Purchase Orders Module */}
                    <Route element={<PermissionRoute module="purchase_orders" action="view" />}>
                      <Route path="purchase-orders" element={<PurchaseOrderListPage />} />
                      <Route path="purchase-orders/new" element={<PurchaseOrderFormPage />} />
                      <Route path="purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />
                    </Route>

                    {/* Quotations Module */}
                    <Route element={<PermissionRoute module="quotations" action="view" />}>
                      <Route path="quotations" element={<QuotationListPage />} />
                      <Route path="quotations/:id" element={<QuotationFormPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="quotations" action="create" />}>
                      <Route path="quotations/new" element={<QuotationFormPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="quotations" action="edit" />}>
                      <Route path="quotations/:id/edit" element={<QuotationFormPage />} />
                    </Route>

                    {/* Invoices Module */}
                    <Route element={<PermissionRoute module="invoices" action="view" />}>
                      <Route path="invoices" element={<InvoiceListPage />} />
                      <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="invoices" action="create" />}>
                      <Route path="invoices/new" element={<InvoiceFormPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="invoices" action="edit" />}>
                      <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
                    </Route>

                    {/* Billing Notes Module */}
                    <Route element={<PermissionRoute module="billing" action="view" />}>
                      <Route path="billing-notes" element={<BillingNoteListPage />} />
                      <Route path="billing-notes/:id" element={<BillingNoteDetailPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="billing" action="create" />}>
                      <Route path="billing-notes/new" element={<BillingNoteFormPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="billing" action="edit" />}>
                      <Route path="billing-notes/:id/edit" element={<BillingNoteFormPage />} />
                    </Route>

                    {/* Receipts Module (Derived from Billing Notes, hence using billing view permission) */}
                    <Route element={<PermissionRoute module="billing" action="view" />}>
                      <Route path="receipts" element={<ReceiptListPage />} />
                      <Route path="receipts/:id" element={<ReceiptDetailPage />} />
                    </Route>

                    {/* Users/Permissions Module */}
                    <Route element={<PermissionRoute module="users" action="view" />}>
                      <Route path="users" element={<UserListPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="users" action="create" />}>
                      <Route path="users/new" element={<UserFormPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="users" action="edit" />}>
                      <Route path="users/:id/edit" element={<UserFormPage />} />
                    </Route>

                    {/* Company Info Module */}
                    <Route element={<PermissionRoute module="company" action="view" />}>
                      <Route path="company-info" element={<CompanyInfoPage />} />
                    </Route>

                    {/* Employee Management Module */}
                    <Route element={<PermissionRoute module="employees" action="view" />}>
                      <Route path="employees" element={<EmployeeListPage />} />
                      <Route path="employees/dashboard" element={<EmployeeDashboardPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="employees" action="create" />}>
                      <Route path="employees/new" element={<EmployeeFormPage />} />
                    </Route>
                    <Route element={<PermissionRoute module="employees" action="edit" />}>
                      <Route path="employees/:id/edit" element={<EmployeeFormPage />} />
                    </Route>

                    {/* Production Module */}
                    <Route element={<PermissionRoute module="production" action="view" />}>
                      <Route path="production" element={<div className="p-8"><h2>ข้อมูลการผลิต (เร็วๆ นี้)</h2></div>} />
                    </Route>
                    <Route element={<PermissionRoute module="overview" action="view" />}>
                      <Route path="guide" element={<GuidePage />} />
                    </Route>
                  </Route>

                  {/* Print Routes (Protected + Permission Check) */}
                  <Route element={<PermissionRoute module="invoices" action="view" />}>
                    <Route path="/dashboard/invoices/:id/print" element={<InvoicePrintTemplate />} />
                  </Route>
                  <Route element={<PermissionRoute module="quotations" action="view" />}>
                    <Route path="/dashboard/quotations/:id/print" element={<QuotationPrintTemplate />} />
                  </Route>
                  <Route element={<PermissionRoute module="billing" action="view" />}>
                    <Route path="/dashboard/billing-notes/:id/print" element={<BillingNotePrintTemplate />} />
                    <Route path="/dashboard/billing-notes/:id/print-receipt" element={<ReceiptPrintTemplate />} />
                  </Route>
                  <Route element={<PermissionRoute module="supplier_pos" action="view" />}>
                    <Route path="/dashboard/supplier-pos/:id/print" element={<SupplierPoPrintPage />} />
                  </Route>
                  <Route element={<PermissionRoute module="customers" action="view" />}>
                    <Route path="/dashboard/customers/:id/print-product-history" element={<CustomerProductHistoryPrint />} />
                  </Route>
                </Route>

              </Routes>
            </Suspense>
          </Router>
        </DialogProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
