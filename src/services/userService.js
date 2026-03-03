import { supabase } from './supabaseClient';
import bcrypt from 'bcryptjs';

export const userService = {
    // Get all users (Exclude password from return)
    getUsers: async () => {
        try {
            const { data, error } = await supabase
                .from('staff_members')
                .select('id, full_name, email, username, permissions, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(user => ({
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                username: user.username,
                createdAt: user.created_at,
                // Password is intentionally omitted for security
            }));
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    },

    // Get user by ID
    getUserById: async (id) => {
        try {
            const { data, error } = await supabase
                .from('staff_members')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return {
                id: data.id,
                fullName: data.full_name,
                email: data.email,
                username: data.username,
                permissions: data.permissions || {},
                createdAt: data.created_at,
                // Password omitted
            };
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    },

    // Create new user (Hash Password)
    createUser: async (userData) => {
        try {
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            const dbData = {
                full_name: userData.fullName,
                email: userData.email,
                username: userData.username,
                password: hashedPassword,
                permissions: userData.permissions
            };

            const { data, error } = await supabase
                .from('staff_members')
                .insert([dbData])
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    // Update user (Hash Password if provided)
    updateUser: async (id, userData) => {
        try {
            const dbData = {
                full_name: userData.fullName,
                email: userData.email,
                username: userData.username,
                permissions: userData.permissions
            };

            // Only update password if a new one is provided
            if (userData.password) {
                dbData.password = await bcrypt.hash(userData.password, 10);
            }

            const { data, error } = await supabase
                .from('staff_members')
                .update(dbData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    // Delete user
    deleteUser: async (id) => {
        try {
            const { error } = await supabase
                .from('staff_members')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            return false;
        }
    },

    // Login logic — Server-side verification via RPC (Fix #2, #3, #5)
    // Falls back to client-side bcrypt if RPC is not yet available
    login: async (username, password) => {
        try {
            // Try server-side RPC first (preferred, secure method)
            const { data, error } = await supabase.rpc('verify_login', {
                p_username: username,
                p_password: password
            });

            if (!error && data) {
                if (data.success) {
                    const userData = data.user;
                    const sessionData = {
                        user: userData,
                        loginTime: new Date().getTime()
                    };
                    localStorage.setItem('currentUser', JSON.stringify(sessionData));
                    return { success: true, user: userData };
                } else {
                    return {
                        success: false,
                        message: data.message,
                        remainingAttempts: data.remaining_attempts
                    };
                }
            }

            // Fallback: Client-side bcrypt (legacy, for when RPC is not deployed)
            console.warn('RPC verify_login unavailable, using fallback auth');
            const { data: userData, error: fetchError } = await supabase
                .from('staff_members')
                .select('*')
                .eq('username', username)
                .single();

            if (fetchError || !userData) {
                return { success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' };
            }

            const isMatch = await bcrypt.compare(password, userData.password);
            if (!isMatch) {
                return { success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' };
            }

            const user = {
                id: userData.id,
                fullName: userData.full_name,
                email: userData.email,
                username: userData.username,
                permissions: userData.permissions || {}
            };
            const sessionData = {
                user,
                loginTime: new Date().getTime()
            };
            localStorage.setItem('currentUser', JSON.stringify(sessionData));
            return { success: true, user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ' };
        }
    },

    getCurrentUser: () => {
        const session = localStorage.getItem('currentUser');
        if (!session) return null;

        try {
            const { user, loginTime } = JSON.parse(session);

            // Check if session is older than 6 hours
            const sessionDuration = 6 * 60 * 60 * 1000;
            const now = new Date().getTime();

            if (now - loginTime > sessionDuration) {
                userService.logout();
                return null;
            }

            return user;
        } catch (e) {
            userService.logout();
            return null;
        }
    },

    logout: () => {
        localStorage.removeItem('currentUser');
    }
};
