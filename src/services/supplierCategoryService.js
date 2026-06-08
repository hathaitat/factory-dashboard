import { settingService } from './settingService';

const SETTING_KEY = 'supplier_categories';

export const supplierCategoryService = {
    getCategories: async () => {
        try {
            const data = await settingService.getSetting(SETTING_KEY);
            // data is the JSON value: { categories: [{id, name}, ...] }
            if (data && Array.isArray(data.categories)) {
                return data.categories.sort((a, b) => a.name.localeCompare(b.name));
            }
            return [];
        } catch (error) {
            console.error('Error fetching supplier categories:', error);
            return [];
        }
    },

    createCategory: async (name) => {
        try {
            const data = await settingService.getSetting(SETTING_KEY);
            const categories = (data && Array.isArray(data.categories)) ? data.categories : [];
            
            // Check for duplicate
            if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                throw new Error('ประเภทนี้มีอยู่ในรายการแล้ว');
            }

            // Generate a simple incremental ID
            const maxId = categories.reduce((max, c) => Math.max(max, c.id || 0), 0);
            const newCat = { id: maxId + 1, name, created_at: new Date().toISOString() };
            categories.push(newCat);

            await settingService.saveSetting(SETTING_KEY, { categories }, 'Supplier Categories');
            return newCat;
        } catch (error) {
            console.error('Error creating supplier category:', error);
            throw error;
        }
    },

    deleteCategory: async (id) => {
        try {
            const data = await settingService.getSetting(SETTING_KEY);
            const categories = (data && Array.isArray(data.categories)) ? data.categories : [];
            
            const filtered = categories.filter(c => c.id !== id);
            await settingService.saveSetting(SETTING_KEY, { categories: filtered }, 'Supplier Categories');
            return true;
        } catch (error) {
            console.error('Error deleting supplier category:', error);
            throw error;
        }
    }
};
