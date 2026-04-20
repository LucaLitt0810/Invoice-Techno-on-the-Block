'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Contract, CONTRACT_TYPES, CONTRACT_STATUS_LABELS } from '@/types/contracts';
import { formatCurrency, formatDate } from '@/lib/utils/helpers';
import { ArrowLeftIcon, PrinterIcon, EnvelopeIcon, CheckIcon, XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchContract();
    }
  }, [params.id]);

  const fetchContract = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          company:companies(*),
          customer:customers(*)
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (error) {
      console.error('Error fetching contract:', error);
      toast.error('Failed to load contract');
      router.push('/contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contract?')) return;

    try {
      const { error } = await (supabase.from('contracts') as any).delete().eq('id', params.id);
      if (error) throw error;
      
      toast.success('Contract deleted successfully');
      router.push('/contracts');
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('Failed to delete contract');
    }
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
      const response = await fetch(`/api/contracts/${params.id}/send`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to send email');

      toast.success('Contract sent successfully');
      
      await (supabase.from('contracts') as any).update({ status: 'sent' }).eq('id', params.id);
      fetchContract();
    } catch (error) {
      console.error('Error sending contract:', error);
      toast.error('Failed to send contract');
    } finally {
      setSending(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'accepted' | 'rejected') => {
    if (newStatus === 'rejected') {
      setShowRejectionModal(true);
      return;
    }
    
    try {
      const { error } = await (supabase
        .from('contracts') as any)
        .update({ status: newStatus })
        .eq('id', params.id);

      if (error) throw error;
      
      toast.success(`Contract marked as ${newStatus}`);
      fetchContract();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleRejectWithLetter = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setRejecting(true);
    try {
      const response = await fetch(`/api/contracts/${params.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });

      if (!response.ok) throw new Error('Failed to generate rejection letter');

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rejection-${contract?.contract_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Rejection letter generated successfully');
      setShowRejectionModal(false);
      setRejectionReason('');
      fetchContract();
    } catch (error) {
      console.error('Error rejecting contract:', error);
      toast.error('Failed to generate rejection letter');
    } finally {
      setRejecting(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-white">Contract not found</h2>
        <Link href="/contracts" className="mt-4 text-gray-400 hover:text-white">
          Back to contracts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex items-center">
          <Link href="/contracts" className="mr-4 text-gray-400 hover:text-white">
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
              {contract.contract_number}
            </h2>
            <div className="mt-1 flex items-center space-x-3">
              {getStatusBadge(contract.status)}
              {getTypeBadge(contract.contract_type)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex md:mt-0 space-x-2">
          <Link
            href={`/api/contracts/${contract.id}/pdf`}
            target="_blank"
            className="inline-flex items-center px-4 py-2 border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PrinterIcon className="-ml-1 mr-2 h-5 w-5" />
            PDF
          </Link>
          <button
            onClick={handleSendEmail}
            disabled={sending || contract.status === 'sent'}
            className="inline-flex items-center px-4 py-2 border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
          >
            <EnvelopeIcon className="-ml-1 mr-2 h-5 w-5" />
            {sending ? 'Sending...' : 'Send'}
          </button>
          <button
            onClick={() => handleStatusUpdate('accepted')}
            className="inline-flex items-center px-4 py-2 border border-green-500 text-green-400 hover:bg-green-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <CheckIcon className="-ml-1 mr-2 h-5 w-5" />
            Accept
          </button>
          <button
            onClick={() => handleStatusUpdate('rejected')}
            className="inline-flex items-center px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <XMarkIcon className="-ml-1 mr-2 h-5 w-5" />
            Reject
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <TrashIcon className="-ml-1 mr-2 h-5 w-5" />
            Delete
          </button>
        </div>
      </div>

      {/* Contract Content */}
      <div className="card bg-dark-800 border-dark-500">
        <div className="p-8 space-y-8">
          {/* Title */}
          <div className="text-center border-b border-dark-500 pb-6">
            <h1 className="text-3xl font-bold text-white uppercase tracking-wider">
              {contract.title}
            </h1>
            <p className="mt-2 text-gray-400">
              Contract No. {contract.contract_number}
            </p>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Provider</h3>
              <p className="font-bold text-white">{contract.company?.name}</p>
              <p className="text-gray-400">{contract.company?.street}</p>
              <p className="text-gray-400">{contract.company?.postal_code} {contract.company?.city}</p>
              <p className="text-gray-400 mt-2">{contract.company?.email}</p>
              {contract.company?.phone && (
                <p className="text-gray-400">{contract.company?.phone}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Client</h3>
              <p className="font-bold text-white">{contract.customer?.company_name}</p>
              {contract.customer?.contact_person && (
                <p className="text-gray-400">{contract.customer?.contact_person}</p>
              )}
              <p className="text-gray-400">{contract.customer?.street}</p>
              <p className="text-gray-400">{contract.customer?.postal_code} {contract.customer?.city}</p>
              <p className="text-gray-400 mt-2">{contract.customer?.email}</p>
            </div>
          </div>

          {/* Event Details */}
          <div className="border-t border-dark-500 pt-6">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider mb-8">Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 uppercase">Event Date</p>
                <p className="text-white">{contract.event_date ? formatDate(contract.event_date) : 'TBD'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Location</p>
                <p className="text-white">{contract.event_location || 'TBD'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Valid Until</p>
                <p className="text-white">{contract.valid_until ? formatDate(contract.valid_until) : '-'}</p>
              </div>
            </div>
            {contract.event_description && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 uppercase">Description</p>
                <p className="text-gray-300 whitespace-pre-line">{contract.event_description}</p>
              </div>
            )}
          </div>

          {/* Payment Terms */}
          <div className="border-t border-dark-500 pt-6">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider mb-4">Payment Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 uppercase">Total Fee</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(contract.fee)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Deposit</p>
                <p className="text-white">{formatCurrency(contract.deposit)}</p>
                {contract.deposit_due && (
                  <p className="text-sm text-gray-400">Due: {formatDate(contract.deposit_due)}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase">Final Payment</p>
                <p className="text-white">{formatCurrency(contract.fee - contract.deposit)}</p>
                {contract.final_payment_due && (
                  <p className="text-sm text-gray-400">Due: {formatDate(contract.final_payment_due)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          {contract.cancellation_terms && (
            <div className="border-t border-dark-500 pt-6">
              <h3 className="text-lg font-medium text-white uppercase tracking-wider mb-4">Cancellation Terms</h3>
              <p className="text-gray-300 whitespace-pre-line">{contract.cancellation_terms}</p>
            </div>
          )}

          {contract.technical_requirements && (
            <div className="border-t border-dark-500 pt-6">
              <h3 className="text-lg font-medium text-white uppercase tracking-wider mb-4">Technical Requirements</h3>
              <p className="text-gray-300 whitespace-pre-line">{contract.technical_requirements}</p>
            </div>
          )}

          {contract.notes && (
            <div className="border-t border-dark-500 pt-6">
              <h3 className="text-lg font-medium text-white uppercase tracking-wider mb-4">Additional Notes</h3>
              <p className="text-gray-300 whitespace-pre-line">{contract.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowRejectionModal(false)}
            />
            <div className="relative bg-dark-800 border border-dark-500 max-w-lg w-full p-8">
              <h3 className="text-lg font-medium text-white uppercase tracking-wider mb-4">
                Reject Contract
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Please provide a reason for rejecting this booking request. This will be included in the rejection letter.
              </p>
              <div className="space-y-6">
                <div>
                  <label className="label">Reason for Rejection *</label>
                  <textarea
                    className="input bg-dark-800 border-dark-500 text-white w-full h-32 resize-none"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g., Unfortunately, we are already booked for this date..."
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRejectionModal(false)}
                    className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRejectWithLetter}
                    disabled={rejecting || !rejectionReason.trim()}
                    className="inline-flex items-center px-4 py-2 border border-red-500 bg-red-500 text-white hover:bg-transparent hover:text-red-500 transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
                  >
                    {rejecting ? 'Generating...' : 'Generate Rejection Letter'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
