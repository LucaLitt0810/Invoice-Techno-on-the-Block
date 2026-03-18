'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardStats, Invoice } from '@/types';
import { Booking, DJUnavailability, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/types/bookings';
import { formatCurrency, formatDate, isOverdue, formatDateTime } from '@/lib/utils/helpers';
import { 
  BanknotesIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalendarIcon,
  MapPinIcon,
  CurrencyEuroIcon,
  ClockIcon as ClockIconOutline,
  ArrowRightIcon
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

interface DJStats {
  totalBookings: number;
  request: number;
  negotiation: number;
  confirmed: number;
  paid: number;
  cancelled: number;
  totalGross: number;
  totalProvision: number;
  totalNet: number;
}

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string>('user');
  const [currentDJId, setCurrentDJId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Invoice stats (for non-DJs)
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);

  // DJ stats (for DJs)
  const [djStats, setDjStats] = useState<DJStats | null>(null);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [upcomingUnavailability, setUpcomingUnavailability] = useState<DJUnavailability[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = user.user_metadata?.role || 'user';
        setUserRole(role);
        
        if (role === 'dj') {
          // Fetch DJ ID
          const { data: djData } = await supabase
            .from('djs')
            .select('id')
            .eq('user_id', user.id)
            .single();
          
          if (djData) {
            setCurrentDJId(djData.id);
            await fetchDJDashboard(djData.id);
          }
        } else {
          await fetchInvoiceDashboard();
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const fetchDJDashboard = async (djId: string) => {
    try {
      const now = new Date().toISOString();

      // Fetch all bookings for this DJ
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('dj_id', djId)
        .order('start_date', { ascending: true });

      const bookingList: Booking[] = bookings || [];

      // Calculate stats
      const paidBookings = bookingList.filter(b => b.status === 'paid');
      const totalGross = paidBookings.reduce((sum, b) => sum + (b.fee || 0), 0);
      const totalProvision = paidBookings.reduce((sum, b) => sum + ((b.fee || 0) * (b.provision || 0) / 100), 0);
      
      const stats: DJStats = {
        totalBookings: bookingList.length,
        request: bookingList.filter(b => b.status === 'request').length,
        negotiation: bookingList.filter(b => b.status === 'negotiation').length,
        confirmed: bookingList.filter(b => b.status === 'confirmed').length,
        paid: bookingList.filter(b => b.status === 'paid').length,
        cancelled: bookingList.filter(b => b.status === 'cancelled').length,
        totalGross,
        totalProvision,
        totalNet: totalGross - totalProvision,
      };
      setDjStats(stats);

      // Find next upcoming booking
      const upcoming = bookingList.filter(b => 
        new Date(b.end_date) >= new Date() && 
        b.status !== 'cancelled'
      );
      setNextBooking(upcoming[0] || null);

      // Fetch upcoming unavailability
      const { data: unavailability } = await supabase
        .from('dj_unavailability')
        .select('*')
        .eq('dj_id', djId)
        .gte('end_date', now)
        .order('start_date', { ascending: true })
        .limit(5);

      setUpcomingUnavailability(unavailability || []);
    } catch (error) {
      console.error('Error fetching DJ dashboard:', error);
    }
  };

  const fetchInvoiceDashboard = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

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
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  const getBookingStatusBadge = (status: string) => {
    const color = BOOKING_STATUS_COLORS[status as keyof typeof BOOKING_STATUS_COLORS];
    const label = BOOKING_STATUS_LABELS[status as keyof typeof BOOKING_STATUS_LABELS];
    return (
      <span 
        className="inline-flex items-center px-2 py-1 text-xs font-medium uppercase tracking-wider"
        style={{ 
          backgroundColor: color,
          color: '#000'
        }}
      >
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // DJ Dashboard
  if (userRole === 'dj') {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-white">
            DJ Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Overview of your bookings and schedule
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card">
            <div className="p-4 text-center">
              <div className="text-3xl font-bold text-white">{djStats?.totalBookings || 0}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Total</div>
            </div>
          </div>
          <div className="card">
            <div className="p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: BOOKING_STATUS_COLORS.request }}>
                {djStats?.request || 0}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Request</div>
            </div>
          </div>
          <div className="card">
            <div className="p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: BOOKING_STATUS_COLORS.negotiation }}>
                {djStats?.negotiation || 0}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Negotiation</div>
            </div>
          </div>
          <div className="card">
            <div className="p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: BOOKING_STATUS_COLORS.confirmed }}>
                {djStats?.confirmed || 0}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Confirmed</div>
            </div>
          </div>
          <div className="card">
            <div className="p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: BOOKING_STATUS_COLORS.paid }}>
                {djStats?.paid || 0}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Paid</div>
            </div>
          </div>
          <div className="card">
            <div className="p-4 text-center">
              <div className="text-3xl font-bold" style={{ color: BOOKING_STATUS_COLORS.cancelled }}>
                {djStats?.cancelled || 0}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Cancelled</div>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="p-6">
              <div className="flex items-center">
                <CurrencyEuroIcon className="h-6 w-6 text-gray-400" />
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gross</dt>
                    <dd className="text-2xl font-bold text-white">
                      €{djStats?.totalGross?.toFixed(2) || '0.00'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-6">
              <div className="flex items-center">
                <CurrencyEuroIcon className="h-6 w-6 text-orange-400" />
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Provision</dt>
                    <dd className="text-2xl font-bold text-orange-400">
                      €{djStats?.totalProvision?.toFixed(2) || '0.00'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-6">
              <div className="flex items-center">
                <CurrencyEuroIcon className="h-6 w-6 text-green-400" />
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Net (Your Earnings)</dt>
                    <dd className="text-2xl font-bold text-green-400">
                      €{djStats?.totalNet?.toFixed(2) || '0.00'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Next Up */}
          <div className="card">
            <div className="card-header border-b border-dark-500 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white uppercase tracking-wider flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Next Up
              </h3>
              <Link 
                href="/bookings" 
                className="text-xs text-gray-400 hover:text-white flex items-center"
              >
                View All <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="card-body">
              {nextBooking ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-white">{nextBooking.event_name}</h4>
                      {getBookingStatusBadge(nextBooking.status)}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        €{nextBooking.fee?.toFixed(2) || '0.00'}
                      </div>
                      {nextBooking.provision > 0 && (
                        <div className="text-sm text-orange-400">
                          -{nextBooking.provision}% = €{((nextBooking.fee || 0) * (1 - nextBooking.provision / 100)).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-400">
                      <ClockIconOutline className="h-4 w-4 mr-2" />
                      {formatDateTime(nextBooking.start_date)}
                    </div>
                    <div className="flex items-center text-gray-400">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {nextBooking.location || 'No location specified'}
                    </div>
                    {nextBooking.client_name && (
                      <div className="flex items-center text-gray-400">
                        <CurrencyEuroIcon className="h-4 w-4 mr-2" />
                        Client: {nextBooking.client_name}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No upcoming bookings</p>
                  <Link 
                    href="/bookings" 
                    className="inline-block mt-4 px-4 py-2 bg-white text-black text-sm uppercase tracking-wider hover:bg-gray-200 transition-colors"
                  >
                    Create Booking
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Unavailability */}
          <div className="card">
            <div className="card-header border-b border-dark-500 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white uppercase tracking-wider flex items-center">
                <ClockIconOutline className="h-5 w-5 mr-2" />
                Upcoming Unavailability
              </h3>
              <Link 
                href="/bookings/unavailability" 
                className="text-xs text-gray-400 hover:text-white flex items-center"
              >
                Manage <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="card-body">
              {upcomingUnavailability.length > 0 ? (
                <div className="space-y-3">
                  {upcomingUnavailability.map((unav) => (
                    <div 
                      key={unav.id} 
                      className="flex items-center justify-between p-3 bg-dark-700 border border-dark-500"
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-gray-500 mr-3"></div>
                        <div>
                          <div className="text-sm font-medium text-white capitalize">
                            {unav.type}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatDate(unav.start_date)} - {formatDate(unav.end_date)}
                          </div>
                        </div>
                      </div>
                      {unav.reason && (
                        <div className="text-xs text-gray-500">{unav.reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ClockIconOutline className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No upcoming unavailability</p>
                  <Link 
                    href="/bookings/unavailability" 
                    className="inline-block mt-4 px-4 py-2 border border-gray-500 text-gray-300 text-sm uppercase tracking-wider hover:bg-gray-800 transition-colors"
                  >
                    Add Unavailability
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            href="/bookings"
            className="card p-6 hover:bg-dark-700 transition-colors group"
          >
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-gray-400 group-hover:text-white" />
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">View Calendar</div>
                <div className="text-white">See all your bookings</div>
              </div>
            </div>
          </Link>
          <Link 
            href="/bookings"
            className="card p-6 hover:bg-dark-700 transition-colors group"
          >
            <div className="flex items-center">
              <CurrencyEuroIcon className="h-8 w-8 text-gray-400 group-hover:text-white" />
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">New Booking</div>
                <div className="text-white">Create a booking for yourself</div>
              </div>
            </div>
          </Link>
          <Link 
            href="/bookings/unavailability"
            className="card p-6 hover:bg-dark-700 transition-colors group"
          >
            <div className="flex items-center">
              <ClockIconOutline className="h-8 w-8 text-gray-400 group-hover:text-white" />
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-400 uppercase tracking-wider">Block Time</div>
                <div className="text-white">Mark yourself unavailable</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // Regular Dashboard (for non-DJs)
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
          <div className="card-header border-b border-dark-500">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">Recent Invoices</h3>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-dark-500">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Invoice</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Customer</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Amount</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-500">
                  {recentInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="py-3">
                        <Link 
                          href={`/invoices/${invoice.id}`}
                          className="text-sm font-medium text-white hover:text-gray-300"
                        >
                          #{invoice.invoice_number}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-gray-400">
                          {invoice.customer?.company_name}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-sm text-white">
                          {formatCurrency(invoice.total)}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        {getStatusBadge(invoice.status, invoice.due_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
