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
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  PlusIcon,
  Bars3Icon,
  DocumentCheckIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Navigation based on role
const getNavigation = (role: string | undefined) => {
  // DJ role: only see bookings and unavailability
  if (role === 'dj') {
    return [
      { name: 'DJ-Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'My Bookings', href: '/bookings', icon: CalendarIcon },
      { name: 'My Unavailability', href: '/bookings/unavailability', icon: ClockIcon },
    ];
  }
  
  // Admin/Manager: see everything
  return [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Invoices', href: '/invoices', icon: DocumentTextIcon },
    { name: 'Contracts', href: '/contracts', icon: DocumentCheckIcon },
    { name: 'Bookings', href: '/bookings', icon: CalendarIcon },
    { name: 'Products', href: '/products', icon: ShoppingBagIcon },
    { name: 'Customers', href: '/customers', icon: UsersIcon },
    { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
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
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-dark-800 border-r border-dark-500">
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
                  <div className="text-white">Invoice Center</div>
                </div>
              </div>
              <nav className="px-4 space-y-1">
                {getNavigation(userRole).map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-sm font-medium uppercase tracking-wider transition-colors ${
                      pathname === item.href
                        ? 'bg-white text-black'
                        : 'text-gray-400 hover:bg-dark-700 hover:text-white'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-3 flex-shrink-0 h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-dark-800 border-r border-dark-500">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6 mb-8">
              <Link href="/" className="text-lg font-bold tracking-wider leading-tight">
                <div className="text-blue-500">Techno on the Block</div>
                <div className="text-white">Invoice Center</div>
              </Link>
            </div>
            <nav className="flex-1 px-4 space-y-1">
              {getNavigation(userRole).map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium uppercase tracking-wider transition-colors ${
                    pathname === item.href
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:bg-dark-700 hover:text-white'
                  }`}
                >
                  <item.icon className="mr-3 flex-shrink-0 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-dark-500 p-4">
            <button
              onClick={handleSignOut}
              className="flex items-center text-sm font-medium text-gray-400 hover:text-white uppercase tracking-wider"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top header */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-dark-800/90 backdrop-blur-md border-b border-dark-500">
          <button
            type="button"
            className="px-4 border-r border-dark-500 text-gray-400 hover:text-white focus:outline-none md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              {/* Company Selector */}
              {companies.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center space-x-2 text-sm font-medium text-gray-300 hover:text-white focus:outline-none"
                    onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                  >
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    <span className="uppercase tracking-wider">{selectedCompany?.name || 'Select Company'}</span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  </button>

                  {companyDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-dark-800 border border-dark-500 shadow-xl z-50">
                      <div className="py-1" role="menu">
                        {companies.map((company) => (
                          <button
                            key={company.id}
                            onClick={() => handleCompanySelect(company)}
                            className={`block w-full text-left px-4 py-2 text-sm uppercase tracking-wider ${
                              selectedCompany?.id === company.id
                                ? 'bg-white text-black'
                                : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                            }`}
                          >
                            {company.name}
                          </button>
                        ))}
                        <div className="border-t border-dark-500">
                          <Link
                            href="/companies/new"
                            className="flex items-center px-4 py-2 text-sm text-white hover:bg-dark-700 uppercase tracking-wider"
                            onClick={() => setCompanyDropdownOpen(false)}
                          >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add New Company
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ml-4 flex items-center md:ml-6">
              <div className="text-sm text-gray-400">
                {user?.email}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
