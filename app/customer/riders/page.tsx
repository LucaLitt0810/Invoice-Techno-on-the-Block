'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Order, DJRider } from '@/types';
import { CalendarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface RiderWithOrder {
  rider: DJRider;
  order: Order;
}

export default function CustomerRidersPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [riders, setRiders] = useState<RiderWithOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRiders = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Find customer by auth_user_id
        const { data: customer } = await (supabase as any)
          .from('customers')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!customer) {
          setRiders([]);
          return;
        }

        // Get accessible orders
        const { data: accesses } = await (supabase as any)
          .from('order_customer_access')
          .select('order_id')
          .eq('customer_id', customer.id)
          .eq('can_view_rider', true);

        if (!accesses || accesses.length === 0) {
          setRiders([]);
          return;
        }

        const orderIds = (accesses as any[]).map((a: any) => a.order_id);

        // Get riders for these orders
        const { data: ridersData } = await (supabase as any)
          .from('dj_riders')
          .select('*, order:orders(*, dj:djs(id, name), customer:customers(*))')
          .in('order_id', orderIds)
          .eq('status', 'active');

        const mapped = (ridersData || []).map((r: any) => ({
          rider: r as DJRider,
          order: r.order as Order,
        }));

        setRiders(mapped);
      } catch (error) {
        console.error('Error fetching riders:', error);
        toast.error('Failed to load riders');
      } finally {
        setLoading(false);
      }
    };

    fetchRiders();
  }, [user, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (riders.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold text-white mb-2">Meine DJ Rider</h1>
        <p className="text-gray-500">Es sind aktuell keine Rider für Sie freigegeben.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Meine DJ Rider</h1>
        <p className="text-sm text-gray-500 mt-1">Hier finden Sie alle für Sie freigegebenen Event-Rider</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {riders.map(({ rider, order }) => (
          <Link
            key={rider.id}
            href={`/customer/riders/${rider.id}`}
            className="group block bg-dark-800 border border-dark-500 rounded-xl p-5 hover:border-teal-500/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-white group-hover:text-teal-400 transition-colors">
                {order.title}
              </h3>
              <ArrowRightIcon className="h-5 w-5 text-gray-600 group-hover:text-teal-400 transition-colors" />
            </div>
            <div className="space-y-2">
              {order.dj && (
                <p className="text-sm text-gray-400">Artist: <span className="text-gray-300">{order.dj.name}</span></p>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CalendarIcon className="h-4 w-4" />
                <span>{new Date(order.created_at).toLocaleDateString('de-DE')}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
