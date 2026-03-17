'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { generateCustomerNumber, COUNTRIES } from '@/lib/utils/helpers';

export default function NewCustomerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    street: '',
    postal_code: '',
    city: '',
    country: 'DE',
    customer_number: generateCustomerNumber(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await (supabase
        .from('customers') as any)
        .insert(formData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Customer created successfully!');
      router.push('/customers');
    } catch (error: any) {
      console.error('Error creating customer:', error);
      toast.error(error.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            New Customer
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Add a new customer to your database.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/customers"
            className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            Back to Customers
          </Link>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card bg-dark-800 border-dark-500 max-w-3xl">
        <div className="card-body space-y-6">
          {/* Customer Name */}
          <div>
            <label htmlFor="company_name" className="label">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="company_name"
              id="company_name"
              required
              className="input bg-dark-800 border-dark-500 text-white"
              value={formData.company_name}
              onChange={handleChange}
            />
          </div>

          {/* Contact Person */}
          <div>
            <label htmlFor="contact_person" className="label">
              Contact Person
            </label>
            <input
              type="text"
              name="contact_person"
              id="contact_person"
              className="input bg-dark-800 border-dark-500 text-white"
              value={formData.contact_person}
              onChange={handleChange}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="label">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              id="email"
              required
              className="input bg-dark-800 border-dark-500 text-white"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="label">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              id="phone"
              className="input bg-dark-800 border-dark-500 text-white"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {/* Address */}
          <div className="border-t border-dark-500 pt-6">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider mb-4">Address</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="street" className="label">
                  Street <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="street"
                  id="street"
                  required
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.street}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="postal_code" className="label">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="postal_code"
                  id="postal_code"
                  required
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.postal_code}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="city" className="label">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  id="city"
                  required
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="country" className="label">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  name="country"
                  id="country"
                  required
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.country}
                  onChange={handleChange}
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code} className="bg-dark-800">
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Customer Number */}
          <div className="border-t border-dark-500 pt-6">
            <label htmlFor="customer_number" className="label">
              Customer Number
            </label>
            <input
              type="text"
              name="customer_number"
              id="customer_number"
              className="input bg-dark-700 text-gray-400 border-dark-500"
              value={formData.customer_number}
              readOnly
            />
            <p className="mt-1 text-xs text-gray-500">Auto-generated customer number</p>
          </div>
        </div>

        <div className="card-header border-t border-dark-500 flex items-center justify-end space-x-3">
          <Link
            href="/customers"
            className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
