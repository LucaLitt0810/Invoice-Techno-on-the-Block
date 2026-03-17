'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Invoice, InvoiceStatus } from '@/types';
import { formatCurrency, formatDate, isOverdue } from '@/lib/utils/helpers';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  EyeIcon, 
  TrashIcon, 
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const statusOptions: { value: InvoiceStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'created', label: 'Created' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      // Fetch ALL invoices (shared data)
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(company_name, email),
          company:companies(name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      toast.success('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === 'created') return <span className="badge badge-created">Created</span>;
    if (status === 'paid') return <span className="badge badge-paid">Paid</span>;
    if (status === 'cancelled') return <span className="badge badge-cancelled">Cancelled</span>;
    if (status === 'sent' && isOverdue(dueDate)) return <span className="badge badge-overdue">Overdue</span>;
    return <span className="badge badge-sent">Sent</span>;
  };

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customer?.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.company?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            Invoices
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Shared invoices - all users can access and manage these.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link href="/invoices/new" className="btn-primary inline-flex items-center">
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Invoice
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            className="input block w-full pl-10 bg-dark-800 border-dark-500 text-white"
            placeholder="Search by invoice #, customer, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48 bg-dark-800 border-dark-500 text-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-dark-800">{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="card bg-dark-800 border-dark-500">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-dark-500">
            <thead className="bg-dark-700">
              <tr>
                <th className="table-header-cell">Invoice #</th>
                <th className="table-header-cell">Company</th>
                <th className="table-header-cell">Customer</th>
                <th className="table-header-cell">Date</th>
                <th className="table-header-cell">Due Date</th>
                <th className="table-header-cell">Total</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-500">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    {searchQuery || statusFilter ? 'No invoices found matching your criteria.' : 'No invoices yet. Create your first invoice!'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-dark-700/50">
                    <td className="table-cell font-medium text-white">{invoice.invoice_number}</td>
                    <td className="table-cell">
                      <div className="flex items-center text-gray-400">
                        <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                        {invoice.company?.name}
                      </div>
                    </td>
                    <td className="table-cell text-gray-400">{invoice.customer?.company_name}</td>
                    <td className="table-cell text-gray-400">{formatDate(invoice.invoice_date)}</td>
                    <td className="table-cell text-gray-400">
                      {formatDate(invoice.due_date)}
                      {isOverdue(invoice.due_date) && invoice.status === 'sent' && (
                        <span className="ml-2 text-xs text-red-400 uppercase tracking-wider">Overdue</span>
                      )}
                    </td>
                    <td className="table-cell font-medium text-white">{formatCurrency(invoice.total)}</td>
                    <td className="table-cell">{getStatusBadge(invoice.status, invoice.due_date)}</td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <Link href={`/invoices/${invoice.id}`} className="text-gray-400 hover:text-white">
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <button onClick={() => handleDelete(invoice.id)} className="text-gray-400 hover:text-red-400">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
