'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { AgencyLead, AGENCY_STATUS_OPTIONS } from '@/types';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, PencilIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  blue: 'bg-blue-900/30 text-blue-400 border-blue-800',
  yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  green: 'bg-green-900/30 text-green-400 border-green-800',
};

export default function AgencyLeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [lead, setLead] = useState<AgencyLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [editData, setEditData] = useState({
    status: 'contacted' as AgencyLead['status'],
    notes: '',
  });

  useEffect(() => {
    if (params.id) fetchLead();
  }, [params.id]);

  const fetchLead = async () => {
    try {
      const { data, error } = await supabase
        .from('agency_leads')
        .select('*, customer:customers(*)')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setLead(data);
      setEditData({ status: data.status, notes: data.notes || '' });
    } catch (error) {
      console.error('Error fetching lead:', error);
      toast.error('Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('agency_leads')
        .update({
          status: editData.status,
          notes: editData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (error) throw error;

      setLead((prev) =>
        prev
          ? {
              ...prev,
              status: editData.status,
              notes: editData.notes || null,
            }
          : null
      );
      setEditMode(false);
      toast.success('Lead updated successfully');
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const getStatusLabel = (status: string) =>
    AGENCY_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;

  const getStatusColor = (status: string) => {
    const color = AGENCY_STATUS_OPTIONS.find((o) => o.value === status)?.color || 'blue';
    return STATUS_COLORS[color] || STATUS_COLORS.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Lead not found.</p>
        <Link href="/agency" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
          Back to Agency
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href="/agency" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Agency
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{lead.company_name}</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(lead.status)}`}>
              {getStatusLabel(lead.status)}
            </span>
          </div>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="inline-flex items-center px-4 py-2 border border-white text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PencilIcon className="-ml-1 mr-2 h-5 w-5" />
              Edit
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setEditMode(false);
                  setEditData({ status: lead.status, notes: lead.notes || '' });
                }}
                className="px-4 py-2 border border-dark-500 text-gray-300 hover:text-white hover:border-white transition-colors text-sm font-medium uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lead Info */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Contact Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Company</dt>
                  <dd className="text-white">{lead.company_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Contact Person</dt>
                  <dd className="text-white">{lead.contact_person || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Email</dt>
                  <dd className="text-white">{lead.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Phone</dt>
                  <dd className="text-white">{lead.phone || '-'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Address</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Street</dt>
                  <dd className="text-white">{lead.street}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase">City</dt>
                  <dd className="text-white">{lead.postal_code} {lead.city}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Country</dt>
                  <dd className="text-white">{lead.country}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Status & Notes - Editable */}
          <div className="pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white mb-4">Lead Details</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label">Status</label>
                {editMode ? (
                  <select
                    className="input"
                    value={editData.status}
                    onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value as AgencyLead['status'] }))}
                  >
                    {AGENCY_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-dark-800">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(lead.status)}`}>
                    {getStatusLabel(lead.status)}
                  </span>
                )}
              </div>

              <div>
                <label className="label">Linked Customer</label>
                {lead.customer ? (
                  <Link
                    href={`/customers/${lead.customer_id}`}
                    className="inline-flex items-center text-blue-400 hover:text-blue-300"
                  >
                    {lead.customer.company_name}
                    <ArrowTopRightOnSquareIcon className="ml-1 h-4 w-4" />
                  </Link>
                ) : (
                  <span className="text-gray-500">No customer linked</span>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="label">Notes</label>
                {editMode ? (
                  <textarea
                    className="input min-h-[100px]"
                    value={editData.notes}
                    onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any notes about this lead..."
                  />
                ) : (
                  <p className="text-gray-300 whitespace-pre-wrap">{lead.notes || 'No notes added.'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="pt-6 border-t border-dark-500 text-sm text-gray-500">
            <p>Created: {new Date(lead.created_at).toLocaleString('de-DE')}</p>
            <p>Last updated: {new Date(lead.updated_at).toLocaleString('de-DE')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
