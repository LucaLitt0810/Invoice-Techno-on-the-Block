'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DJ, DJUnavailability } from '@/types/bookings';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, XMarkIcon, UserGroupIcon, MusicalNoteIcon, CalendarIcon } from '@heroicons/react/24/outline';

const UNAVAILABILITY_TYPES = [
  { value: 'vacation', label: 'Vacation', color: 'bg-blue-900/50 text-blue-400' },
  { value: 'sick', label: 'Sick Leave', color: 'bg-red-900/50 text-red-400' },
  { value: 'personal', label: 'Personal', color: 'bg-purple-900/50 text-purple-400' },
  { value: 'other', label: 'Other', color: 'bg-gray-700 text-gray-400' },
];

export default function AdminUnavailabilityPage() {
  const supabase = createClient();
  const [djs, setDjs] = useState<DJ[]>([]);
  const [unavailability, setUnavailability] = useState<DJUnavailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDJ, setSelectedDJ] = useState<string>('');
  
  const [formData, setFormData] = useState({
    dj_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    type: 'vacation' as const,
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchDJs();
      fetchUnavailability();
    }
  }, [isAdmin]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    
    const role = user.user_metadata?.role || 'user';
    if (role !== 'admin') {
      toast.error('Admin access required');
      window.location.href = '/dashboard';
      return;
    }
    setIsAdmin(true);
  };

  const fetchDJs = async () => {
    try {
      const response = await fetch('/api/djs');
      if (!response.ok) throw new Error('Failed to fetch DJs');
      const data = await response.json();
      setDjs(data.djs || []);
    } catch (error) {
      toast.error('Failed to load DJs');
    }
  };

  const fetchUnavailability = async () => {
    try {
      const response = await fetch('/api/unavailability');
      if (!response.ok) throw new Error('Failed to fetch unavailability');
      const data = await response.json();
      setUnavailability(data.unavailability || []);
    } catch (error) {
      toast.error('Failed to load unavailability');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dj_id || !formData.start_date || !formData.end_date) {
      toast.error('DJ, Start Date and End Date are required');
      return;
    }

    try {
      const response = await fetch('/api/unavailability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create unavailability');
      }
      
      toast.success('Unavailability added successfully');
      setShowModal(false);
      resetForm();
      fetchUnavailability();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create unavailability');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this unavailability?')) return;
    
    try {
      const response = await fetch(`/api/unavailability/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      toast.success('Unavailability deleted');
      fetchUnavailability();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      dj_id: selectedDJ || '',
      start_date: '',
      end_date: '',
      reason: '',
      type: 'vacation',
    });
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const getTypeLabel = (type: string) => {
    return UNAVAILABILITY_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTypeColor = (type: string) => {
    return UNAVAILABILITY_TYPES.find(t => t.value === type)?.color || 'bg-gray-700 text-gray-400';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Navigation */}
      <div className="border-b border-dark-500 pb-4">
        <div className="flex space-x-1">
          <a
            href="/admin/users"
            className="inline-flex items-center px-4 py-2 text-gray-400 hover:text-white hover:bg-dark-700 text-sm font-medium uppercase tracking-wider transition-colors"
          >
            <UserGroupIcon className="-ml-1 mr-2 h-5 w-5" />
            Users
          </a>
          <a
            href="/admin/djs"
            className="inline-flex items-center px-4 py-2 text-gray-400 hover:text-white hover:bg-dark-700 text-sm font-medium uppercase tracking-wider transition-colors"
          >
            <MusicalNoteIcon className="-ml-1 mr-2 h-5 w-5" />
            DJs
          </a>
          <a
            href="/admin/unavailability"
            className="inline-flex items-center px-4 py-2 bg-white text-black text-sm font-medium uppercase tracking-wider"
          >
            <CalendarIcon className="-ml-1 mr-2 h-5 w-5" />
            Unavailability
          </a>
        </div>
      </div>

      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            DJ Unavailability
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Manage DJ vacation, sick leave, and other unavailability
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 space-x-3">
          <select
            className="input bg-dark-800 border-dark-500 text-white"
            value={selectedDJ}
            onChange={(e) => setSelectedDJ(e.target.value)}
          >
            <option value="">All DJs</option>
            {djs.map((dj) => (
              <option key={dj.id} value={dj.id}>{dj.name}</option>
            ))}
          </select>
          <button
            onClick={openModal}
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Block
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        {UNAVAILABILITY_TYPES.map((type) => (
          <div key={type.value} className="flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${type.color.split(' ')[0]}`}></span>
            <span className="text-gray-300">{type.label}</span>
          </div>
        ))}
      </div>

      {/* Unavailability List */}
      <div className="card bg-dark-800 border-dark-500">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-dark-500">
            <thead className="bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  DJ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Start
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  End
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-500">
              {unavailability
                .filter(u => !selectedDJ || u.dj_id === selectedDJ)
                .length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No unavailability blocks found.
                  </td>
                </tr>
              ) : (
                unavailability
                  .filter(u => !selectedDJ || u.dj_id === selectedDJ)
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-dark-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{u.dj?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getTypeColor(u.type)}`}>
                          {getTypeLabel(u.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{formatDateTime(u.start_date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{formatDateTime(u.end_date)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{u.reason || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-dark-800 border border-dark-500 max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white uppercase tracking-wider">
                  Add Unavailability
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">DJ *</label>
                  <select
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={formData.dj_id}
                    onChange={(e) => setFormData({ ...formData, dj_id: e.target.value })}
                    required
                  >
                    <option value="">Select DJ...</option>
                    {djs.map((dj) => (
                      <option key={dj.id} value={dj.id}>{dj.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Type *</label>
                  <select
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    required
                  >
                    {UNAVAILABILITY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Start Date *</label>
                    <input
                      type="datetime-local"
                      className="input bg-dark-800 border-dark-500 text-white w-full"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">End Date *</label>
                    <input
                      type="datetime-local"
                      className="input bg-dark-800 border-dark-500 text-white w-full"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Reason</label>
                  <input
                    type="text"
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g., Summer vacation"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
                  >
                    Add Block
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
