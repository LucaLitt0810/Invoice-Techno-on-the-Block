'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DJRiderTemplateSection,
  DJRiderTemplateField,
  DJRiderValue,
  DJRiderChangelog,
  DJRiderMessage,
} from '@/types';

export function useRiderRealtime(riderId: string | null, userId: string | null) {
  const supabase = createClient() as any;

  const [sections, setSections] = useState<DJRiderTemplateSection[]>([]);
  const [fields, setFields] = useState<DJRiderTemplateField[]>([]);
  const [values, setValues] = useState<DJRiderValue[]>([]);
  const [changelog, setChangelog] = useState<DJRiderChangelog[]>([]);
  const [messages, setMessages] = useState<DJRiderMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Build field map for quick lookup
  const fieldMap = useCallback(() => {
    const map: Record<string, DJRiderTemplateField> = {};
    fields.forEach((f) => (map[f.id] = f));
    return map;
  }, [fields]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!riderId) return;
    setLoading(true);
    try {
      // Get rider with template
      const { data: rider } = await supabase
        .from('dj_riders')
        .select('template_id')
        .eq('id', riderId)
        .single();

      if (!rider) return;

      // Fetch sections and fields
      const { data: sectionsData } = await supabase
        .from('dj_rider_template_sections')
        .select('*')
        .eq('template_id', rider.template_id)
        .order('sort_order', { ascending: true });

      const sectionIds = (sectionsData || []).map((s: any) => s.id);

      const { data: fieldsData } = await supabase
        .from('dj_rider_template_fields')
        .select('*')
        .in('section_id', sectionIds)
        .order('sort_order', { ascending: true });

      // Fetch values
      const { data: valuesData } = await supabase
        .from('dj_rider_values')
        .select('*')
        .eq('rider_id', riderId);

      // Fetch changelog (simple query, no complex joins)
      const { data: changelogData } = await supabase
        .from('dj_rider_changelog')
        .select('*')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch messages with user info
      const { data: messagesData } = await supabase
        .from('dj_rider_messages')
        .select('*')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: true });

      // Get unique user IDs from messages and changelog
      const messageUserIds = (messagesData || []).map((m: any) => m.user_id);
      const changelogUserIds = (changelogData || []).flatMap((c: any) => [c.changed_by, c.confirmed_by]);
      const allUserIds = Array.from(new Set([...messageUserIds, ...changelogUserIds].filter(Boolean)));

      // Build users map from customers table (auth_user_id -> customer info)
      let usersMap: Record<string, any> = {};
      if (allUserIds.length > 0) {
        try {
          const { data: customersData } = await supabase
            .from('customers')
            .select('auth_user_id, email, company_name, contact_person')
            .in('auth_user_id', allUserIds);

          (customersData || []).forEach((c: any) => {
            usersMap[c.auth_user_id] = {
              email: c.email,
              user_metadata: {
                first_name: c.contact_person || c.company_name,
                last_name: '',
              },
            };
          });
        } catch (e) {
          // Fallback: skip user enrichment
        }
      }

      const enrichedChangelog = (changelogData || []).map((log: any) => ({
        ...log,
        field: (fieldsData || []).find((f: any) => f.id === log.field_id) || null,
        changed_by_user: usersMap[log.changed_by] || null,
        confirmed_by_user: usersMap[log.confirmed_by] || null,
      }));

      const enrichedMessages = (messagesData || []).map((msg: any) => ({
        ...msg,
        user: usersMap[msg.user_id] || null,
      }));

      setSections(sectionsData || []);
      setFields(fieldsData || []);
      setValues(valuesData || []);
      setChangelog(enrichedChangelog);
      setMessages(enrichedMessages);
    } catch (error) {
      console.error('Error fetching rider data:', error);
    } finally {
      setLoading(false);
    }
  }, [riderId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!riderId) return;

    const channel = supabase
      .channel(`rider:${riderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dj_rider_values', filter: `rider_id=eq.${riderId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setValues((prev) => {
              const exists = prev.some((v) => v.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as DJRiderValue];
            });
          } else if (payload.eventType === 'UPDATE') {
            setValues((prev) =>
              prev.map((v) => (v.id === payload.new.id ? (payload.new as DJRiderValue) : v))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dj_rider_changelog', filter: `rider_id=eq.${riderId}` },
        (payload: any) => {
          setChangelog((prev) => {
            const exists = prev.some((c) => c.id === payload.new.id);
            if (exists) return prev;
            return [payload.new as DJRiderChangelog, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dj_rider_messages', filter: `rider_id=eq.${riderId}` },
        (payload: any) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new as DJRiderMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderId, supabase]);

  const updateValue = useCallback(
    async (fieldId: string, value: string | null) => {
      if (!riderId || !userId) return;

      const existing = values.find((v) => v.field_id === fieldId);
      const oldValue = existing?.value || null;

      if (existing) {
        const { error } = await supabase
          .from('dj_rider_values')
          .update({
            value,
            last_modified_by: userId,
            last_modified_at: new Date().toISOString(),
            confirmed_by_agency: false,
            confirmed_by_customer: false,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('dj_rider_values').insert({
          rider_id: riderId,
          field_id: fieldId,
          value,
          last_modified_by: userId,
          last_modified_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      // Explicitly create changelog entry (independent of database trigger)
      const { error: changelogError } = await supabase.from('dj_rider_changelog').insert({
        rider_id: riderId,
        field_id: fieldId,
        changed_by: userId,
        old_value: oldValue,
        new_value: value,
        status: 'pending',
      });

      if (changelogError) {
        console.error('Changelog insert error:', changelogError);
      }
    },
    [riderId, userId, values, supabase]
  );

  const confirmValue = useCallback(
    async (valueId: string, isAgency: boolean) => {
      if (!userId) return;

      const update: Record<string, boolean> = isAgency
        ? { confirmed_by_agency: true }
        : { confirmed_by_customer: true };

      const { error } = await supabase
        .from('dj_rider_values')
        .update(update)
        .eq('id', valueId);

      if (error) throw error;

      // Update corresponding changelog entries to confirmed
      const value = values.find((v) => v.id === valueId);
      if (value) {
        await supabase
          .from('dj_rider_changelog')
          .update({
            status: 'confirmed',
            confirmed_by: userId,
            confirmed_at: new Date().toISOString(),
          })
          .eq('field_id', value.field_id)
          .eq('rider_id', riderId || '')
          .eq('status', 'pending');
      }
    },
    [userId, values, riderId, supabase]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!riderId || !userId || !content.trim()) return;

      const { data, error } = await supabase.from('dj_rider_messages').insert({
        rider_id: riderId,
        user_id: userId,
        content: content.trim(),
      }).select();

      if (error) throw error;

      // Optimistically add to local state (avoid duplicates from realtime)
      if (data && data.length > 0) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data[0].id);
          if (exists) return prev;
          return [...prev, data[0] as DJRiderMessage];
        });
      }
    },
    [riderId, userId, supabase]
  );

  return {
    sections,
    fields,
    values,
    changelog,
    messages,
    loading,
    updateValue,
    confirmValue,
    sendMessage,
    refresh: fetchData,
  };
}
