'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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

  // Refs for realtime handler to access current data without stale closures
  const fieldsRef = useRef<Record<string, DJRiderTemplateField>>({});
  const usersMapRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const map: Record<string, DJRiderTemplateField> = {};
    fields.forEach((f) => (map[f.id] = f));
    fieldsRef.current = map;
  }, [fields]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!riderId) return;
    setLoading(true);
    try {
      const { data: rider } = await supabase
        .from('dj_riders')
        .select('template_id')
        .eq('id', riderId)
        .single();

      if (!rider) return;

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

      const { data: valuesData } = await supabase
        .from('dj_rider_values')
        .select('*')
        .eq('rider_id', riderId);

      const { data: changelogData } = await supabase
        .from('dj_rider_changelog')
        .select('*')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: messagesData } = await supabase
        .from('dj_rider_messages')
        .select('*')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: true });

      // Build users map via API — always include current userId
      const messageUserIds = (messagesData || []).map((m: any) => m.user_id);
      const changelogUserIds = (changelogData || []).flatMap((c: any) => [c.changed_by, c.confirmed_by]);
      const allUserIds = Array.from(new Set([...messageUserIds, ...changelogUserIds, userId].filter(Boolean)));

      let usersMap: Record<string, any> = {};
      if (allUserIds.length > 0) {
        try {
          const res = await fetch('/api/riders/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: allUserIds }),
          });
          if (res.ok) {
            const result = await res.json();
            usersMap = result.users || {};
          }
        } catch (e) {
          // Fallback
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

      usersMapRef.current = usersMap;
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
  }, [riderId, supabase, userId]);

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
            const idx = prev.findIndex((c) => c.id === payload.new.id);
            const enriched = {
              ...payload.new,
              field: fieldsRef.current[payload.new.field_id] || null,
              changed_by_user: usersMapRef.current[payload.new.changed_by] || null,
              confirmed_by_user: usersMapRef.current[payload.new.confirmed_by] || undefined,
            };
            if (idx >= 0) {
              // Replace optimistic entry with real one
              const next = [...prev];
              next[idx] = enriched as DJRiderChangelog;
              return next;
            }
            return [enriched as DJRiderChangelog, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'dj_rider_changelog', filter: `rider_id=eq.${riderId}` },
        (payload: any) => {
          setChangelog((prev) =>
            prev.map((c) =>
              c.id === payload.new.id
                ? {
                    ...payload.new,
                    field: fieldsRef.current[payload.new.field_id] || c.field || null,
                    changed_by_user: usersMapRef.current[payload.new.changed_by] || c.changed_by_user || null,
                    confirmed_by_user: usersMapRef.current[payload.new.confirmed_by] || c.confirmed_by_user || null,
                  }
                : c
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dj_rider_messages', filter: `rider_id=eq.${riderId}` },
        (payload: any) => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === payload.new.id);
            const enriched = {
              ...payload.new,
              user: usersMapRef.current[payload.new.user_id] || null,
            };
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = enriched as DJRiderMessage;
              return next;
            }
            return [...prev, enriched as DJRiderMessage];
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

      // Optimistic changelog entry for immediate UI feedback
      const tempId = `temp-${Date.now()}-${fieldId}`;
      const optimisticLog: DJRiderChangelog = {
        id: tempId,
        rider_id: riderId,
        field_id: fieldId,
        changed_by: userId,
        old_value: oldValue,
        new_value: value,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        confirmed_by: null,
        confirmed_at: null,
        field: fieldsRef.current[fieldId] || null,
        changed_by_user: usersMapRef.current[userId] || undefined,
        confirmed_by_user: undefined,
      };
      setChangelog((prev) => [optimisticLog, ...prev]);

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

      // Explicit changelog insert (trigger removed)
      await supabase.from('dj_rider_changelog').insert({
        rider_id: riderId,
        field_id: fieldId,
        changed_by: userId,
        old_value: oldValue,
        new_value: value,
        status: 'pending',
      });
    },
    [riderId, userId, values, supabase]
  );

  const confirmValue = useCallback(
    async (valueId: string, isAgency: boolean) => {
      if (!userId) return;

      // Optimistic update — Haken sofort grün
      setValues((prev) =>
        prev.map((v) =>
          v.id === valueId
            ? {
                ...v,
                confirmed_by_agency: isAgency ? true : v.confirmed_by_agency,
                confirmed_by_customer: !isAgency ? true : v.confirmed_by_customer,
              }
            : v
        )
      );

      const update: Record<string, boolean> = isAgency
        ? { confirmed_by_agency: true }
        : { confirmed_by_customer: true };

      const { error } = await supabase
        .from('dj_rider_values')
        .update(update)
        .eq('id', valueId);
      if (error) throw error;

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

      if (data && data.length > 0) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data[0].id);
          if (exists) return prev;
          return [
            ...prev,
            {
              ...data[0],
              user: usersMapRef.current[userId] || null,
            } as DJRiderMessage,
          ];
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
