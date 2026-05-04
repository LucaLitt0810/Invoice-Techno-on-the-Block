'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeftIcon, EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user?.email) {
        setEmailForm((prev) => ({ ...prev, newEmail: user.email || '' }));
      }
    };
    fetchUser();
  }, []);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.newEmail) {
      toast.error('Please enter a new email address');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: emailForm.newEmail });
      if (error) throw error;
      toast.success('Email update requested. Check your new email inbox for confirmation.');
      setEmailForm((prev) => ({ ...prev, currentPassword: '' }));
    } catch (error: any) {
      toast.error(error.message || 'Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
      toast.success('Password updated successfully');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Settings</h2>
          <p className="mt-1 text-sm text-gray-400">
            Manage your account settings and preferences.
          </p>
        </div>
      </div>

      {/* Email */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-500/10">
              <EnvelopeIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Email Address</h3>
              <p className="text-sm text-gray-400">Change the email address associated with your account.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="label">Current Email</label>
              <input
                type="email"
                className="input bg-white/5"
                value={user?.email || ''}
                disabled
              />
            </div>
            <div>
              <label className="label">New Email Address</label>
              <input
                type="email"
                className="input"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, newEmail: e.target.value }))}
                placeholder="new@example.com"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Email'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Password */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-500/10">
              <LockClosedIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Password</h3>
              <p className="text-sm text-gray-400">Change your account password.</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                className="input"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                className="input"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
