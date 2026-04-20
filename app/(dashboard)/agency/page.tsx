'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { AgencyLead, AGENCY_STATUS_OPTIONS } from '@/types';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  blue: 'bg-blue-900/30 text-blue-400 border-blue-800',
  yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  green: 'bg-green-900/30 text-green-400 border-green-800',
};

export default function AgencyPage() {
  const [leads, setLeads] = useState<AgencyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('agency_leads')
        .select('*, customer:customers(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load agency leads');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const { error } = await (supabase.from('agency_leads') as any).delete().eq('id', id);
      if (error) throw error;

      setLeads((prev) => prev.filter((l) => l.id !== id));
      toast.success('Lead deleted successfully');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    }
  };

  const getStatusLabel = (status: string) =>
    AGENCY_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;

  const getStatusColor = (status: string) => {
    const color = AGENCY_STATUS_OPTIONS.find((o) => o.value === status)?.color || 'blue';
    return STATUS_COLORS[color] || STATUS_COLORS.blue;
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Agency</h2>
          <p className="mt-1 text-sm text-gray-400">
            Track new venue and organizer leads. New entries automatically create a customer record.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/agency/new"
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Lead
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
        </div>
        <input
          type="text"
          className="input pl-10"
          placeholder="Search leads by company, email, or contact person..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-dark-500">
              <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Company</th>
              <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
              <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created By</th>
              <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
              <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
              <th className="table-cell text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-cell text-center text-gray-500 py-8">
                  {searchQuery ? 'No leads match your search.' : 'No leads yet. Create your first lead to get started.'}
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-dark-500 hover:bg-dark-800/50">
                  <td className="table-cell">
                    <Link href={`/agency/${lead.id}`} className="text-white font-medium hover:underline">
                      {lead.company_name}
                    </Link>
                    <p className="text-sm text-gray-500">{lead.city}, {lead.country}</p>
                  </td>
                  <td className="table-cell">
                    <p className="text-white">{lead.contact_person || '-'}</p>
                    <p className="text-sm text-gray-500">{lead.email}</p>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </td>
                  <td className="table-cell text-gray-400 text-sm">
                    {lead.user_email || 'Unknown'}
                  </td>
                  <td className="table-cell">
                    {lead.customer ? (
                      <Link
                        href={`/customers/${lead.customer_id}`}
                        className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300"
                      >
                        {lead.customer.company_name}
                        <ArrowTopRightOnSquareIcon className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="table-cell text-gray-400">
                    {new Date(lead.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="table-cell text-right">
                    <button
                      onClick={() => handleDelete(lead.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete lead"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
