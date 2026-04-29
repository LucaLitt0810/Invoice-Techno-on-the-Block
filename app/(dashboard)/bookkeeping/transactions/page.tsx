'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Transaction, Category, Receipt } from '@/types';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

export default function TransactionsPage() {
  const routerSearch = useSearchParams();
  const prefillReceiptId = routerSearch.get('receipt_id');
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    category_id: '',
    receipt_id: prefillReceiptId || '',
    status: 'open' as 'open' | 'assigned' | 'completed',
  });

  useEffect(() => {
    fetchData();
    fetchCategories();
    fetchReceipts();
  }, [filterType, filterCategory, filterMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [year, month] = filterMonth.split('-');
      let query = supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .gte('date', `${year}-${month}-01`)
        .lte('date', `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`)
        .order('date', { ascending: false });

      if (filterType !== 'all') query = query.eq('type', filterType);
      if (filterCategory) query = query.eq('category_id', filterCategory);

      const { data: txData, error: txError } = await query;
      if (txError) throw txError;

      // Load receipts separately to avoid ambiguous FK join
      const receiptIds = (txData || []).map((t: any) => t.receipt_id).filter(Boolean);
      let receiptMap = new Map();
      if (receiptIds.length > 0) {
        const { data: receiptData } = await supabase
          .from('receipts')
          .select('*')
          .in('id', receiptIds);
        receiptMap = new Map(receiptData?.map((r: any) => [r.id, r]) || []);
      }

      const merged = (txData || []).map((t: any) => ({
        ...t,
        receipt: t.receipt_id ? receiptMap.get(t.receipt_id) || null : null,
      }));

      setTransactions(merged);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
  };

  const fetchReceipts = async () => {
    const { data } = await supabase.from('receipts').select('*').eq('status', 'reviewed').order('created_at', { ascending: false });
    setReceipts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const payload = {
        type: formData.type,
        date: formData.date,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        category_id: formData.category_id || null,
        receipt_id: formData.receipt_id || null,
        status: formData.receipt_id ? 'assigned' : 'open',
      };

      const { data, error } = await (supabase.from('transactions') as any)
        .insert(payload)
        .select('*, category:categories(*), receipt:receipts(*)')
        .single();

      if (error) throw error;

      // Update receipt status if assigned
      if (formData.receipt_id) {
        await (supabase.from('receipts') as any)
          .update({ status: 'assigned', transaction_id: data.id })
          .eq('id', formData.receipt_id);
      }

      toast.success('Transaction created');
      setTransactions((prev) => [data, ...prev]);
      setShowForm(false);
      setFormData({
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        category_id: '',
        receipt_id: '',
        status: 'open',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create transaction');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      const { error } = await (supabase.from('transactions') as any).delete().eq('id', id);
      if (error) throw error;
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success('Transaction deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const incomeTotal = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href="/bookkeeping" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Bookkeeping
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Transactions</h2>
        </div>
        <div className="mt-4 flex md:mt-0 gap-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            {showForm ? 'Cancel' : 'New Transaction'}
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-green-500/30 rounded-sm p-3 bg-green-900/10">
          <p className="text-xs text-gray-500 uppercase">Income</p>
          <p className="text-lg font-bold text-green-400">{incomeTotal.toFixed(2)}</p>
        </div>
        <div className="border border-red-500/30 rounded-sm p-3 bg-red-900/10">
          <p className="text-xs text-gray-500 uppercase">Expenses</p>
          <p className="text-lg font-bold text-red-400">{expenseTotal.toFixed(2)}</p>
        </div>
        <div className="border border-blue-500/30 rounded-sm p-3 bg-blue-900/10">
          <p className="text-xs text-gray-500 uppercase">Profit / Loss</p>
          <p className={`text-lg font-bold ${incomeTotal - expenseTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(incomeTotal - expenseTotal).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FunnelIcon className="h-4 w-4 text-gray-500" />
        <input
          type="month"
          className="input text-sm py-2"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        />
        <select
          className="input text-sm py-2"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          className="input text-sm py-2"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* New Transaction Form */}
      {showForm && (
        <div className="card bg-dark-800">
          <div className="card-body">
            <h3 className="text-lg font-medium text-white mb-4">New Transaction</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select
                    className="input"
                    value={formData.type}
                    onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as 'income' | 'expense' }))}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.date}
                    onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={formData.amount}
                    onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={formData.category_id}
                    onChange={(e) => setFormData((p) => ({ ...p, category_id: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    {categories
                      .filter((c) => c.type === formData.type)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  type="text"
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Venue rental for event..."
                />
              </div>
              <div>
                <label className="label">Assign Receipt</label>
                <select
                  className="input"
                  value={formData.receipt_id}
                  onChange={(e) => setFormData((p) => ({ ...p, receipt_id: e.target.value }))}
                >
                  <option value="">None</option>
                  {receipts.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.file_name} — {(r.manual_amount || r.extracted_amount || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-dark-500 text-gray-300 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-500">
                <thead className="bg-dark-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-500">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-dark-700/50">
                      <td className="px-4 py-3 text-sm text-gray-400">{new Date(tx.date).toLocaleDateString('de-DE')}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          tx.type === 'income' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{tx.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{tx.category?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        <span className={tx.type === 'income' ? 'text-green-400' : 'text-red-400'}>
                          {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          tx.status === 'completed' ? 'bg-green-900/30 text-green-400 border-green-800' :
                          tx.status === 'assigned' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                          'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-gray-400 hover:text-red-400"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
