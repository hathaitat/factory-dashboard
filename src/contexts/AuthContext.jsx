import { createContext, useContext, useState, useCallback } from 'react';
import { userService } from '../services/userService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => userService.getCurrentUser());

    const syncUser = useCallback(() => {
        setUser(userService.getCurrentUser());
    }, []);

    const login = async (email, password) => {
        const result = await userService.login(email, password);
        if (result.success) syncUser();
        return result;
    };

    const logout = () => {
        userService.logout();
        syncUser();
    };

    return (
        <AuthContext.Provider value={{ user, syncUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
