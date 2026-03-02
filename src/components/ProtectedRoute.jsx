import { Navigate, Outlet } from 'react-router-dom';
import { userService } from '../services/userService';

const ProtectedRoute = () => {
    const user = userService.getCurrentUser();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
