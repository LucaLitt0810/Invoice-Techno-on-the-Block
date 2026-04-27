'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Transaction, Receipt, Category } from '@/types';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export default function BookkeepingDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    income: 0,
    expenses: 0,
    profit: 0,
    receiptUnprocessed: 0,
    transactionCount: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      // Monthly transactions
      const { data: txs } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      const transactions = txs || [];
      const income = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + (t.amount || 0), 0);
      const expenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + (t.amount || 0), 0);

      // Receipts
      const { data: receipts } = await supabase
        .from('receipts')
        .select('*')
        .eq('status', 'unprocessed');

      setStats({
        income,
        expenses,
        profit: income - expenses,
        receiptUnprocessed: receipts?.length || 0,
        transactionCount: transactions.length,
      });

      setRecentTransactions(transactions.slice(0, 5));

      const { data: allReceipts } = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentReceipts(allReceipts || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Bookkeeping</h2>
          <p className="mt-1 text-sm text-gray-400">Financial overview and management</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/bookkeeping/receipts" className="flex items-center justify-center px-4 py-3 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider">
          <DocumentTextIcon className="mr-1.5 h-4 w-4" />
          Receipts
        </Link>
        <Link href="/bookkeeping/transactions" className="flex items-center justify-center px-4 py-3 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider">
          <ClipboardDocumentListIcon className="mr-1.5 h-4 w-4" />
          Transactions
        </Link>
        <Link href="/bookkeeping/reports" className="flex items-center justify-center px-4 py-3 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider">
          <BanknotesIcon className="mr-1.5 h-4 w-4" />
          Reports
        </Link>
        <Link href="/bookkeeping/transactions?action=new" className="flex items-center justify-center px-4 py-3 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider">
          <PlusIcon className="mr-1.5 h-4 w-4" />
          New Booking
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-dark-800">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Income (This Month)</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{stats.income.toFixed(2)}</p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-green-500/30" />
            </div>
          </div>
        </div>
        <div className="card bg-dark-800">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Expenses (This Month)</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{stats.expenses.toFixed(2)}</p>
              </div>
              <ArrowTrendingDownIcon className="h-8 w-8 text-red-500/30" />
            </div>
          </div>
        </div>
        <div className="card bg-dark-800">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Profit / Loss</p>
                <p className={`text-2xl font-bold mt-1 ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.profit.toFixed(2)}
                </p>
              </div>
              <BanknotesIcon className="h-8 w-8 text-blue-500/30" />
            </div>
          </div>
        </div>
        <div className="card bg-dark-800">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Unprocessed Receipts</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.receiptUnprocessed}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Recent Transactions</h3>
            <Link href="/bookkeeping/transactions" className="text-sm text-blue-400 hover:text-blue-300">View All</Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No transactions this month.</p>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 border border-dark-500 rounded-sm">
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      tx.type === 'income' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'
                    }`}>
                      {tx.type}
                    </span>
                    <span className="text-sm text-white">{tx.description || '-'}</span>
                    <span className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString('de-DE')}</span>
                    {tx.category && (
                      <span className="text-xs text-gray-500">{tx.category.name}</span>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Receipts */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Recent Receipts</h3>
            <Link href="/bookkeeping/receipts" className="text-sm text-blue-400 hover:text-blue-300">View All</Link>
          </div>
          {recentReceipts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No receipts uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentReceipts.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 border border-dark-500 rounded-sm">
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      r.status === 'assigned' ? 'bg-green-900/30 text-green-400 border-green-800' :
                      r.status === 'reviewed' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                      'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                    }`}>
                      {r.status}
                    </span>
                    <span className="text-sm text-white">{r.file_name || 'Receipt'}</span>
                    <span className="text-xs text-gray-400">
                      {r.manual_amount || r.extracted_amount ? (r.manual_amount || r.extracted_amount)?.toFixed(2) : '-'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('de-DE')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
