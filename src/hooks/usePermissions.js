import { userService } from '../services/userService';

export const usePermissions = () => {
    const user = userService.getCurrentUser();

    // Check if user has specific permission
    const hasPermission = (module, action) => {
        // If no user, deny
        if (!user) return false;

        // Let's assume users with full_name 'administrator' or some master role
        // gets all access (if applicable). Currently relying strictly on JSON permissions.
        return user.permissions?.[module]?.[action] === true;
    };

    return { hasPermission, user };
};
