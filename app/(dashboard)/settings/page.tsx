'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCompany } from '@/hooks/useCompany';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { selectedCompany, setSelectedCompany } = useCompany();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'export'>('general');
  const supabase = createClient();

  // Fetch all companies for the dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      setCompanies(data || []);
    };
    fetchCompanies();
  }, []);

  const handleExport = (type: 'customers' | 'invoices' | 'payments', format: 'csv' | 'datev') => {
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }
    
    const url = `/api/export?type=${type}&format=${format}&companyId=${selectedCompany.id}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-gray-400">
          Manage your account settings and export data.
        </p>
      </div>

      {/* Company Selector */}
      <div className="card bg-dark-800 border-dark-500">
        <div className="card-header border-b border-dark-500">
          <h3 className="text-lg font-medium text-white uppercase tracking-wider">Select Company for Export</h3>
        </div>
        <div className="card-body">
          <label className="label">Company</label>
          <select
            value={selectedCompany?.id || ''}
            onChange={(e) => {
              const company = companies.find(c => c.id === e.target.value);
              setSelectedCompany(company || null);
            }}
            className="input bg-dark-800 border-dark-500 text-white w-full max-w-md"
          >
            <option value="" className="bg-dark-800">Select company...</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id} className="bg-dark-800">
                {company.name}
              </option>
            ))}
          </select>
          {companies.length === 0 && (
            <p className="text-sm text-yellow-400 mt-2">
              No companies found. <Link href="/companies/new" className="underline">Create a company first</Link>.
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-500">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`${
              activeTab === 'general'
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm uppercase tracking-wider`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`${
              activeTab === 'export'
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm uppercase tracking-wider`}
          >
            Data Export
          </button>
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="card bg-dark-800 border-dark-500">
          <div className="card-header border-b border-dark-500">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">Account Information</h3>
          </div>
          <div className="card-body space-y-4">
            <p className="text-gray-400">
              Manage your account settings through the Supabase dashboard.
            </p>
            <div className="flex space-x-4">
              <Link 
                href="/companies" 
                className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
              >
                Manage Companies
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Export Settings */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="card bg-dark-800 border-dark-500">
            <div className="card-header border-b border-dark-500">
              <h3 className="text-lg font-medium text-white uppercase tracking-wider">Export Data</h3>
            </div>
            <div className="card-body">
              <p className="text-gray-400 mb-6">
                Export your data for accounting purposes. All data is exported in CSV format compatible with most accounting software.
              </p>

              {!selectedCompany && (
                <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-800">
                  <p className="text-yellow-400 text-sm">
                    Please select a company above to enable data export.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Customers Export */}
                <div className="border border-dark-500 bg-dark-700 p-4">
                  <h4 className="font-medium text-white uppercase tracking-wider mb-2">Customers</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Export all customer data including contact information.
                  </p>
                  <button
                    onClick={() => handleExport('customers', 'csv')}
                    disabled={!selectedCompany}
                    className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider w-full disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                </div>

                {/* Invoices Export */}
                <div className="border border-dark-500 bg-dark-700 p-4">
                  <h4 className="font-medium text-white uppercase tracking-wider mb-2">Invoices</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Export all invoice data for accounting.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleExport('invoices', 'csv')}
                      disabled={!selectedCompany}
                      className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider w-full disabled:opacity-50"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => handleExport('invoices', 'datev')}
                      disabled={!selectedCompany}
                      className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider w-full disabled:opacity-50"
                    >
                      Export DATEV
                    </button>
                  </div>
                </div>

                {/* Payments Export */}
                <div className="border border-dark-500 bg-dark-700 p-4">
                  <h4 className="font-medium text-white uppercase tracking-wider mb-2">Payments</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Export all payment records.
                  </p>
                  <button
                    onClick={() => handleExport('payments', 'csv')}
                    disabled={!selectedCompany}
                    className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider w-full disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-yellow-900/20 border-yellow-800">
            <div className="card-body">
              <h4 className="text-sm font-medium text-yellow-400 mb-2 uppercase tracking-wider">
                Note on DATEV Export
              </h4>
              <p className="text-sm text-yellow-300/70">
                The DATEV export format follows the standard CSV format for DATEV Buchführung. 
                You may need to adjust account numbers (Konto/Gegenkonto) according to your 
                specific DATEV chart of accounts.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
