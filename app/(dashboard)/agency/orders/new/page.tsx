'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Customer, ORDER_STATUS_OPTIONS } from '@/types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function NewOrderPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_id: '',
    status: 'open' as 'open' | 'in_progress' | 'completed' | 'cancelled',
    total_budget: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name')
        .order('company_name');
      if (error) throw error;
      setCustomers(data || []);
    } catch {
      // silent
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const orderData = {
        user_id: user.id,
        user_email: user.email,
        title: formData.title,
        description: formData.description || null,
        customer_id: formData.customer_id || null,
        status: formData.status,
        total_budget: formData.total_budget ? parseFloat(formData.total_budget) : null,
      };

      const { data, error } = await (supabase.from('orders') as any)
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Order created successfully!');
      router.push(`/agency/orders/${data.id}`);
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href="/agency" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Agency
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">New Order</h2>
          <p className="mt-1 text-sm text-gray-400">
            Create a new order to manage invoices, offers, contracts and bookings.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card bg-dark-800 space-y-8">
        <div className="card-body space-y-6">
          <div>
            <label className="label">Order Title *</label>
            <input
              type="text"
              className="input"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. DJ Booking - Kinker Basel"
              required
            />
          </div>

          <div>
            <label className="label">Customer</label>
            <select
              className="input"
              value={formData.customer_id}
              onChange={(e) => handleChange('customer_id', e.target.value)}
            >
              <option value="" className="bg-dark-800">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id} className="bg-dark-800">
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                {ORDER_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-dark-800">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Total Budget</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.total_budget}
                onChange={(e) => handleChange('total_budget', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[100px]"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Add any details about this order..."
            />
          </div>
        </div>

        <div className="px-8 py-5 border-t border-dark-500 flex justify-end space-x-4">
          <Link
            href="/agency"
            className="px-6 py-3 border border-dark-500 text-gray-300 hover:text-white hover:border-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
