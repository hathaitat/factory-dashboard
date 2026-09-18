import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

const PermissionRoute = ({ module, action = 'view', fallbackModule }) => {
    const { hasPermission } = usePermissions();
    const location = useLocation();

    // Check primary module, then fallback if provided
    const allowed = hasPermission(module, action) ||
        (fallbackModule && hasPermission(fallbackModule, action));

    if (!allowed) {
        // If they don't have permission for the requested module
        if (location.pathname === '/dashboard') {
            const modules = [
                'customers', 'invoices', 'billing', 'employees', 'company', 
                'users', 'production', 'quotations', 'suppliers', 
                'supplier_pos', 'internal_items', 'internal_requisitions', 
                'warehouses', 'payroll', 'certificates'
            ];
            const firstAllowed = modules.find(m => hasPermission(m, 'view'));

            if (firstAllowed) {
                const routeMap = {
                    'employees': '/dashboard/employees?mode=info',
                    'billing': '/dashboard/billing-notes'
                };
                const target = routeMap[firstAllowed] || `/dashboard/${firstAllowed.replace(/_/g, '-')}`;
                return <Navigate to={target} replace />;
            }
            // If absolutely no permissions, go to settings if allowed
            if (hasPermission('settings', 'view')) {
                return <Navigate to="/dashboard/settings" replace />;
            }
            return <Navigate to="/login" replace />;
        }

        // For any other route, send them to dashboard which will re-route them
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default PermissionRoute;
