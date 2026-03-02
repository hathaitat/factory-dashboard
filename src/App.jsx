import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import CustomerListPage from './pages/CustomerListPage';
import CustomerCreatePage from './pages/CustomerCreatePage';
import CustomerEditPage from './pages/CustomerEditPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import CompanyInfoPage from './pages/CompanyInfoPage';
import UserListPage from './pages/UserListPage';
import UserFormPage from './pages/UserFormPage';
import InvoiceListPage from './pages/InvoiceListPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import InvoiceFormPage from './pages/InvoiceFormPage';
import InvoicePrintTemplate from './components/InvoicePrintTemplate';
import BillingNoteListPage from './pages/BillingNoteListPage';
import BillingNoteFormPage from './pages/BillingNoteFormPage';
import BillingNoteDetailPage from './pages/BillingNoteDetailPage';
import BillingNotePrintTemplate from './components/BillingNotePrintTemplate';
import ReceiptListPage from './pages/ReceiptListPage';
import ReceiptDetailPage from './pages/ReceiptDetailPage';
import ReceiptPrintTemplate from './components/ReceiptPrintTemplate';
import EmployeeListPage from './pages/EmployeeListPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import EmployeeDashboardPage from './pages/EmployeeDashboardPage';
import SettingsPage from './pages/SettingsPage';

import { AuthProvider } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';

function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardLayout />}>
                {/* Settings and Overview are general access */}
                <Route index element={<OverviewPage />} />
                <Route path="settings" element={<SettingsPage />} />

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

              {/* Print Routes (Protected) */}
              <Route path="/dashboard/invoices/:id/print" element={<InvoicePrintTemplate />} />
              <Route path="/dashboard/billing-notes/:id/print" element={<BillingNotePrintTemplate />} />
              <Route path="/dashboard/billing-notes/:id/print-receipt" element={<ReceiptPrintTemplate />} />
            </Route>

          </Routes>
        </Router>
      </DialogProvider>
    </AuthProvider>
  );
}

export default App;
