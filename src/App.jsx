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
const CompanyInfoPage = React.lazy(() => import('./pages/CompanyInfoPage'));
const UserListPage = React.lazy(() => import('./pages/UserListPage'));
const UserFormPage = React.lazy(() => import('./pages/UserFormPage'));
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

// Loading fallback component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6b7280' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}></div>
      <p>กำลังโหลด...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

                    {/* Purchase Orders Module */}
                    <Route element={<PermissionRoute module="purchase_orders" action="view" fallbackModule="invoices" />}>
                      <Route path="purchase-orders" element={<PurchaseOrderListPage />} />
                      <Route path="purchase-orders/new" element={<PurchaseOrderFormPage />} />
                      <Route path="purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />
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
                      <Route path="production" element={<div style={{ padding: '2rem' }}><h2>ข้อมูลการผลิต (เร็วๆ นี้)</h2></div>} />
                    </Route>
                  </Route>

                  {/* Print Routes (Protected + Permission Check) */}
                  <Route element={<PermissionRoute module="invoices" action="view" />}>
                    <Route path="/dashboard/invoices/:id/print" element={<InvoicePrintTemplate />} />
                  </Route>
                  <Route element={<PermissionRoute module="billing" action="view" />}>
                    <Route path="/dashboard/billing-notes/:id/print" element={<BillingNotePrintTemplate />} />
                    <Route path="/dashboard/billing-notes/:id/print-receipt" element={<ReceiptPrintTemplate />} />
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
