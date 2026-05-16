'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/update`,
      });

      if (error) throw error;

      setSent(true);
      toast.success('Password reset instructions sent to your email!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <>
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-5">
            <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          </div>
          <div className="text-xl font-bold tracking-wide text-blue-400">Techno on the Block</div>
          <div className="text-sm font-medium text-gray-500 uppercase tracking-widest mt-1">Workspace</div>
        </div>

        <div className="card-glass p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20">
            <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-wider mb-2">Check your email</h2>
            <p className="text-gray-400 text-sm">
              We&apos;ve sent password reset instructions to <span className="text-white">{email}</span>
            </p>
          </div>
          <Link href="/login" className="btn-secondary w-full inline-flex">
            Return to sign in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-5">
          <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
          </svg>
        </div>
        <div className="text-xl font-bold tracking-wide text-blue-400">Techno on the Block</div>
        <div className="text-sm font-medium text-gray-500 uppercase tracking-widest mt-1">Workspace</div>
      </div>

      <div className="card-glass p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-wider mb-2">Reset Password</h2>
          <p className="text-gray-400 text-sm">
            Enter your email address and we&apos;ll send you instructions to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="label">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Sending...' : 'Send reset instructions'}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
