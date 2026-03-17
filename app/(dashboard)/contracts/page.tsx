'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Contract, CONTRACT_TYPES, CONTRACT_STATUS_LABELS } from '@/types/contracts';
import { formatCurrency, formatDate } from '@/lib/utils/helpers';
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          company:companies(name),
          customer:customers(company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;

    try {
      const { error } = await (supabase.from('contracts') as any).delete().eq('id', id);
      if (error) throw error;
      
      setContracts((prev) => prev.filter((c) => c.id !== id));
      toast.success('Contract deleted successfully');
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('Failed to delete contract');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-dark-600 text-gray-400 border-dark-400',
      sent: 'bg-blue-900/50 text-blue-400 border-blue-800',
      accepted: 'bg-green-900/50 text-green-400 border-green-800',
      rejected: 'bg-red-900/50 text-red-400 border-red-800',
      expired: 'bg-gray-700 text-gray-400 border-gray-600',
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 text-xs font-medium uppercase tracking-wider border ${styles[status] || styles.draft}`}>
        {CONTRACT_STATUS_LABELS[status as keyof typeof CONTRACT_STATUS_LABELS] || status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeInfo = CONTRACT_TYPES.find(t => t.value === type);
    const colors: Record<string, string> = {
      blue: 'bg-blue-900/50 text-blue-400 border-blue-800',
      green: 'bg-green-900/50 text-green-400 border-green-800',
      red: 'bg-red-900/50 text-red-400 border-red-800',
      gray: 'bg-gray-700 text-gray-400 border-gray-600',
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 text-xs font-medium uppercase tracking-wider border ${colors[typeInfo?.color || 'gray']}`}>
        {typeInfo?.label.split('(')[0].trim() || type}
      </span>
    );
  };

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch = 
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.customer?.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === '' || contract.contract_type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            Contracts
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Manage DJ booking offers, confirmations, and rejections.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/contracts/new"
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Contract
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            className="input block w-full pl-10 bg-dark-800 border-dark-500 text-white"
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="input bg-dark-800 border-dark-500 text-white w-full sm:w-48"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {CONTRACT_TYPES.map((type) => (
            <option key={type.value} value={type.value} className="bg-dark-800">
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Contracts table */}
      <div className="card bg-dark-800 border-dark-500">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-dark-500">
            <thead className="bg-dark-700">
              <tr>
                <th className="table-header-cell">Number</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Title</th>
                <th className="table-header-cell">Customer</th>
                <th className="table-header-cell">Event Date</th>
                <th className="table-header-cell">Fee</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-500">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    {searchQuery || typeFilter ? 'No contracts found matching your filters.' : 'No contracts yet. Create your first contract!'}
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-dark-700/50">
                    <td className="table-cell font-mono text-gray-400">
                      {contract.contract_number}
                    </td>
                    <td className="table-cell">
                      {getTypeBadge(contract.contract_type)}
                    </td>
                    <td className="table-cell font-medium text-white">
                      {contract.title}
                    </td>
                    <td className="table-cell text-gray-400">
                      {contract.customer?.company_name}
                    </td>
                    <td className="table-cell text-gray-400">
                      {contract.event_date ? formatDate(contract.event_date) : '-'}
                    </td>
                    <td className="table-cell text-white">
                      {formatCurrency(contract.fee)}
                    </td>
                    <td className="table-cell">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-3">
                        <Link href={`/contracts/${contract.id}`} className="text-gray-400 hover:text-white" title="View">
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <Link href={`/api/contracts/${contract.id}/pdf`} target="_blank" className="text-gray-400 hover:text-yellow-400" title="PDF">
                          <DocumentTextIcon className="h-5 w-5" />
                        </Link>
                        <button onClick={() => handleDelete(contract.id)} className="text-gray-400 hover:text-red-400" title="Delete">
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
    </div>
  );
}
