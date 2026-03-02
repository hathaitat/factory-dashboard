import { supabase } from './supabaseClient';

export const customerService = {
  // Get all customers
  getCustomers: async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform snake_case to camelCase
      return data.map(customer => ({
        id: customer.id,
        code: customer.code,
        name: customer.name,
        taxId: customer.tax_id,
        creditTerm: customer.credit_term,
        contactPerson: customer.contact_person,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        branch: customer.branch,
        status: customer.status,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at
      }));
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  },

  // Get customer by ID
  getCustomerById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        code: data.code,
        name: data.name,
        taxId: data.tax_id,
        creditTerm: data.credit_term,
        contactPerson: data.contact_person,
        email: data.email,
        phone: data.phone,
        fax: data.fax,
        address: data.address,
        branch: data.branch,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error fetching customer:', error);
      return null;
    }
  },

  createCustomer: async (customerData) => {
    try {
      const dbData = {
        code: customerData.code,
        name: customerData.name,
        tax_id: customerData.taxId,
        credit_term: customerData.creditTerm,
        contact_person: customerData.contactPerson,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        branch: customerData.branch || 'สำนักงานใหญ่',
        status: customerData.status || 'Active'
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },

  // Update customer
  updateCustomer: async (id, customerData) => {
    try {
      const dbData = {
        code: customerData.code,
        name: customerData.name,
        tax_id: customerData.taxId,
        credit_term: customerData.creditTerm,
        contact_person: customerData.contactPerson,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        branch: customerData.branch,
        status: customerData.status,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('customers')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  // Delete customer
  deleteCustomer: async (id) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  }
};
