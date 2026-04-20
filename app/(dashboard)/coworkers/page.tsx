'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Company } from '@/types';
import { PlusIcon, PencilIcon, TrashIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

export default function CoworkersPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      // Fetch ALL companies (shared data)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load coworkers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coworker? All associated data will be deleted.')) return;

    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      toast.success('Coworker deleted successfully');
    } catch (error) {
      console.error('Error deleting coworker:', error);
      toast.error('Failed to delete coworker');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            Coworkers
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Shared coworkers - all users can access and manage these.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/coworkers/new"
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Coworker
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {companies.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-dark-800 border border-dark-500">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-white">No coworkers</h3>
            <p className="mt-1 text-sm text-gray-400">Get started by creating a new coworker.</p>
            <div className="mt-6">
              <Link href="/coworkers/new" className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider">
                Add Coworker
              </Link>
            </div>
          </div>
        ) : (
          companies.map((company) => (
            <div key={company.id} className="card bg-dark-800 border-dark-500">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-dark-700 flex items-center justify-center border border-dark-500">
                        <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-white">{company.name}</h3>
                      <p className="text-sm text-gray-400">{company.city}, {company.country}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/coworkers/${company.id}`}
                      className="text-gray-400 hover:text-white"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(company.id)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1 text-sm text-gray-400">
                  <p>{company.street}</p>
                  <p>{company.postal_code} {company.city}</p>
                  <p>{company.email}</p>
                  {company.phone && <p>{company.phone}</p>}
                </div>

                {(company.tax_number || company.vat_id) && (
                  <div className="mt-4 pt-4 border-t border-dark-500 text-xs text-gray-500">
                    {company.tax_number && <p>Tax: {company.tax_number}</p>}
                    {company.vat_id && <p>VAT: {company.vat_id}</p>}
                  </div>
                )}

                {company.iban && (
                  <div className="mt-2 text-xs text-gray-500">
                    <p>IBAN: {company.iban}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
