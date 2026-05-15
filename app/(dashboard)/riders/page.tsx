'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { DJRider, Order } from '@/types';
import {
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  BuildingOfficeIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';

interface RiderWithOrder extends DJRider {
  order?: Order;
}

interface RiderStats {
  riderId: string;
  total: number;
  filled: number;
  confirmed: number;
  customers: number;
}

export default function RidersPage() {
  const supabase = createClient() as any;
  const [riders, setRiders] = useState<RiderWithOrder[]>([]);
  const [stats, setStats] = useState<Record<string, RiderStats>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRiders();
  }, []);

  const fetchRiders = async () => {
    setLoading(true);
    try {
      const { data: ridersData } = await supabase
        .from('dj_riders')
        .select('*, order:orders(*, customer:customers(*), dj:djs(id, name))')
        .order('created_at', { ascending: false });

      setRiders(ridersData || []);

      // Fetch stats for each rider
      const riderIds = (ridersData || []).map((r: any) => r.id);
      const orderIds = (ridersData || []).map((r: any) => r.order_id);

      if (riderIds.length > 0) {
        const { data: valuesData } = await supabase
          .from('dj_rider_values')
          .select('rider_id, value, confirmed_by_agency, confirmed_by_customer')
          .in('rider_id', riderIds);

        const { data: accessData } = await supabase
          .from('order_customer_access')
          .select('order_id, customer_id')
          .in('order_id', orderIds);

        const statsMap: Record<string, RiderStats> = {};
        for (const r of ridersData || []) {
          const riderValues = (valuesData || []).filter((v: any) => v.rider_id === r.id);
          const total = riderValues.length;
          const filled = riderValues.filter((v: any) => v.value && v.value.trim()).length;
          const confirmed = riderValues.filter(
            (v: any) => v.confirmed_by_agency && v.confirmed_by_customer
          ).length;
          const customers = (accessData || []).filter((a: any) => a.order_id === r.order_id).length;

          statsMap[r.id] = {
            riderId: r.id,
            total,
            filled,
            confirmed,
            customers,
          };
        }
        setStats(statsMap);
      }

      // Fetch orders without riders for creation
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, customer:customers(*), dj:djs(id, name)')
        .order('created_at', { ascending: false });

      const existingOrderIds = new Set((ridersData || []).map((r: any) => r.order_id));
      const availableOrders = (ordersData || []).filter((o: any) => !existingOrderIds.has(o.id));
      setOrders(availableOrders);
    } catch (error) {
      console.error('Error fetching riders:', error);
      toast.error('Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRider = async () => {
    if (!selectedOrderId) {
      toast.error('Please select an order');
      return;
    }

    setCreating(true);
    try {
      // Get default template
      const { data: template } = await supabase
        .from('dj_rider_templates')
        .select('id')
        .eq('is_default', true)
        .single();

      if (!template) {
        toast.error('No default rider template found');
        return;
      }

      const { data: newRider, error } = await supabase
        .from('dj_riders')
        .insert({
          order_id: selectedOrderId,
          template_id: template.id,
          status: 'active',
        })
        .select('*, order:orders(*)')
        .single();

      if (error) throw error;

      // Pre-populate values
      const { data: sections } = await supabase
        .from('dj_rider_template_sections')
        .select('id')
        .eq('template_id', template.id);

      if (sections && sections.length > 0) {
        const sectionIds = sections.map((s: any) => s.id);
        const { data: fields } = await supabase
          .from('dj_rider_template_fields')
          .select('id')
          .in('section_id', sectionIds);

        if (fields && fields.length > 0) {
          const values = fields.map((f: any) => ({
            rider_id: newRider.id,
            field_id: f.id,
            value: null,
          }));
          await supabase.from('dj_rider_values').insert(values);
        }
      }

      // Auto-create customer access
      const order = orders.find((o) => o.id === selectedOrderId);
      if (order?.customer_id) {
        await supabase.from('order_customer_access').upsert(
          {
            order_id: selectedOrderId,
            customer_id: order.customer_id,
            can_view_rider: true,
          },
          { onConflict: 'order_id,customer_id' }
        );
      }

      toast.success('Rider created');
      setShowModal(false);
      setSelectedOrderId('');
      fetchRiders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create rider');
    } finally {
      setCreating(false);
    }
  };

  const getProgressPercent = (riderId: string) => {
    const s = stats[riderId];
    if (!s || s.total === 0) return 0;
    return Math.round((s.filled / s.total) * 100);
  };

  const getConfirmedPercent = (riderId: string) => {
    const s = stats[riderId];
    if (!s || s.total === 0) return 0;
    return Math.round((s.confirmed / s.total) * 100);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">DJ Riders</h1>
          <p className="text-sm text-gray-500 mt-1">All advancing riders</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
          New Rider
        </button>
      </div>

      {riders.length === 0 ? (
        <div className="text-center py-16 bg-dark-800 border border-dark-500 rounded-xl">
          <ClipboardDocumentListIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No riders yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-blue-400 hover:text-blue-300 text-sm mt-2"
          >
            Create your first rider
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {riders.map((rider) => {
            const progress = getProgressPercent(rider.id);
            const confirmed = getConfirmedPercent(rider.id);
            const stat = stats[rider.id];

            return (
              <div
                key={rider.id}
                className="bg-dark-800 border border-dark-500 rounded-xl p-5 hover:border-teal-500/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {rider.order?.title || 'Untitled Rider'}
                  </h3>
                  <Link
                    href={`/agency/orders/${rider.order_id}/rider`}
                    className="text-gray-500 hover:text-teal-400 transition-colors shrink-0 ml-2"
                  >
                    <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                  </Link>
                </div>

                <div className="space-y-2 text-sm">
                  {rider.order?.customer && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <BuildingOfficeIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{rider.order.customer.company_name}</span>
                    </div>
                  )}
                  {rider.order?.dj && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <MusicalNoteIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{rider.order.dj.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-500">
                    <UserIcon className="h-4 w-4 shrink-0" />
                    <span>{new Date(rider.created_at).toLocaleDateString('de-DE')}</span>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="mt-4 space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-dark-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Confirmed</span>
                      <span>{confirmed}%</span>
                    </div>
                    <div className="h-1.5 bg-dark-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full transition-all"
                        style={{ width: `${confirmed}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dark-500 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        rider.status === 'active'
                          ? 'bg-green-900/30 text-green-400 border-green-800'
                          : 'bg-gray-900/30 text-gray-400 border-gray-800'
                      }`}
                    >
                      {rider.status}
                    </span>
                    {stat && stat.customers > 0 && (
                      <span className="text-xs text-gray-500">
                        {stat.customers} customer{stat.customers > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/agency/orders/${rider.order_id}/rider`}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Open →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl bg-dark-800 border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-4">
              Create New Rider
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Select an order that doesn&apos;t have a rider yet.
            </p>

            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                All orders already have a rider. Create a new order first.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedOrderId === order.id
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-dark-500 hover:border-white/20'
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{order.title}</p>
                    <p className="text-xs text-gray-500">
                      {order.customer?.company_name || 'No customer'} •{' '}
                      {order.dj?.name || 'No DJ'}
                    </p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedOrderId('');
                }}
                className="px-4 py-2 border border-dark-500 text-gray-300 hover:text-white transition-colors text-sm rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRider}
                disabled={creating || !selectedOrderId || orders.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating...' : 'Create Rider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
