'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import OnboardingModal from '@/components/customer/OnboardingModal';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const onboardingComplete = user.user_metadata?.onboarding_complete === true;
      setShowOnboarding(!onboardingComplete);
      setChecked(true);
    }
  }, [user, authLoading, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (authLoading || !checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="border-b border-dark-500 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/customer/riders" className="text-sm font-bold uppercase tracking-widest text-white">
              Techno on the Block
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 hidden sm:inline">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="text-gray-400 hover:text-white transition-colors"
                title="Abmelden"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Onboarding Modal */}
      {showOnboarding && user && (
        <OnboardingModal
          userId={user.id}
          onComplete={() => {
            setShowOnboarding(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
