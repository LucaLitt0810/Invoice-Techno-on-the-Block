'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Customer, Company } from '@/types';
import { CONTRACT_TYPES, DJ_BOOKING_TEMPLATES, ContractType } from '@/types/contracts';
import { formatDateInput } from '@/lib/utils/helpers';
import { ArrowLeftIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function NewContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get('customer_id');
  const prefillOrderId = searchParams.get('order_id');
  const supabase = createClient();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  const today = new Date();
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(today.getDate() + 14);
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(today.getDate() + 30);

  const [formData, setFormData] = useState({
    company_id: '',
    customer_id: '',
    contract_type: 'booking_offer' as ContractType,
    title: '',
    event_date: '',
    event_location: '',
    event_description: '',
    fee: 0,
    deposit: 0,
    currency: 'EUR',
    deposit_due: formatDateInput(today),
    final_payment_due: formatDateInput(today),
    cancellation_terms: '',
    technical_requirements: '',
    valid_until: formatDateInput(twoWeeksLater),
    notes: '',
  });

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-fill template when type changes
  useEffect(() => {
    const template = DJ_BOOKING_TEMPLATES[formData.contract_type as keyof typeof DJ_BOOKING_TEMPLATES];
    if (template) {
      setFormData(prev => ({
        ...prev,
        title: template.title,
        cancellation_terms: template.cancellation_terms,
        technical_requirements: template.technical_requirements,
        notes: template.notes,
      }));
    }
  }, [formData.contract_type]);

  // Prefill customer from URL param
  useEffect(() => {
    if (prefillCustomerId && customers.length > 0) {
      setFormData((prev) => ({ ...prev, customer_id: prefillCustomerId }));
    }
  }, [prefillCustomerId, customers]);

  const fetchData = async () => {
    try {
      const [{ data: companiesData }, { data: customersData }] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('customers').select('*').order('company_name'),
      ]);
      setCompanies(companiesData || []);
      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'sent') => {
    e.preventDefault();
    
    if (!formData.company_id || !formData.customer_id) {
      toast.error('Please select coworker and customer');
      return;
    }

    setLoading(true);

    try {
      const year = new Date().getFullYear();
      
      // Generate contract number
      const { data: newContractNumber, error: numberError } = await (supabase.rpc as any)(
        'get_next_contract_number',
        { p_company_id: formData.company_id, p_year: year }
      );

      if (numberError) throw numberError;

      // Create contract - convert empty strings to null for date fields
      const contractData = {
        ...formData,
        contract_number: newContractNumber,
        status,
        order_id: prefillOrderId || null,
        event_date: formData.event_date || null,
        deposit_due: formData.deposit_due || null,
        final_payment_due: formData.final_payment_due || null,
        valid_until: formData.valid_until || null,
      };

      const { data: contract, error: contractError } = await (supabase
        .from('contracts') as any)
        .insert(contractData)
        .select()
        .single();

      if (contractError) throw contractError;

      // Send email if status is 'sent'
      if (status === 'sent') {
        try {
          await fetch(`/api/contracts/${contract.id}/send`, { method: 'POST' });
        } catch (sendError) {
          console.error('Error sending contract email:', sendError);
          toast.error('Contract created but failed to send email');
          router.push('/contracts');
          return;
        }
      }

      toast.success(status === 'draft' ? 'Contract saved as draft' : 'Contract created and sent!');
      router.push('/contracts');
    } catch (error: any) {
      console.error('Error creating contract:', error);
      toast.error(error.message || 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
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
              New Contract
            </h2>
          </div>
        </div>
      </div>

      <form className="space-y-6">
        {/* Contract Type */}
        <div className="card bg-dark-800 border-dark-500">
          <div className="card-header border-b border-dark-500">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">Contract Type</h3>
          </div>
          <div className="card-body">
            <select
              className="input bg-dark-800 border-dark-500 text-white"
              value={formData.contract_type}
              onChange={(e) => setFormData({ ...formData, contract_type: e.target.value as ContractType })}
            >
              {CONTRACT_TYPES.map((type) => (
                <option key={type.value} value={type.value} className="bg-dark-800">
                  {type.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-400">
              Template will be auto-filled based on contract type. You can modify all fields.
            </p>
          </div>
        </div>

        {/* Coworker & Customer */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="card bg-dark-800 border-dark-500">
            <div className="card-header border-b border-dark-500">
              <h3 className="text-lg font-medium text-white uppercase tracking-wider">Your Coworker</h3>
            </div>
            <div className="card-body">
              <select
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                required
              >
                <option value="">Select coworker...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-dark-800">{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card bg-dark-800 border-dark-500">
            <div className="card-header border-b border-dark-500">
              <h3 className="text-lg font-medium text-white uppercase tracking-wider">Customer</h3>
            </div>
            <div className="card-body">
              <select
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                required
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-dark-800">{c.company_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="card bg-dark-800 border-dark-500">
          <div className="card-header border-b border-dark-500">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">Event Details</h3>
          </div>
          <div className="card-body space-y-6">
            <div>
              <label className="label">Title / Subject *</label>
              <input
                type="text"
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., DJ Booking for Wedding"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label">Event Date</label>
                <input
                  type="date"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Event Location</label>
                <input
                  type="text"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.event_location}
                  onChange={(e) => setFormData({ ...formData, event_location: e.target.value })}
                  placeholder="Venue address"
                />
              </div>
            </div>
            <div>
              <label className="label">Event Description</label>
              <textarea
                className="input bg-dark-800 border-dark-500 text-white"
                rows={3}
                value={formData.event_description}
                onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
                placeholder="Describe the event, duration, special requirements..."
              />
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="card bg-dark-800 border-dark-500">
          <div className="card-header border-b border-dark-500">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">Payment Terms</h3>
          </div>
          <div className="card-body space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
              <div>
                <label className="label">Currency</label>
                <select
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="EUR" className="bg-dark-800">EUR (€)</option>
                  <option value="CHF" className="bg-dark-800">CHF</option>
                </select>
              </div>
              <div>
                <label className="label">Total Fee ({formData.currency === 'EUR' ? '€' : formData.currency})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.fee === 0 ? '' : formData.fee}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, fee: value === '' ? 0 : parseFloat(value) });
                  }}
                />
              </div>
              <div>
                <label className="label">Deposit ({formData.currency === 'EUR' ? '€' : formData.currency})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.deposit === 0 ? '' : formData.deposit}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, deposit: value === '' ? 0 : parseFloat(value) });
                  }}
                />
              </div>
              <div>
                <label className="label">Valid Until</label>
                <input
                  type="date"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label">Deposit Due</label>
                <input
                  type="date"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.deposit_due}
                  onChange={(e) => setFormData({ ...formData, deposit_due: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Final Payment Due</label>
                <input
                  type="date"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.final_payment_due}
                  onChange={(e) => setFormData({ ...formData, final_payment_due: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="card bg-dark-800 border-dark-500">
          <div className="card-header border-b border-dark-500">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">Terms & Conditions</h3>
          </div>
          <div className="card-body space-y-6">
            <div>
              <label className="label">Cancellation Terms</label>
              <textarea
                className="input bg-dark-800 border-dark-500 text-white"
                rows={4}
                value={formData.cancellation_terms}
                onChange={(e) => setFormData({ ...formData, cancellation_terms: e.target.value })}
                placeholder="Cancellation policy..."
              />
            </div>
            <div>
              <label className="label">Technical Requirements</label>
              <textarea
                className="input bg-dark-800 border-dark-500 text-white"
                rows={4}
                value={formData.technical_requirements}
                onChange={(e) => setFormData({ ...formData, technical_requirements: e.target.value })}
                placeholder="Equipment, power, space requirements..."
              />
            </div>
            <div>
              <label className="label">Additional Notes</label>
              <textarea
                className="input bg-dark-800 border-dark-500 text-white"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3">
          <Link href="/contracts" className="inline-flex items-center px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider">
            Cancel
          </Link>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'draft')}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-green-500 text-green-400 hover:bg-green-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'sent')}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Create & Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
