'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Invoice } from '@/types';
import { formatCurrency, formatDate, isOverdue } from '@/lib/utils/helpers';
import {
  ArrowLeftIcon,
  PrinterIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchInvoice();
    }
  }, [params.id]);



  const fetchInvoice = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies(*),
          customer:customers(*),
          items:invoice_items(*),
          payments:payments(*)
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setInvoice(data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
      router.push('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const { error } = await supabase.from('invoices').delete().eq('id', params.id);
      if (error) throw error;
      
      toast.success('Invoice deleted successfully');
      router.push('/invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}/send`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to send email');

      toast.success('Invoice sent successfully');
      
      // Update invoice status to sent
      await (supabase.from('invoices') as any).update({ status: 'sent' }).eq('id', params.id);
      fetchInvoice();
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      const { error } = await (supabase
        .from('invoices') as any)
        .update({ status: 'paid' })
        .eq('id', params.id);

      if (error) throw error;
      
      toast.success('Invoice marked as paid');
      fetchInvoice();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Failed to update invoice');
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === 'created') {
      return <span className="badge badge-created">Created</span>;
    }
    if (status === 'paid') {
      return <span className="badge badge-paid">Paid</span>;
    }
    if (status === 'cancelled') {
      return <span className="badge badge-cancelled">Cancelled</span>;
    }
    if (status === 'sent' && isOverdue(dueDate)) {
      return <span className="badge badge-overdue">Overdue</span>;
    }
    return <span className="badge badge-sent">Sent</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-white">Invoice not found</h2>
        <Link href="/invoices" className="mt-4 text-gray-400 hover:text-white">
          Back to invoices
        </Link>
      </div>
    );
  }

  const totalPaid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const remaining = invoice.total - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex items-center">
          <Link href="/invoices" className="mr-4 text-gray-400 hover:text-white">
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-white">
              Invoice {invoice.invoice_number}
            </h2>
            <div className="mt-1 flex items-center space-x-3">
              {getStatusBadge(invoice.status, invoice.due_date)}
              <span className="text-gray-400">
                Created on {formatDate(invoice.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex md:mt-0 space-x-2">
          <Link
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            className="inline-flex items-center px-4 py-2 border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PrinterIcon className="-ml-1 mr-2 h-5 w-5" />
            PDF
          </Link>
          <button
            onClick={handleSendEmail}
            disabled={sending}
            className="inline-flex items-center px-4 py-2 border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <EnvelopeIcon className="-ml-1 mr-2 h-5 w-5" />
            {sending ? 'Sending...' : 'Send'}
          </button>

          {invoice.status !== 'paid' && (
            <button
              onClick={handleMarkAsPaid}
              className="inline-flex items-center px-4 py-2 border border-green-500 text-green-400 hover:bg-green-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
              Mark Paid
            </button>
          )}
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <TrashIcon className="-ml-1 mr-2 h-5 w-5" />
            Delete
          </button>
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="card bg-dark-800">
        <div className="p-8">
          {/* Company & Customer Info */}
          <div className="flex justify-between mb-8">
            <div>
              {invoice.company?.logo_url && (
                <img
                  src={invoice.company.logo_url}
                  alt={invoice.company.name}
                  className="h-16 mb-4 object-contain"
                />
              )}
              <h3 className="text-lg font-bold text-white">{invoice.company?.name}</h3>
              <p className="text-sm text-gray-400">{invoice.company?.street}</p>
              <p className="text-sm text-gray-400">
                {invoice.company?.postal_code} {invoice.company?.city}
              </p>
              <p className="text-sm text-gray-400">{invoice.company?.email}</p>
              {invoice.company?.phone && (
                <p className="text-sm text-gray-400">{invoice.company.phone}</p>
              )}
              {invoice.company?.vat_id && (
                <p className="text-sm text-gray-400 mt-2">VAT: {invoice.company.vat_id}</p>
              )}
            </div>
            <div className="text-right">
              <h3 className="text-lg font-bold text-white mb-4">Invoice To:</h3>
              <p className="font-medium text-white">{invoice.customer?.company_name}</p>
              <p className="text-sm text-gray-400">{invoice.customer?.street}</p>
              <p className="text-sm text-gray-400">
                {invoice.customer?.postal_code} {invoice.customer?.city}
              </p>
              <p className="text-sm text-gray-400">{invoice.customer?.email}</p>

            </div>
          </div>

          {/* Invoice Details */}
          <div className="border-t border-b border-dark-500 py-4 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Invoice Number</p>
                <p className="font-medium text-white">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Invoice Date</p>
                <p className="font-medium text-white">{formatDate(invoice.invoice_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="font-medium text-white">{formatDate(invoice.due_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="mt-1">{getStatusBadge(invoice.status, invoice.due_date)}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="min-w-full mb-8">
            <thead>
              <tr className="border-b border-dark-500">
                <th className="text-left py-2 text-sm font-medium text-gray-400">Description</th>
                <th className="text-right py-2 text-sm font-medium text-gray-400">Quantity</th>
                <th className="text-right py-2 text-sm font-medium text-gray-400">Unit</th>
                <th className="text-right py-2 text-sm font-medium text-gray-400">Price</th>
                <th className="text-right py-2 text-sm font-medium text-gray-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => (
                <tr key={index} className="border-b border-dark-500">
                  <td className="py-3 text-white">{item.description}</td>
                  <td className="py-3 text-right text-white">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-400">{item.unit || 'pcs'}</td>
                  <td className="py-3 text-right text-white">{formatCurrency(item.price)}</td>
                  <td className="py-3 text-right text-white">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Subtotal</span>
                <span className="font-medium text-white">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Tax ({invoice.tax_rate}%)</span>
                <span className="font-medium text-white">{formatCurrency(invoice.tax)}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-dark-500">
                <span className="font-bold text-white">Total</span>
                <span className="font-bold text-lg text-white">{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.status === 'paid' && (
                <div className="flex justify-between py-2 text-green-400">
                  <span className="font-medium">Paid</span>
                  <span className="font-medium">{formatCurrency(invoice.total)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Instructions */}
          {(invoice.company?.iban || invoice.notes) && (
            <div className="mt-8 pt-8 border-t border-dark-500">
              {invoice.notes && (
                <div className="mb-4">
                  <h4 className="font-medium text-white mb-2">Notes</h4>
                  <p className="text-sm text-gray-400 whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
              {invoice.company?.iban && (
                <div>
                  <h4 className="font-medium text-white mb-2">Payment Instructions</h4>
                  <p className="text-sm text-gray-400">Bank: {invoice.company.bank_name}</p>
                  <p className="text-sm text-gray-400">IBAN: {invoice.company.iban}</p>
                  {invoice.company.bic && (
                    <p className="text-sm text-gray-400">BIC: {invoice.company.bic}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
