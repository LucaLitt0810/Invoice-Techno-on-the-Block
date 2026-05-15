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

export default function CustomerRiderPage() {
  const params = useParams();
  const router = useRouter();
  const riderId = params.id as string;
  const supabase = createClient();
  const { user } = useAuth();

  const [orderTitle, setOrderTitle] = useState('');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [disabledSectionIds, setDisabledSectionIds] = useState<string[]>([]);
  const [fieldAssignments, setFieldAssignments] = useState<Record<string, string>>({});

  const { sections, fields, values, changelog, messages, loading, updateValue, confirmValue, sendMessage } =
    useRiderRealtime(riderId, user?.id || null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !riderId) return;

      try {
        // Find customer
        const { data: customer } = await (supabase as any)
          .from('customers')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!customer) {
          setHasAccess(false);
          return;
        }

        // Get rider order_id + disabled sections
        const { data: rider } = await (supabase as any)
          .from('dj_riders')
          .select('order_id, disabled_section_ids, field_assignments')
          .eq('id', riderId)
          .single();

        if (!rider) {
          setHasAccess(false);
          return;
        }

        setDisabledSectionIds(rider.disabled_section_ids || []);
        setFieldAssignments(rider.field_assignments || {});

        // Check access
        const { data: access } = await (supabase as any)
          .from('order_customer_access')
          .select('id')
          .eq('order_id', rider.order_id)
          .eq('customer_id', customer.id)
          .eq('can_view_rider', true)
          .maybeSingle();

        setHasAccess(!!access);

        // Get order title
        const { data: order } = await (supabase as any)
          .from('orders')
          .select('title')
          .eq('id', rider.order_id)
          .single();

        if (order) {
          setOrderTitle(order.title);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [user, riderId, supabase]);

  const handleChange = async (fieldId: string, value: string | null) => {
    try {
      await updateValue(fieldId, value);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  const handleConfirm = async (valueId: string) => {
    try {
      await confirmValue(valueId, false);
      toast.success('Bestätigt');
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Bestätigen');
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error: any) {
      toast.error(error.message || 'Nachricht konnte nicht gesendet werden');
    }
  };

  if (hasAccess === false) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold text-white mb-2">Zugriff verweigert</h1>
        <p className="text-gray-500">Sie haben keinen Zugriff auf diesen Rider.</p>
        <Link href="/customer/riders" className="text-blue-400 hover:text-blue-300 text-sm mt-4 inline-block">
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  if (loading || hasAccess === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Filter sections based on disabled ids
  const visibleSections = sections.filter((s) => !disabledSectionIds.includes(s.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/customer/riders"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Zurück
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">DJ Rider</h1>
        <p className="text-sm text-gray-500 mt-1">{orderTitle}</p>
      </div>

      <RiderForm
        sections={visibleSections}
        fields={fields}
        values={values}
        changelog={changelog}
        messages={messages}
        isAgency={false}
        currentUserId={user?.id}
        fieldAssignments={fieldAssignments}
        onChange={handleChange}
        onConfirm={handleConfirm}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
