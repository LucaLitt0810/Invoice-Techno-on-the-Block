'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentTextIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

interface ReportData {
  period: { year: string; month: string | null };
  summary: { income: number; expenses: number; profit: number };
  byCategory: { name: string; type: string; color: string; amount: number }[];
  byMonth: { month: string; income: number; expenses: number }[];
  receiptStats: { total: number; unprocessed: number; reviewed: number; assigned: number };
  transactionCount: number;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState('');
  const [closedPeriods, setClosedPeriods] = useState<string[]>([]);

  useEffect(() => {
    fetchReport();
  }, [year, month]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const url = `/api/bookkeeping/reports?year=${year}${month ? `&month=${month}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setReport(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePeriod = () => {
    const period = month ? `${year}-${month}` : year;
    if (!confirm(`Close period ${period}? This is for documentation purposes only.`)) return;
    setClosedPeriods((prev) => [...prev, period]);
  };

  const isClosed = () => {
    const period = month ? `${year}-${month}` : year;
    return closedPeriods.includes(period);
  };

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

  return (
    <div className="space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href="/bookkeeping" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Bookkeeping
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Reports</h2>
        </div>
      </div>

      {/* Period Selector */}
      <div className="card bg-dark-800">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-4">
            <select className="input text-sm py-2" value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select className="input text-sm py-2" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">Full Year</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {new Date(2000, i, 1).toLocaleString('de-DE', { month: 'long' })}
                </option>
              ))}
            </select>
            <button
              onClick={handleClosePeriod}
              disabled={isClosed()}
              className="px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LockClosedIcon className="mr-1.5 h-4 w-4 inline" />
              {isClosed() ? 'Period Closed' : 'Close Period'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : !report ? (
        <p className="text-gray-500 text-center py-8">Failed to load report.</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card bg-dark-800">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Total Income</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">{report.summary.income.toFixed(2)}</p>
                  </div>
                  <ArrowTrendingUpIcon className="h-8 w-8 text-green-500/30" />
                </div>
              </div>
            </div>
            <div className="card bg-dark-800">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-400 mt-1">{report.summary.expenses.toFixed(2)}</p>
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
                    <p className={`text-2xl font-bold mt-1 ${report.summary.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {report.summary.profit.toFixed(2)}
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
                    <p className="text-xs text-gray-500 uppercase">Transactions</p>
                    <p className="text-2xl font-bold text-white mt-1">{report.transactionCount}</p>
                  </div>
                  <DocumentTextIcon className="h-8 w-8 text-gray-500/30" />
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="card bg-dark-800">
            <div className="card-body space-y-4">
              <h3 className="text-lg font-medium text-white">Category Breakdown</h3>
              {report.byCategory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No categorized transactions.</p>
              ) : (
                <div className="space-y-3">
                  {report.byCategory.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between p-3 border border-dark-500 rounded-sm">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm text-white">{cat.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          cat.type === 'income' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'
                        }`}>
                          {cat.type}
                        </span>
                      </div>
                      <span className={`text-sm font-medium ${cat.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {cat.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monthly Breakdown (only for yearly view) */}
          {!month && (
            <div className="card bg-dark-800">
              <div className="card-body space-y-4">
                <h3 className="text-lg font-medium text-white">Monthly Overview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-dark-500">
                    <thead className="bg-dark-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Month</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Income</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Expenses</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-500">
                      {report.byMonth.map((m) => {
                        const profit = m.income - m.expenses;
                        return (
                          <tr key={m.month} className="hover:bg-dark-700/50">
                            <td className="px-4 py-3 text-sm text-white">
                              {new Date(2000, parseInt(m.month) - 1, 1).toLocaleString('de-DE', { month: 'long' })}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-400">{m.income.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right text-red-400">{m.expenses.toFixed(2)}</td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {profit.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Stats */}
          <div className="card bg-dark-800">
            <div className="card-body space-y-4">
              <h3 className="text-lg font-medium text-white">Receipt Overview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="border border-dark-500 rounded-sm p-3 text-center">
                  <p className="text-2xl font-bold text-white">{report.receiptStats.total}</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Total</p>
                </div>
                <div className="border border-yellow-500/30 rounded-sm p-3 text-center bg-yellow-900/10">
                  <p className="text-2xl font-bold text-yellow-400">{report.receiptStats.unprocessed}</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Unprocessed</p>
                </div>
                <div className="border border-blue-500/30 rounded-sm p-3 text-center bg-blue-900/10">
                  <p className="text-2xl font-bold text-blue-400">{report.receiptStats.reviewed}</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Reviewed</p>
                </div>
                <div className="border border-green-500/30 rounded-sm p-3 text-center bg-green-900/10">
                  <p className="text-2xl font-bold text-green-400">{report.receiptStats.assigned}</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">Assigned</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
