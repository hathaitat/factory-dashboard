import { supabase } from './supabaseClient';
import { sanitizeSearchTerm } from './sanitize';

const _mapCustomer = (customer) => ({
    id: customer.id,
    code: customer.code,
    name: customer.name,
    taxId: customer.tax_id,
    creditTerm: customer.credit_term,
    contactPerson: customer.contact_person,
    email: customer.email,
    phone: customer.phone,
    fax: customer.fax,
    address: customer.address,
    branch: customer.branch,
    status: customer.status,
    poNote: customer.po_note,
    invoiceNote: customer.invoice_note,
    billingNoteNote: customer.billing_note_note,
    receiptNote: customer.receipt_note,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
    createdBy: customer.created_by,
    updatedBy: customer.updated_by
});

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
      return data.map(_mapCustomer);
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  },

  // Get paginated customers (Server-Side)
  getCustomersPaginated: async ({ page = 1, limit = 50, searchTerm = '', dateFrom = '', dateTo = '', status = '' }) => {
    try {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' });

      // Search filter
      if (searchTerm) {
        const safe = sanitizeSearchTerm(searchTerm);
        if (safe) query = query.or(`code.ilike.%${safe}%,name.ilike.%${safe}%,tax_id.ilike.%${safe}%,contact_person.ilike.%${safe}%`);
    }

      if (status) {
        query = query.eq('status', status);
      }

      // Date filters (created_at)
      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00Z`);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59Z`);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        data: data.map(_mapCustomer),
        total: count
      };
    } catch (error) {
      console.error('Error in getCustomersPaginated:', error);
      return { data: [], total: 0, error };
    }
  },

  // Export customers (ignores pagination limit)
  exportCustomers: async ({ searchTerm = '', dateFrom = '', dateTo = '', status = '' }) => {
    try {
      let query = supabase
        .from('customers')
        .select('*');

      if (searchTerm) {
        const safe = sanitizeSearchTerm(searchTerm);
        if (safe) query = query.or(`code.ilike.%${safe}%,name.ilike.%${safe}%,tax_id.ilike.%${safe}%,contact_person.ilike.%${safe}%`);
    }

      if (status) {
        query = query.eq('status', status);
      }

      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00Z`);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59Z`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(_mapCustomer);
    } catch (error) {
      console.error('Error in exportCustomers:', error);
      throw error;
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
        poNote: data.po_note,
        invoiceNote: data.invoice_note,
        billingNoteNote: data.billing_note_note,
        receiptNote: data.receipt_note,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by,
        updatedBy: data.updated_by
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
        fax: customerData.fax || '',
        address: customerData.address,
        branch: customerData.branch || '',
        status: customerData.status || 'Active',
        po_note: customerData.poNote || '',
        invoice_note: customerData.invoiceNote || '',
        billing_note_note: customerData.billingNoteNote || '',
        receipt_note: customerData.receiptNote || '',
        created_by: customerData.createdBy || null,
        updated_by: customerData.updatedBy || null
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
        fax: customerData.fax,
        address: customerData.address,
        branch: customerData.branch,
        status: customerData.status,
        po_note: customerData.poNote,
        invoice_note: customerData.invoiceNote,
        billing_note_note: customerData.billingNoteNote,
        receipt_note: customerData.receiptNote,
        updated_at: new Date().toISOString(),
        updated_by: customerData.updatedBy || null
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
