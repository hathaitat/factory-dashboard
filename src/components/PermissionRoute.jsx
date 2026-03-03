import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

const PermissionRoute = ({ module, action = 'view', fallbackModule }) => {
    const { hasPermission, user } = usePermissions();

    // Check primary module, then fallback if provided
    const allowed = hasPermission(module, action) ||
        (fallbackModule && hasPermission(fallbackModule, action));

    if (!allowed) {
        // If they don't have permission for the requested module

        // If it was the overview (main dashboard) that was denied, 
        // find another module they DO have permission for
        if (module === 'overview') {
            const modules = ['customers', 'invoices', 'billing', 'employees', 'company', 'users', 'production'];
            const firstAllowed = modules.find(m => hasPermission(m, 'view'));

            if (firstAllowed) {
                // Map internal module IDs to route paths if they differ
                const routeMap = {
                    'customers': '/dashboard/customers',
                    'invoices': '/dashboard/invoices',
                    'billing': '/dashboard/billing-notes',
                    'employees': '/dashboard/employees?mode=info',
                    'company': '/dashboard/company-info',
                    'users': '/dashboard/users',
                    'production': '/dashboard/production'
                };
                return <Navigate to={routeMap[firstAllowed]} replace />;
            }

            // If absolutely no permissions, go to settings if allowed or logout
            if (hasPermission('settings', 'view')) {
                return <Navigate to="/dashboard/settings" replace />;
            }
        }

        // Default fallback: Redirect to dashboard overview 
        // (which might trigger the logic above if they hit it)
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};
export default PermissionRoute;
