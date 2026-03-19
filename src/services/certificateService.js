import { supabase } from './supabaseClient';

export const certificateService = {
  // Upload a file to the certificates bucket
  uploadFile: async (file) => {
    try {
      if (!file) return null;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('certificates')
        .upload(filePath, file);

      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      return {
        path: data.path,
        url: publicUrlData.publicUrl
      };
    } catch (error) {
      console.error('Error uploading certificate file:', error);
      throw error;
    }
  },

  // Delete a file from the bucket
  deleteFile: async (filePath) => {
    try {
      if (!filePath) return true;
      const { error } = await supabase.storage
        .from('certificates')
        .remove([filePath]);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting certificate file:', error);
      return false;
    }
  },

  // Get all certificates with relations
  getCertificates: async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          certificate_products ( product_id, customer_products (name) ),
          certificate_customers ( customer_id, customers (name) )
        `)
        .order('expiry_date', { ascending: true });
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching certificates:', error);
      return [];
    }
  },

  // Get expiring certificates (expiring in the next X days or already expired)
  getExpiringCertificates: async (days = 30) => {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateString = targetDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          certificate_products ( product_id, customer_products (name) ),
          certificate_customers ( customer_id, customers (name) )
        `)
        .lte('expiry_date', targetDateString)
        .order('expiry_date', { ascending: true });
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching expiring certificates:', error);
      return [];
    }
  },

  // Get a specific certificate by id
  getCertificateById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          certificate_products ( product_id ),
          certificate_customers ( customer_id )
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching certificate by id:', error);
      return null;
    }
  },

  // Create a new certificate and its relations
  createCertificate: async (certData, productIds = [], customerIds = []) => {
    try {
      // 1. Insert the main certificate
      const { data: cert, error: certError } = await supabase
        .from('certificates')
        .insert([{
          name: certData.name,
          file_path: certData.file_path,
          file_url: certData.file_url,
          issue_date: certData.issue_date || null,
          expiry_date: certData.expiry_date || null,
          status: certData.status || 'Active'
        }])
        .select()
        .single();

      if (certError) throw certError;

      // 2. Insert product relations
      if (productIds.length > 0) {
        const productRelations = productIds.map(pid => ({
          certificate_id: cert.id,
          product_id: pid
        }));
        const { error: prodError } = await supabase
          .from('certificate_products')
          .insert(productRelations);
        if (prodError) console.error('Error linking products:', prodError);
      }

      // 3. Insert customer relations
      if (customerIds.length > 0) {
        const customerRelations = customerIds.map(cid => ({
          certificate_id: cert.id,
          customer_id: cid
        }));
        const { error: custError } = await supabase
          .from('certificate_customers')
          .insert(customerRelations);
        if (custError) console.error('Error linking customers:', custError);
      }

      return cert;
    } catch (error) {
      console.error('Error creating certificate:', error);
      throw error;
    }
  },

  // Update a certificate and its relations
  updateCertificate: async (id, certData, productIds = [], customerIds = []) => {
    try {
      // 1. Update the main certificate
      const { data: cert, error: certError } = await supabase
        .from('certificates')
        .update({
          name: certData.name,
          file_path: certData.file_path,
          file_url: certData.file_url,
          issue_date: certData.issue_date || null,
          expiry_date: certData.expiry_date || null,
          status: certData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (certError) throw certError;

      // 2. Update product relations (delete old, insert new)
      await supabase.from('certificate_products').delete().eq('certificate_id', id);
      if (productIds.length > 0) {
        const productRelations = productIds.map(pid => ({
          certificate_id: id,
          product_id: pid
        }));
        await supabase.from('certificate_products').insert(productRelations);
      }

      // 3. Update customer relations (delete old, insert new)
      await supabase.from('certificate_customers').delete().eq('certificate_id', id);
      if (customerIds.length > 0) {
        const customerRelations = customerIds.map(cid => ({
          certificate_id: id,
          customer_id: cid
        }));
        await supabase.from('certificate_customers').insert(customerRelations);
      }

      return cert;
    } catch (error) {
      console.error('Error updating certificate:', error);
      throw error;
    }
  },

  // Delete a certificate
  deleteCertificate: async (id, filePath = null) => {
    try {
      // The junction tables have ON DELETE CASCADE, so we only need to delete the certificate
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Delete the file from storage if path provided
      if (filePath) {
        await certificateService.deleteFile(filePath);
      }

      return true;
    } catch (error) {
      console.error('Error deleting certificate:', error);
      return false;
    }
  }
};
