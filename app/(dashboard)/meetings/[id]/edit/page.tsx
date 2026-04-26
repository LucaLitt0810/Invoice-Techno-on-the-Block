'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Meeting, MEETING_STATUS_OPTIONS } from '@/types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EditMeetingPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    meeting_date: '',
    location: '',
    attendees: '',
    agenda: '',
    notes: '',
    decisions: '',
    action_items: '',
    protocol: '',
    status: 'planned' as Meeting['status'],
  });

  useEffect(() => {
    if (params.id) fetchMeeting();
  }, [params.id]);

  const fetchMeeting = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Meeting not found');
        router.push('/meetings');
        return;
      }

      const m = data as Meeting;
      setFormData({
        title: m.title,
        meeting_date: m.meeting_date ? new Date(m.meeting_date).toISOString().slice(0, 16) : '',
        location: m.location || '',
        attendees: m.attendees || '',
        agenda: m.agenda || '',
        notes: m.notes || '',
        decisions: m.decisions || '',
        action_items: m.action_items || '',
        protocol: m.protocol || '',
        status: m.status,
      });
    } catch (error) {
      console.error('Error fetching meeting:', error);
      toast.error('Failed to load meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = {
        ...formData,
        location: formData.location || null,
        attendees: formData.attendees || null,
        agenda: formData.agenda || null,
        notes: formData.notes || null,
        decisions: formData.decisions || null,
        action_items: formData.action_items || null,
        protocol: formData.protocol || null,
      };

      const { error } = await (supabase.from('meetings') as any)
        .update(updateData)
        .eq('id', params.id);

      if (error) throw error;

      toast.success('Meeting updated successfully');
      router.push(`/meetings/${params.id}`);
    } catch (error: any) {
      console.error('Error updating meeting:', error);
      toast.error(error.message || 'Failed to update meeting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href={`/meetings/${params.id}`} className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Meeting
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Edit Meeting</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card bg-dark-800 space-y-8">
        <div className="card-body space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Meeting Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Title *</label>
                <input type="text" className="input" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} required />
              </div>
              <div>
                <label className="label">Date & Time *</label>
                <input type="datetime-local" className="input" value={formData.meeting_date} onChange={(e) => handleChange('meeting_date', e.target.value)} required />
              </div>
              <div>
                <label className="label">Location</label>
                <input type="text" className="input" value={formData.location} onChange={(e) => handleChange('location', e.target.value)} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={formData.status} onChange={(e) => handleChange('status', e.target.value)}>
                  {MEETING_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-dark-800">{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Attendees</label>
                <input type="text" className="input" value={formData.attendees} onChange={(e) => handleChange('attendees', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Agenda</h3>
            <textarea className="input min-h-[120px]" value={formData.agenda} onChange={(e) => handleChange('agenda', e.target.value)} />
          </div>

          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Notes & Decisions</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label">Meeting Notes</label>
                <textarea className="input min-h-[150px]" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} />
              </div>
              <div>
                <label className="label">Decisions</label>
                <textarea className="input min-h-[150px]" value={formData.decisions} onChange={(e) => handleChange('decisions', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Action Items</h3>
            <textarea className="input min-h-[120px]" value={formData.action_items} onChange={(e) => handleChange('action_items', e.target.value)} />
          </div>

          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Protokoll</h3>
            <textarea className="input min-h-[200px]" value={formData.protocol} onChange={(e) => handleChange('protocol', e.target.value)} placeholder="Meeting protocol / minutes..." />
          </div>
        </div>

        <div className="px-8 py-5 border-t border-dark-500 flex justify-end space-x-4">
          <Link href={`/meetings/${params.id}`} className="px-6 py-3 border border-dark-500 text-gray-300 hover:text-white hover:border-white transition-colors text-sm font-medium uppercase tracking-wider">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="px-6 py-3 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50">
            {saving ? 'Saving...' : 'Update Meeting'}
          </button>
        </div>
      </form>
    </div>
  );
}
