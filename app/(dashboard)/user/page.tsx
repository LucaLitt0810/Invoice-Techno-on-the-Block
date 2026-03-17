'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { UserIcon, KeyIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function UserManagementPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchUser();
    }
  }, [mounted]);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete companies (cascade will handle related data)
      await supabase.from('companies').delete().eq('user_id', user.id);
      
      // Sign out
      await supabase.auth.signOut();
      
      toast.success('Account deleted successfully');
      window.location.href = '/';
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account');
    }
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
          User Management
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Manage your account settings and profile.
        </p>
      </div>

      {/* Profile Section */}
      <div className="card bg-dark-800 border-dark-500">
        <div className="card-header border-b border-dark-500">
          <div className="flex items-center">
            <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">
              Profile Information
            </h3>
          </div>
        </div>
        <div className="card-body">
          <div className="flex items-center mb-6">
            <div className="h-16 w-16 rounded-full bg-dark-700 border border-dark-500 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="ml-4">
              <p className="text-white font-medium">{user?.email}</p>
              <p className="text-sm text-gray-400">User ID: {user?.id?.slice(0, 8)}...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="card bg-dark-800 border-dark-500">
        <div className="card-header border-b border-dark-500">
          <div className="flex items-center">
            <KeyIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">
              Change Password
            </h3>
          </div>
        </div>
        <div className="card-body">
          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                className="input bg-dark-800 border-dark-500 text-white w-full"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                className="input bg-dark-800 border-dark-500 text-white w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={updating || !newPassword || !confirmPassword}
              className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card bg-red-900/20 border-red-800">
        <div className="card-header border-b border-red-800">
          <div className="flex items-center">
            <TrashIcon className="h-5 w-5 text-red-400 mr-2" />
            <h3 className="text-lg font-medium text-red-400 uppercase tracking-wider">
              Danger Zone
            </h3>
          </div>
        </div>
        <div className="card-body">
          <p className="text-red-300/70 mb-4">
            Once you delete your account, there is no going back. All your data including companies, customers, invoices, and products will be permanently deleted.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="inline-flex items-center px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <TrashIcon className="-ml-1 mr-2 h-5 w-5" />
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
