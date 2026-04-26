'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Meeting, MEETING_STATUS_OPTIONS } from '@/types';
import { ArrowLeftIcon, PencilIcon, TrashIcon, CalendarIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  blue: 'bg-blue-900/30 text-blue-400 border-blue-800',
  yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  green: 'bg-green-900/30 text-green-400 border-green-800',
  red: 'bg-red-900/30 text-red-400 border-red-800',
};

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

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
      setMeeting(data);
    } catch (error) {
      console.error('Error fetching meeting:', error);
      toast.error('Failed to load meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this meeting?')) return;

    try {
      const { error } = await (supabase.from('meetings') as any).delete().eq('id', params.id);
      if (error) throw error;
      toast.success('Meeting deleted');
      router.push('/meetings');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  const getStatusLabel = (status: string) =>
    MEETING_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;

  const getStatusColor = (status: string) => {
    const color = MEETING_STATUS_OPTIONS.find((o) => o.value === status)?.color || 'blue';
    return STATUS_COLORS[color] || STATUS_COLORS.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Meeting not found.</p>
        <Link href="/meetings" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">Back to Meetings</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href="/meetings" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Meetings
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{meeting.title}</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(meeting.status)}`}>
              {getStatusLabel(meeting.status)}
            </span>
          </div>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <Link
            href={`/meetings/${meeting.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-white text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PencilIcon className="-ml-1 mr-2 h-5 w-5" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <TrashIcon className="-ml-1 mr-2 h-5 w-5" />
            Delete
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="card bg-dark-800">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-gray-500 mr-3" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Date & Time</p>
                <p className="text-white">{new Date(meeting.meeting_date).toLocaleString('de-DE')}</p>
              </div>
            </div>
            {meeting.location && (
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 text-gray-500 mr-3" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Location</p>
                  <p className="text-white">{meeting.location}</p>
                </div>
              </div>
            )}
            {meeting.attendees && (
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-gray-500 mr-3" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Attendees</p>
                  <p className="text-white">{meeting.attendees}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {meeting.agenda && (
          <div className="card bg-dark-800">
            <div className="card-body">
              <h3 className="text-lg font-medium text-white mb-4">Agenda</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{meeting.agenda}</p>
            </div>
          </div>
        )}
        {meeting.notes && (
          <div className="card bg-dark-800">
            <div className="card-body">
              <h3 className="text-lg font-medium text-white mb-4">Notes</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{meeting.notes}</p>
            </div>
          </div>
        )}
        {meeting.decisions && (
          <div className="card bg-dark-800">
            <div className="card-body">
              <h3 className="text-lg font-medium text-white mb-4">Decisions</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{meeting.decisions}</p>
            </div>
          </div>
        )}
        {meeting.action_items && (
          <div className="card bg-dark-800">
            <div className="card-body">
              <h3 className="text-lg font-medium text-white mb-4">Action Items</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{meeting.action_items}</p>
            </div>
          </div>
        )}
        {meeting.protocol && (
          <div className="card bg-dark-800 md:col-span-2">
            <div className="card-body">
              <h3 className="text-lg font-medium text-white mb-4">Protokoll</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{meeting.protocol}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
