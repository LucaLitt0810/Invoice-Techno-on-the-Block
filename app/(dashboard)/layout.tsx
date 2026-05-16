'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { Company } from '@/types';
import { 
  HomeIcon, 
  UsersIcon, 
  DocumentTextIcon, 
  ShoppingBagIcon, 
  BuildingOfficeIcon, 
  ShieldCheckIcon,
  BriefcaseIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  PlusIcon,
  Bars3Icon,
  DocumentCheckIcon,
  CalendarIcon,
  ClockIcon,
  BanknotesIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

// Navigation based on role
const getNavigation = (role: string | undefined) => {
  // DJ role: only see bookings calendar and unavailability
  if (role === 'dj') {
    return [
      { name: 'DJ-Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'Bookings', href: '/bookings', icon: CalendarIcon },
      { name: 'My Unavailability', href: '/bookings/unavailability', icon: ClockIcon },
    ];
  }

  // User role: limited access
  if (role === 'user') {
    return [
      { name: 'Customers', href: '/customers', icon: UsersIcon },
      { name: 'Agency', href: '/agency', icon: BriefcaseIcon },
    ];
  }

  // Admin/Manager: see everything
  return [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Invoices', href: '/invoices', icon: DocumentTextIcon },
    { name: 'Contracts', href: '/contracts', icon: DocumentCheckIcon },
    { name: 'B2B', href: '/b2b', icon: BuildingOfficeIcon },
    { name: 'Agency', href: '/agency', icon: BriefcaseIcon },
    { name: 'DJ Riders', href: '/riders', icon: DocumentCheckIcon },
    { name: 'DJ Bookings', href: '/bookings', icon: CalendarIcon },
    { name: 'Bookkeeping', href: '/bookkeeping', icon: BanknotesIcon },
    { name: 'Personal', href: '/personal', icon: UserGroupIcon },
    { name: 'Meetings', href: '/meetings', icon: CalendarDaysIcon },
    { name: 'Admin', href: '/admin/users', icon: ShieldCheckIcon },
  ];
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { companies, selectedCompany, loading: companyLoading, selectCompany } = useCompany();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setUserRole(user.user_metadata?.role || 'user');
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    router.push('/login');
  };

  const handleCompanySelect = (company: Company) => {
    selectCompany(company);
    setCompanyDropdownOpen(false);
    toast.success(`Switched to ${company.name}`);
  };

  if (loading || companyLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0a0a0a] border-r border-white/[0.06]">
            <div className="absolute top-0 right-0 -mr-12 pt-4">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full border border-dark-500 text-gray-400 hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-6 mb-8">
                <div className="text-lg font-bold tracking-wider leading-tight">
                  <div className="text-blue-500">Techno on the Block</div>
                  <div className="text-white">Workspace</div>
                </div>
              </div>
              <nav className="px-3 space-y-0.5">
                {getNavigation(userRole).map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-4 py-2.5 text-sm font-medium uppercase tracking-wider rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'text-white border-l-2 border-blue-500 bg-blue-500/[0.06]'
                          : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-white/[0.06] p-4 gap-2">
              <Link
                href="/settings"
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium uppercase tracking-wider transition-all duration-200 ${
                  pathname === '/settings'
                    ? 'text-white bg-blue-500/[0.06] border-l-2 border-blue-500'
                    : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </Link>
              <button
                onClick={() => { setSidebarOpen(false); handleSignOut(); }}
                className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.03] uppercase tracking-wider transition-all"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-all duration-300 ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}>
        <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border-r border-white/[0.06]">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6 mb-8">
              <Link href="/" className="text-lg font-bold tracking-wider leading-tight">
                <div className="text-blue-500">TOTB</div>
                {!sidebarCollapsed && <div className="text-white text-xs tracking-widest mt-0.5">WORKSPACE</div>}
              </Link>
            </div>
            <nav className="flex-1 px-3 space-y-0.5">
              {getNavigation(userRole).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={sidebarCollapsed ? item.name : undefined}
                    className={`group flex items-center px-4 py-2.5 text-sm font-medium uppercase tracking-wider rounded-lg transition-all duration-200 ${
                      sidebarCollapsed ? 'justify-center' : ''
                    } ${
                      isActive
                        ? 'text-white border-l-2 border-blue-500 bg-blue-500/[0.06]'
                        : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'
                    }`}
                  >
                    <item.icon className={`flex-shrink-0 h-5 w-5 transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'} ${sidebarCollapsed ? '' : 'mr-3'}`} />
                    {!sidebarCollapsed && item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex flex-col border-t border-white/[0.06] p-4 gap-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.03] uppercase tracking-wider transition-all"
              title={sidebarCollapsed ? 'Expand' : 'Collapse'}
            >
              <svg className={`h-5 w-5 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex gap-2">
              <Link
                href="/settings"
                title="Settings"
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium uppercase tracking-wider transition-all duration-200 ${
                  pathname === '/settings'
                    ? 'text-white bg-blue-500/[0.06] border-l-2 border-blue-500'
                    : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'
                }`}
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </Link>
              <button
                onClick={handleSignOut}
                className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.03] uppercase tracking-wider transition-all"
                title="Sign out"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        {/* Top header */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/[0.06]">
          <button
            type="button"
            className="px-4 border-r border-dark-500 text-gray-400 hover:text-white focus:outline-none md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 px-4 flex justify-end">
            <div className="ml-4 flex items-center md:ml-6 gap-4">
              <div className="text-sm text-gray-400">
                {user?.email}
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-400">{user?.email?.charAt(0).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-8">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
