'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DJ } from '@/types/bookings';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AdminDJsPage() {
  const supabase = createClient();
  const [djs, setDjs] = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDJ, setEditingDJ] = useState<DJ | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchDJs();
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
      const response = await fetch('/api/djs?active=false');
      if (!response.ok) throw new Error('Failed to fetch DJs');
      
      const data = await response.json();
      setDjs(data.djs || []);
    } catch (error) {
      console.error('Error fetching DJs:', error);
      toast.error('Failed to load DJs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    try {
      const url = editingDJ ? `/api/djs/${editingDJ.id}` : '/api/djs';
      const method = editingDJ ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save DJ');
      }
      
      toast.success(editingDJ ? 'DJ updated successfully' : 'DJ created successfully');
      setShowModal(false);
      setEditingDJ(null);
      setFormData({ name: '', email: '', phone: '' });
      fetchDJs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save DJ');
    }
  };

  const handleDelete = async (dj: DJ) => {
    if (!confirm(`Are you sure you want to delete ${dj.name}?`)) return;
    
    try {
      const response = await fetch(`/api/djs/${dj.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete DJ');
      
      toast.success('DJ deleted successfully');
      fetchDJs();
    } catch (error) {
      toast.error('Failed to delete DJ');
    }
  };

  const openEditModal = (dj: DJ) => {
    setEditingDJ(dj);
    setFormData({
      name: dj.name,
      email: dj.email || '',
      phone: dj.phone || '',
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingDJ(null);
    setFormData({ name: '', email: '', phone: '' });
    setShowModal(true);
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
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            DJ Management
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Manage DJs for the booking system
          </p>
        </div>
        <div className="mt-4 flex md:mt-0">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add DJ
          </button>
        </div>
      </div>

      {/* DJs Table */}
      <div className="card bg-dark-800 border-dark-500">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-dark-500">
            <thead className="bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-500">
              {djs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No DJs found. Create your first DJ to get started.
                  </td>
                </tr>
              ) : (
                djs.map((dj) => (
                  <tr key={dj.id} className="hover:bg-dark-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{dj.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{dj.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">{dj.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                        dj.active 
                          ? 'bg-green-900/50 text-green-400 border border-green-800' 
                          : 'bg-gray-700 text-gray-400 border border-gray-600'
                      }`}>
                        {dj.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => openEditModal(dj)}
                          className="text-gray-400 hover:text-white"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(dj)}
                          className="text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
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
                  {editingDJ ? 'Edit DJ' : 'Add New DJ'}
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
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="DJ Name"
                    required
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="dj@example.com"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+49 123 456789"
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
                    {editingDJ ? 'Update DJ' : 'Create DJ'}
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
