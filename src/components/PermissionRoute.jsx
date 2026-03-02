import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

const PermissionRoute = ({ module, action = 'view' }) => {
    const { hasPermission } = usePermissions();

    if (!hasPermission(module, action)) {
        // If user doesn't have permission, redirect to dashboard overview
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default PermissionRoute;
