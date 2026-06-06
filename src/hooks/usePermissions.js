import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
    const { user } = useAuth();

    // Check if user has specific permission
    const hasPermission = (module, action, fallback = false) => {
        // If no user, deny
        if (!user) return false;

        const perm = user.permissions?.[module]?.[action];
        if (perm === undefined) {
            return fallback;
        }

        return perm === true;
    };

    return { hasPermission, user };
};
