import { userService } from '../services/userService';

export const usePermissions = () => {
    const user = userService.getCurrentUser();

    // Check if user has specific permission
    const hasPermission = (module, action) => {
        // If no user, deny
        if (!user) return false;

        // Let's assume users with full_name 'administrator' or some master role
        // gets all access (if applicable). Currently relying strictly on JSON permissions.
        // Default behavior: If 'overview' permission is missing entirely, allow access 
        // to avoid locking out existing users until an admin updates them.
        if (module === 'overview' && !user.permissions?.[module]) {
            return true;
        }

        return user.permissions?.[module]?.[action] === true;
    };

    return { hasPermission, user };
};
