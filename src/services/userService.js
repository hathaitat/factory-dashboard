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

    // Login logic (Verify Hash)
    login: async (username, password) => {
        try {
            // 1. Fetch user by username
            const { data, error } = await supabase
                .from('staff_members')
                .select('*')
                .eq('username', username)
                .single();

            if (error || !data) {
                return { success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' };
            }

            // 2. Compare password with hash
            const isMatch = await bcrypt.compare(password, data.password);

            if (!isMatch) {
                return { success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' };
            }

            const userData = {
                id: data.id,
                fullName: data.full_name,
                email: data.email,
                username: data.username,
                permissions: data.permissions || {}
            };

            // Session persistence
            const sessionData = {
                user: userData,
                loginTime: new Date().getTime()
            };
            localStorage.setItem('currentUser', JSON.stringify(sessionData));

            return { success: true, user: userData };
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
