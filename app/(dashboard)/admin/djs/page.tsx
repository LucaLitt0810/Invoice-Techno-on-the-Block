'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DJ } from '@/types/bookings';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, PencilIcon, XMarkIcon, UserPlusIcon, CheckIcon, UserGroupIcon, MusicalNoteIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  user_metadata: {
    role?: string;
  };
}

export default function AdminDJsPage() {
  const supabase = createClient();
  const [djs, setDjs] = useState<DJ[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDJ, setEditingDJ] = useState<DJ | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedDJForInvite, setSelectedDJForInvite] = useState<DJ | null>(null);
  
  const [formData, setFormData] = useState({
    dj_code: '',
    name: '',
    email: '',
    phone: '',
    genre: '',
    bio: '',
    user_id: '',
    active: true,
  });

  const [inviteData, setInviteData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchDJs();
      fetchUsers();
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
      console.error('Error fetching DJs:', error);
      toast.error('Failed to load DJs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const generateDJCode = () => {
    const prefix = 'DJ';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNum}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dj_code || !formData.name) {
      toast.error('DJ ID and Name are required');
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
      resetForm();
      fetchDJs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save DJ');
    }
  };

  const handleDelete = async (dj: DJ) => {
    if (!confirm(`Are you sure you want to delete ${dj.name} (${dj.dj_code})?`)) return;
    
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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteData.email || !inviteData.password) {
      toast.error('Email and password are required');
      return;
    }

    try {
      // 1. Create user
      const createResponse = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteData.email,
          password: inviteData.password,
          role: 'dj',
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const userData = await createResponse.json();

      // 2. Link DJ to user
      if (selectedDJForInvite) {
        const linkResponse = await fetch(`/api/djs/${selectedDJForInvite.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...selectedDJForInvite,
            user_id: userData.user.id,
          }),
        });

        if (!linkResponse.ok) throw new Error('Failed to link DJ');
      }

      toast.success('DJ invited successfully! They can now log in.');
      setShowInviteModal(false);
      setInviteData({ email: '', password: '' });
      setSelectedDJForInvite(null);
      fetchDJs();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite DJ');
    }
  };

  const openEditModal = (dj: DJ) => {
    setEditingDJ(dj);
    setFormData({
      dj_code: dj.dj_code,
      name: dj.name,
      email: dj.email || '',
      phone: dj.phone || '',
      genre: dj.genre || '',
      bio: dj.bio || '',
      user_id: dj.user_id || '',
      active: dj.active,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingDJ(null);
    setFormData({
      dj_code: generateDJCode(),
      name: '',
      email: '',
      phone: '',
      genre: '',
      bio: '',
      user_id: '',
      active: true,
    });
    setShowModal(true);
  };

  const openInviteModal = (dj: DJ) => {
    setSelectedDJForInvite(dj);
    setInviteData({
      email: dj.email || '',
      password: '',
    });
    setShowInviteModal(true);
  };

  const resetForm = () => {
    setFormData({
      dj_code: '',
      name: '',
      email: '',
      phone: '',
      genre: '',
      bio: '',
      user_id: '',
      active: true,
    });
  };

  const getLinkedUser = (userId: string | null) => {
    if (!userId) return null;
    return users.find(u => u.id === userId);
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
            className="inline-flex items-center px-4 py-2 bg-white text-black text-sm font-medium uppercase tracking-wider"
          >
            <MusicalNoteIcon className="-ml-1 mr-2 h-5 w-5" />
            DJs
          </a>
          <a
            href="/admin/unavailability"
            className="inline-flex items-center px-4 py-2 text-gray-400 hover:text-white hover:bg-dark-700 text-sm font-medium uppercase tracking-wider transition-colors"
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
            DJ Management
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Create and manage DJs for the booking system
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
                  DJ ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Genre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
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
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No DJs found. Create your first DJ to get started.
                  </td>
                </tr>
              ) : (
                djs.map((dj) => {
                  const linkedUser = getLinkedUser(dj.user_id);
                  return (
                    <tr key={dj.id} className="hover:bg-dark-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-blue-400">{dj.dj_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{dj.name}</div>
                        <div className="text-xs text-gray-500">{dj.email || 'No email'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{dj.genre || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {linkedUser ? (
                          <div className="flex items-center">
                            <CheckIcon className="h-4 w-4 text-green-400 mr-1" />
                            <span className="text-sm text-green-400">{linkedUser.email}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => openInviteModal(dj)}
                            className="inline-flex items-center text-xs text-yellow-400 hover:text-yellow-300"
                          >
                            <UserPlusIcon className="h-4 w-4 mr-1" />
                            Invite
                          </button>
                        )}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DJ Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-dark-800 border border-dark-500 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
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
                {/* DJ ID */}
                <div>
                  <label className="label">DJ ID *</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      className="input bg-dark-800 border-dark-500 text-white w-full font-mono"
                      value={formData.dj_code}
                      onChange={(e) => setFormData({ ...formData, dj_code: e.target.value.toUpperCase() })}
                      placeholder="DJ-0001"
                      required
                      disabled={!!editingDJ}
                    />
                    {!editingDJ && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, dj_code: generateDJCode() })}
                        className="px-3 py-2 border border-dark-500 text-gray-400 hover:text-white text-xs whitespace-nowrap"
                      >
                        Generate
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Unique identifier for this DJ</p>
                </div>

                {/* Name */}
                <div>
                  <label className="label">DJ Name *</label>
                  <input
                    type="text"
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="DJ Max"
                    required
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>

                {/* Genre */}
                <div>
                  <label className="label">Genre</label>
                  <input
                    type="text"
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    placeholder="Techno, House, etc."
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="label">Bio</label>
                  <textarea
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Short biography..."
                  />
                </div>

                {/* User Link */}
                <div>
                  <label className="label">Linked User Account</label>
                  <select
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  >
                    <option value="">Not linked</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email} {user.user_metadata?.role === 'dj' ? '(DJ)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Link to existing user account</p>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    className="h-4 w-4 bg-dark-800 border-dark-500 rounded"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <label htmlFor="active" className="ml-2 text-sm text-gray-300">
                    Active DJ
                  </label>
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

      {/* Invite Modal */}
      {showInviteModal && selectedDJForInvite && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowInviteModal(false)}
            />
            <div className="relative bg-dark-800 border border-dark-500 max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white uppercase tracking-wider">
                  Invite DJ
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-dark-700 rounded">
                <p className="text-sm text-gray-300">
                  Creating login for: <span className="text-white font-medium">{selectedDJForInvite.name}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  DJ ID: {selectedDJForInvite.dj_code}
                </p>
              </div>

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="label">Email *</label>
                  <input
                    type="email"
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="dj@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <input
                    type="text"
                    className="input bg-dark-800 border-dark-500 text-white w-full"
                    value={inviteData.password}
                    onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                  />
                  <p className="mt-1 text-xs text-gray-500">Share this password with the DJ</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-green-500 bg-green-500 text-black hover:bg-transparent hover:text-green-500 transition-colors text-sm font-medium uppercase tracking-wider"
                  >
                    <UserPlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Create & Invite
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
