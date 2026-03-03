import { createContext, useContext } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Note: This app uses custom auth via userService (not Supabase Auth).
// This context is kept as a lightweight wrapper in case we migrate to
// Supabase Auth in the future.
export const AuthProvider = ({ children }) => {
    const value = {};

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
