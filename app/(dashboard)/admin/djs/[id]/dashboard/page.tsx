'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Booking, DJ, DJUnavailability, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/types/bookings';
import { formatDateTime, formatDate } from '@/lib/utils/helpers';
import { 
  CalendarIcon,
  ClockIcon,
  ArrowLeftIcon,
  MapPinIcon,
  CurrencyEuroIcon,
  UserIcon
} from '@heroicons/react/24/outline';

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

export default function DJDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const djId = params.id as string;
  const supabase = createClient();

  const [dj, setDj] = useState<DJ | null>(null);
  const [djStats, setDjStats] = useState<DJStats | null>(null);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [upcomingUnavailability, setUpcomingUnavailability] = useState<DJUnavailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin && djId) {
      fetchDJData();
    }
  }, [isAdmin, djId]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.role === 'admin') {
      setIsAdmin(true);
    } else {
      router.push('/dashboard');
    }
  };

  const fetchDJData = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();

      // Fetch DJ info
      const { data: djData } = await supabase
        .from('djs')
        .select('*')
        .eq('id', djId)
        .single();

      if (djData) {
        setDj(djData);
      }

      // Fetch all bookings for this DJ
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('dj_id', djId)
        .order('start_date', { ascending: true });

      const bookingList: Booking[] = bookings || [];

      // Calculate stats - all non-cancelled bookings for financial overview
      const nonCancelledBookings = bookingList.filter(b => b.status !== 'cancelled');
      const totalGross = nonCancelledBookings.reduce((sum, b) => sum + (b.fee || 0), 0);
      const totalProvision = nonCancelledBookings.reduce((sum, b) => sum + ((b.fee || 0) * (b.provision || 0) / 100), 0);

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
      console.error('Error fetching DJ data:', error);
    } finally {
      setLoading(false);
    }
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

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-4">
            <Link 
              href="/admin/djs" 
              className="text-gray-400 hover:text-white flex items-center"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1" />
              Back to DJs
            </Link>
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-white mt-4">
            {dj?.name || 'DJ'} - Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Overview of this DJ&apos;s bookings and schedule
          </p>
        </div>
        <div className="flex items-center space-x-2 text-gray-400">
          <UserIcon className="h-5 w-5" />
          <span className="text-sm uppercase tracking-wider">Admin View</span>
        </div>
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
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Net (DJ Earnings)</dt>
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
              href={`/bookings?dj_id=${djId}`}
              className="text-xs text-gray-400 hover:text-white"
            >
              View in Calendar →
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
                    <ClockIcon className="h-4 w-4 mr-2" />
                    {formatDateTime(nextBooking.start_date)}
                  </div>
                  <div className="flex items-center text-gray-400">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    {nextBooking.location || 'No location specified'}
                  </div>
                  {nextBooking.client_name && (
                    <div className="flex items-center text-gray-400">
                      <UserIcon className="h-4 w-4 mr-2" />
                      Client: {nextBooking.client_name}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No upcoming bookings</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Unavailability */}
        <div className="card">
          <div className="card-header border-b border-dark-500 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Upcoming Unavailability
            </h3>
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
                <ClockIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No upcoming unavailability</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-4">
        <Link 
          href={`/bookings?dj_id=${djId}`}
          className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
        >
          <CalendarIcon className="-ml-1 mr-2 h-5 w-5" />
          View DJ&apos;s Calendar
        </Link>
      </div>
    </div>
  );
}
