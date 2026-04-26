'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Meeting, MEETING_STATUS_OPTIONS } from '@/types';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon, CalendarIcon, MapPinIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  blue: 'bg-blue-900/30 text-blue-400 border-blue-800',
  yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  green: 'bg-green-900/30 text-green-400 border-green-800',
  red: 'bg-red-900/30 text-red-400 border-red-800',
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const supabase = createClient();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this meeting?')) return;

    try {
      const { error } = await (supabase.from('meetings') as any).delete().eq('id', id);
      if (error) throw error;
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      toast.success('Meeting deleted');
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

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.attendees || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Meetings</h2>
          <p className="mt-1 text-sm text-gray-400">Document and track all meetings.</p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/meetings/new"
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Meeting
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            className="input block w-full pl-10"
            placeholder="Search by title or attendees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all" className="bg-dark-800">All Status</option>
          {MEETING_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-dark-800">{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Meeting Cards */}
      {filteredMeetings.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {searchQuery || statusFilter !== 'all' ? 'No meetings match your criteria.' : 'No meetings yet. Create your first meeting!'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMeetings.map((meeting) => (
            <div key={meeting.id} className="card bg-dark-800 border-dark-500 flex flex-col">
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(meeting.status)}`}>
                      {getStatusLabel(meeting.status)}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-2">{meeting.title}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(meeting.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                    title="Delete meeting"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-2 space-y-2 flex-1">
                <div className="flex items-center text-sm text-gray-300">
                  <CalendarIcon className="h-4 w-4 text-gray-500 mr-3 flex-shrink-0" />
                  <span>{new Date(meeting.meeting_date).toLocaleString('de-DE')}</span>
                </div>
                {meeting.location && (
                  <div className="flex items-center text-sm text-gray-300">
                    <MapPinIcon className="h-4 w-4 text-gray-500 mr-3 flex-shrink-0" />
                    <span>{meeting.location}</span>
                  </div>
                )}
                {meeting.attendees && (
                  <div className="text-sm text-gray-400 mt-2">
                    <span className="text-gray-500">Attendees:</span> {meeting.attendees}
                  </div>
                )}
              </div>

              <div className="p-6 pt-4">
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="flex items-center justify-center w-full px-4 py-3 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
                >
                  View Meeting
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
