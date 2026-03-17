'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardStats, Invoice } from '@/types';
import { formatCurrency, formatDate, isOverdue } from '@/lib/utils/helpers';
import { 
  BanknotesIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Fetch ALL invoices (shared data)
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(company_name),
          company:companies(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const invoiceList: Invoice[] = invoices || [];

      const thisMonthInvoices = invoiceList.filter(
        (inv) => new Date(inv.created_at) >= startOfMonth
      );
      const thisYearInvoices = invoiceList.filter(
        (inv) => new Date(inv.created_at) >= startOfYear
      );

      const revenueThisMonth = thisMonthInvoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);

      const revenueThisYear = thisYearInvoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0);

      const openInvoices = invoiceList.filter((inv) => inv.status === 'sent');
      const openInvoicesAmount = openInvoices.reduce((sum, inv) => sum + inv.total, 0);

      const overdueInvoices = openInvoices.filter((inv) => isOverdue(inv.due_date));
      const overdueInvoicesAmount = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);

      const paidThisMonth = thisMonthInvoices.filter((inv) => inv.status === 'paid').length;

      const monthlyRevenue: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('default', { month: 'short' });
        const monthInvoices = invoiceList.filter(
          (inv) =>
            inv.status === 'paid' &&
            new Date(inv.created_at).getMonth() === d.getMonth() &&
            new Date(inv.created_at).getFullYear() === d.getFullYear()
        );
        const revenue = monthInvoices.reduce((sum, inv) => sum + inv.total, 0);
        monthlyRevenue.push({ month: monthName, revenue });
      }

      setStats({
        revenueThisMonth,
        revenueThisYear,
        openInvoices: openInvoices.length,
        openInvoicesAmount,
        overdueInvoices: overdueInvoices.length,
        overdueInvoicesAmount,
        paidInvoicesThisMonth: paidThisMonth,
        monthlyRevenue,
      });

      setRecentInvoices(invoiceList.slice(0, 5));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
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

  return (
    <div className="space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-white">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Overview of all shared data across all users.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <Link href="/customers/new" className="btn-outline">
            Add Customer
          </Link>
          <Link href="/invoices/new" className="btn-primary">
            Create Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center">
              <BanknotesIcon className="h-6 w-6 text-gray-400" />
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue This Month</dt>
                  <dd className="text-2xl font-bold text-white">
                    {formatCurrency(stats?.revenueThisMonth || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 text-gray-400" />
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Open Invoices</dt>
                  <dd className="text-2xl font-bold text-white">
                    {stats?.openInvoices || 0}
                    <span className="ml-2 text-sm text-gray-400">
                      ({formatCurrency(stats?.openInvoicesAmount || 0)})
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overdue Invoices</dt>
                  <dd className="text-2xl font-bold text-white">
                    {stats?.overdueInvoices || 0}
                    <span className="ml-2 text-sm text-gray-400">
                      ({formatCurrency(stats?.overdueInvoicesAmount || 0)})
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-6 w-6 text-green-400" />
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Paid This Month</dt>
                  <dd className="text-2xl font-bold text-white">
                    {stats?.paidInvoicesThisMonth || 0}
                    <span className="ml-2 text-sm text-gray-400">invoices</span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header border-b border-dark-500">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">Revenue Trend</h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.monthlyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" tickFormatter={(value) => `€${value}`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                  />
                  <Bar dataKey="revenue" fill="#fff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header border-b border-dark-500 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">Recent Invoices</h3>
            <Link href="/invoices" className="text-sm text-gray-400 hover:text-white uppercase tracking-wider">
              View all
            </Link>
          </div>
          <div className="card-body p-0">
            <table className="min-w-full divide-y divide-dark-500">
              <thead className="bg-dark-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-500">
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">No invoices yet</td>
                  </tr>
                ) : (
                  recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-dark-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <Link href={`/invoices/${invoice.id}`} className="text-white hover:text-gray-300 font-medium">
                          {invoice.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                        {invoice.company?.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                        {invoice.customer?.company_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(invoice.status, invoice.due_date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
