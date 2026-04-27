'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Receipt } from '@/types';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

export default function ReceiptsPage() {
  const supabase = createClient();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unprocessed' | 'reviewed' | 'assigned'>('all');

  useEffect(() => {
    fetchReceipts();
  }, [filter]);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      let query = supabase.from('receipts').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('status', filter);
      const { data, error } = await query;
      if (error) throw error;
      setReceipts(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be smaller than 5MB');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const { error } = await (supabase.from('receipts') as any).insert({
          file_data: base64,
          file_name: file.name,
          status: 'unprocessed',
        });
        if (error) throw error;
        toast.success('Receipt uploaded');
        fetchReceipts();
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload receipt');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this receipt?')) return;
    try {
      const { error } = await (supabase.from('receipts') as any).delete().eq('id', id);
      if (error) throw error;
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      toast.success('Receipt deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete receipt');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await (supabase.from('receipts') as any).update({ status }).eq('id', id);
      if (error) throw error;
      setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success('Status updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleSaveManual = async (id: string, data: { manual_date: string; manual_amount: number; manual_vendor: string }) => {
    try {
      const { error } = await (supabase.from('receipts') as any)
        .update({ ...data, status: 'reviewed' })
        .eq('id', id);
      if (error) throw error;
      fetchReceipts();
      toast.success('Receipt updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update receipt');
    }
  };

  return (
    <div className="space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href="/bookkeeping" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Bookkeeping
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Receipts</h2>
        </div>
        <div className="mt-4 flex md:mt-0 gap-3">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            id="receipt-upload"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <label
            htmlFor="receipt-upload"
            className={`inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider cursor-pointer ${uploading ? 'opacity-50' : ''}`}
          >
            <CloudArrowUpIcon className="mr-2 h-5 w-5" />
            {uploading ? 'Uploading...' : 'Upload Receipt'}
          </label>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'unprocessed', 'reviewed', 'assigned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border transition-colors ${
              filter === f
                ? 'border-white text-white'
                : 'border-dark-500 text-gray-500 hover:border-white hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Receipts List */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : receipts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No receipts found.</p>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <ReceiptCard
                  key={receipt.id}
                  receipt={receipt}
                  onDelete={handleDelete}
                  onUpdateStatus={handleUpdateStatus}
                  onSaveManual={handleSaveManual}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReceiptCard({
  receipt,
  onDelete,
  onUpdateStatus,
  onSaveManual,
}: {
  receipt: Receipt;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onSaveManual: (id: string, data: { manual_date: string; manual_amount: number; manual_vendor: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    manual_date: receipt.manual_date || receipt.extracted_date || new Date().toISOString().split('T')[0],
    manual_amount: receipt.manual_amount || receipt.extracted_amount || 0,
    manual_vendor: receipt.manual_vendor || receipt.extracted_vendor || '',
  });

  return (
    <div className="border border-dark-500 rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            receipt.status === 'assigned' ? 'bg-green-900/30 text-green-400 border-green-800' :
            receipt.status === 'reviewed' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
            'bg-yellow-900/30 text-yellow-400 border-yellow-800'
          }`}>
            {receipt.status}
          </span>
          <span className="text-sm font-medium text-white">{receipt.file_name || 'Receipt'}</span>
          <span className="text-xs text-gray-400">{new Date(receipt.created_at).toLocaleDateString('de-DE')}</span>
        </div>
        <div className="flex items-center gap-2">
          {receipt.file_data && (
            <a
              href={receipt.file_data}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white p-1"
              title="View"
            >
              <EyeIcon className="h-4 w-4" />
            </a>
          )}
          <button onClick={() => setEditing(!editing)} className="text-gray-400 hover:text-white p-1" title="Edit">
            <DocumentTextIcon className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(receipt.id)} className="text-gray-400 hover:text-red-400 p-1" title="Delete">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Extracted Data */}
      <div className="grid grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-gray-500">Date:</span>
          <span className="text-white ml-2">{receipt.extracted_date || '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Amount:</span>
          <span className="text-white ml-2">{receipt.extracted_amount?.toFixed(2) || '-'}</span>
        </div>
        <div>
          <span className="text-gray-500">Vendor:</span>
          <span className="text-white ml-2">{receipt.extracted_vendor || '-'}</span>
        </div>
      </div>

      {/* Manual Edit Form */}
      {editing && (
        <div className="border-t border-dark-500 pt-3 space-y-3">
          <p className="text-xs text-gray-500 uppercase">Manual Correction</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">Date</label>
              <input
                type="date"
                className="input text-sm"
                value={form.manual_date}
                onChange={(e) => setForm((p) => ({ ...p, manual_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Amount</label>
              <input
                type="number"
                step="0.01"
                className="input text-sm"
                value={form.manual_amount}
                onChange={(e) => setForm((p) => ({ ...p, manual_amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Vendor</label>
              <input
                type="text"
                className="input text-sm"
                value={form.manual_vendor}
                onChange={(e) => setForm((p) => ({ ...p, manual_vendor: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSaveManual(receipt.id, form);
                setEditing(false);
              }}
              className="px-3 py-1.5 border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white transition-colors text-xs font-medium uppercase tracking-wider"
            >
              <CheckIcon className="mr-1 h-3 w-3 inline" />
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 border border-dark-500 text-gray-400 hover:text-white transition-colors text-xs font-medium uppercase tracking-wider"
            >
              <XMarkIcon className="mr-1 h-3 w-3 inline" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status Actions */}
      <div className="flex gap-2">
        {receipt.status !== 'reviewed' && (
          <button
            onClick={() => onUpdateStatus(receipt.id, 'reviewed')}
            className="px-3 py-1 border border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors text-xs font-medium uppercase tracking-wider"
          >
            Mark Reviewed
          </button>
        )}
        {receipt.status !== 'assigned' && (
          <Link
            href={`/bookkeeping/transactions?receipt_id=${receipt.id}`}
            className="px-3 py-1 border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white transition-colors text-xs font-medium uppercase tracking-wider"
          >
            Assign to Transaction
          </Link>
        )}
      </div>
    </div>
  );
}
