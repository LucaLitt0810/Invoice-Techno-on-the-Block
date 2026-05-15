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

      // Fetch changelog
      const { data: changelogData } = await supabase
        .from('dj_rider_changelog')
        .select('*, field:dj_rider_template_fields(*), changed_by_user:changed_by(email, user_metadata), confirmed_by_user:confirmed_by(email, user_metadata)')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('dj_rider_messages')
        .select('*, user:user_id(email, user_metadata)')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: true });

      setSections(sectionsData || []);
      setFields(fieldsData || []);
      setValues(valuesData || []);
      setChangelog(changelogData || []);
      setMessages(messagesData || []);
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
            setValues((prev) => [...prev, payload.new as DJRiderValue]);
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
        async (payload: any) => {
          // Fetch full changelog entry with joins
          const { data } = await supabase
            .from('dj_rider_changelog')
            .select('*, field:dj_rider_template_fields(*), changed_by_user:changed_by(email, user_metadata), confirmed_by_user:confirmed_by(email, user_metadata)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            setChangelog((prev) => [data as DJRiderChangelog, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dj_rider_messages', filter: `rider_id=eq.${riderId}` },
        async (payload: any) => {
          const { data } = await supabase
            .from('dj_rider_messages')
            .select('*, user:user_id(email, user_metadata)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            setMessages((prev) => [...prev, data as DJRiderMessage]);
          }
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

      const { error } = await supabase.from('dj_rider_messages').insert({
        rider_id: riderId,
        user_id: userId,
        content: content.trim(),
      });

      if (error) throw error;
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
