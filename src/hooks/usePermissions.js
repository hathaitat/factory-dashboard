import { userService } from '../services/userService';

export const usePermissions = () => {
    const user = userService.getCurrentUser();

    // Check if user has specific permission
    const hasPermission = (module, action, fallback = false) => {
        // If no user, deny
        if (!user) return false;

        if (module === 'overview' && !user.permissions?.[module]) {
            return true;
        }

        const perm = user.permissions?.[module]?.[action];
        if (perm === undefined) {
            return fallback;
        }

        return perm === true;
    };

    return { hasPermission, user };
};
