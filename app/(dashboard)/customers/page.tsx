'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Customer } from '@/types';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      // Fetch ALL customers (shared data, no company filter)
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { error } = await (supabase.from('customers') as any).delete().eq('id', id);
      if (error) throw error;
      
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            Customers
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Shared customers - all users can access and manage these.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link href="/customers/new" className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider">
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Customer
          </Link>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
        </div>
        <input
          type="text"
          className="input block w-full pl-10 bg-dark-800 border-dark-500 text-white"
          placeholder="Search customers by name, email, or contact person..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="card bg-dark-800 border-dark-500">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-dark-500">
            <thead className="bg-dark-700">
              <tr>
                <th className="table-header-cell">Customer</th>
                <th className="table-header-cell">Contact Person</th>
                <th className="table-header-cell">Email</th>
                <th className="table-header-cell">City</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-500">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    {searchQuery ? 'No customers found matching your search.' : 'No customers yet. Create your first customer!'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-dark-700/50">
                    <td className="table-cell font-medium text-white">
                      <Link href={`/customers/${customer.id}`} className="hover:text-blue-400 transition-colors">
                        {customer.company_name}
                      </Link>
                    </td>
                    <td className="table-cell text-gray-400">
                      {customer.contact_person || '-'}
                    </td>
                    <td className="table-cell">
                      <a href={`mailto:${customer.email}`} className="text-gray-400 hover:text-white">
                        {customer.email}
                      </a>
                    </td>
                    <td className="table-cell text-gray-400">
                      {customer.city}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-3">
                        <Link href={`/customers/${customer.id}`} className="text-gray-400 hover:text-white" title="View">
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <button onClick={() => handleDelete(customer.id)} className="text-gray-400 hover:text-red-400" title="Delete">
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
