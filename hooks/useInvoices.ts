'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Invoice, InvoiceStatus } from '@/types';

interface UseInvoicesProps {
  companyId?: string;
  status?: InvoiceStatus;
}

export function useInvoices({ companyId, status }: UseInvoicesProps = {}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (companyId) {
      fetchInvoices();
    }
  }, [companyId, status]);

  const fetchInvoices = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          items:invoice_items(*)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return false;
    }
  };

  const duplicateInvoice = async (invoice: Invoice) => {
    try {
      const { id, invoice_number, created_at, updated_at, status, ...invoiceData } = invoice;
      
      // Generate new invoice number on server
      const { data: newInvoice, error } = await supabase
        .from('invoices')
        .insert({
          ...invoiceData,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      // Duplicate items
      if (invoice.items && invoice.items.length > 0) {
        const newItems = invoice.items.map((item) => ({
          invoice_id: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        }));

        await supabase.from('invoice_items').insert(newItems);
      }

      await fetchInvoices();
      return newInvoice;
    } catch (error) {
      console.error('Error duplicating invoice:', error);
      return null;
    }
  };

  return {
    invoices,
    loading,
    refreshInvoices: fetchInvoices,
    deleteInvoice,
    duplicateInvoice,
  };
}
