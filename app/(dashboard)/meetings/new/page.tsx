'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { MEETING_STATUS_OPTIONS } from '@/types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function NewMeetingPage() {
  const router = useRouter();
  const supabase = createClient();
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
    status: 'planned' as 'planned' | 'in_progress' | 'completed' | 'cancelled',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        ...formData,
        location: formData.location || null,
        attendees: formData.attendees || null,
        agenda: formData.agenda || null,
        notes: formData.notes || null,
        decisions: formData.decisions || null,
        action_items: formData.action_items || null,
        protocol: formData.protocol || null,
        created_by: user?.id || null,
      };

      const { data, error } = await supabase
        .from('meetings')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      toast.success('Meeting created successfully');
      router.push(`/meetings/${data.id}`);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      toast.error(error.message || 'Failed to create meeting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href="/meetings" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Meetings
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">New Meeting</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card bg-dark-800 space-y-8">
        <div className="card-body space-y-8">
          {/* Basic Info */}
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
                <input type="text" className="input" value={formData.location} onChange={(e) => handleChange('location', e.target.value)} placeholder="Room, address, or online..." />
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
                <input type="text" className="input" value={formData.attendees} onChange={(e) => handleChange('attendees', e.target.value)} placeholder="Names separated by commas..." />
              </div>
            </div>
          </div>

          {/* Agenda */}
          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Agenda</h3>
            <textarea className="input min-h-[120px]" value={formData.agenda} onChange={(e) => handleChange('agenda', e.target.value)} placeholder="Meeting agenda points..." />
          </div>

          {/* Notes & Decisions */}
          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Notes & Decisions</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label">Meeting Notes</label>
                <textarea className="input min-h-[150px]" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Notes taken during the meeting..." />
              </div>
              <div>
                <label className="label">Decisions</label>
                <textarea className="input min-h-[150px]" value={formData.decisions} onChange={(e) => handleChange('decisions', e.target.value)} placeholder="Decisions made..." />
              </div>
            </div>
          </div>

          {/* Action Items */}
          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Action Items</h3>
            <textarea className="input min-h-[120px]" value={formData.action_items} onChange={(e) => handleChange('action_items', e.target.value)} placeholder="Tasks and follow-ups..." />
          </div>

          {/* Protocol */}
          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Protokoll</h3>
            <textarea className="input min-h-[200px]" value={formData.protocol} onChange={(e) => handleChange('protocol', e.target.value)} placeholder="Meeting protocol / minutes..." />
          </div>
        </div>

        <div className="px-8 py-5 border-t border-dark-500 flex justify-end space-x-4">
          <Link href="/meetings" className="px-6 py-3 border border-dark-500 text-gray-300 hover:text-white hover:border-white transition-colors text-sm font-medium uppercase tracking-wider">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="px-6 py-3 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50">
            {saving ? 'Saving...' : 'Create Meeting'}
          </button>
        </div>
      </form>
    </div>
  );
}
