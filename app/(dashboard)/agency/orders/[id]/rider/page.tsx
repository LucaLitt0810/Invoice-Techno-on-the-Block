'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { useRiderRealtime } from '@/components/rider/useRiderRealtime';
import RiderForm from '@/components/rider/RiderForm';

export default function AgencyRiderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const supabase = createClient();
  const { user } = useAuth();

  const [orderTitle, setOrderTitle] = useState('');
  const [riderId, setRiderId] = useState<string | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);

  const { sections, fields, values, changelog, messages, loading, updateValue, confirmValue, sendMessage } =
    useRiderRealtime(riderId, user?.id || null);

  useEffect(() => {
    const fetchOrderAndRider = async () => {
      setLoadingOrder(true);
      try {
        const { data: order } = await (supabase as any)
          .from('orders')
          .select('title')
          .eq('id', orderId)
          .single();

        if (!order) {
          toast.error('Order not found');
          router.push('/agency');
          return;
        }

        setOrderTitle(order.title);

        const { data: rider } = await (supabase as any)
          .from('dj_riders')
          .select('id')
          .eq('order_id', orderId)
          .single();

        if (!rider) {
          toast.error('No rider found for this order');
          router.push(`/agency/orders/${orderId}`);
          return;
        }

        setRiderId(rider.id);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrderAndRider();
  }, [orderId, supabase, router]);

  const handleChange = async (fieldId: string, value: string | null) => {
    try {
      await updateValue(fieldId, value);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  const handleConfirm = async (valueId: string) => {
    try {
      await confirmValue(valueId, true);
      toast.success('Confirmed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm');
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    }
  };

  if (loadingOrder || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/agency/orders/${orderId}`}
          className="inline-flex items-center text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Back to Order
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">DJ Rider</h1>
        <p className="text-sm text-gray-500 mt-1">{orderTitle}</p>
      </div>

      <RiderForm
        sections={sections}
        fields={fields}
        values={values}
        changelog={changelog}
        messages={messages}
        isAgency={true}
        onChange={handleChange}
        onConfirm={handleConfirm}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
