'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Customer, Company, Product, PRODUCT_UNITS } from '@/types';
import { formatCurrency } from '@/lib/utils/helpers';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';

type Tab = 'customers' | 'coworkers' | 'products';

export default function B2BPage() {
  const [activeTab, setActiveTab] = useState<Tab>('customers');
  const supabase = createClient();

  // Customers state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');

  // Coworkers state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [coworkersLoading, setCoworkersLoading] = useState(true);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchCompanies();
    fetchProducts();
  }, []);

  // --- Customers ---
  const fetchCustomers = async () => {
    try {
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
      setCustomersLoading(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      const [{ data: invoices }, { data: contracts }] = await Promise.all([
        supabase.from('invoices').select('id,invoice_number').eq('customer_id', id),
        supabase.from('contracts').select('id,title').eq('customer_id', id),
      ]);
      if ((invoices && invoices.length > 0) || (contracts && contracts.length > 0)) {
        let msg = 'Cannot delete this customer because it is linked to:\n';
        if (invoices && invoices.length > 0) msg += `- ${invoices.length} invoice(s)\n`;
        if (contracts && contracts.length > 0) msg += `- ${contracts.length} contract(s)\n`;
        msg += 'Please delete or reassign these first.';
        toast.error(msg, { duration: 6000 });
        return;
      }
      await (supabase.from('agency_leads') as any).update({ customer_id: null }).eq('customer_id', id);
      await (supabase.from('bookings') as any).update({ customer_id: null }).eq('customer_id', id);
      const { error } = await (supabase.from('customers') as any).delete().eq('id', id);
      if (error) throw error;
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      toast.success('Customer deleted successfully');
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error(error?.message || 'Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.company_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.contact_person?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // --- Coworkers ---
  const fetchCompanies = async () => {
    try {
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
      setCoworkersLoading(false);
    }
  };

  const handleDeleteCompany = async (id: string) => {
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

  // --- Products ---
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      unit: formData.get('unit') as string,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase.from('products').update(data).eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase.from('products').insert(data);
        if (error) throw error;
        toast.success('Product created successfully');
      }
      setShowProductModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.description?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const isLoading =
    activeTab === 'customers' ? customersLoading : activeTab === 'coworkers' ? coworkersLoading : productsLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            B2B
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Manage customers, coworkers, and products in one place.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {activeTab === 'customers' && (
            <Link
              href="/customers/new"
              className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Customer
            </Link>
          )}
          {activeTab === 'coworkers' && (
            <Link
              href="/coworkers/new"
              className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Coworker
            </Link>
          )}
          {activeTab === 'products' && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowProductModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-500">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('customers')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm uppercase tracking-wider transition-colors flex items-center ${
              activeTab === 'customers'
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-400'
            }`}
          >
            <UsersIcon className="h-5 w-5 mr-2" />
            Customers
          </button>
          <button
            onClick={() => setActiveTab('coworkers')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm uppercase tracking-wider transition-colors flex items-center ${
              activeTab === 'coworkers'
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-400'
            }`}
          >
            <BuildingOfficeIcon className="h-5 w-5 mr-2" />
            Coworkers
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm uppercase tracking-wider transition-colors flex items-center ${
              activeTab === 'products'
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-400'
            }`}
          >
            <ShoppingBagIcon className="h-5 w-5 mr-2" />
            Products
          </button>
        </nav>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : activeTab === 'customers' ? (
        /* Customers Tab */
        <div className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              className="input block w-full pl-10 bg-dark-800 border-dark-500 text-white"
              placeholder="Search customers by name, email, or contact person..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
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
                        {customerSearch ? 'No customers found matching your search.' : 'No customers yet. Create your first customer!'}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-dark-700/50">
                        <td className="table-cell font-medium text-white">
                          <Link href={`/customer-detail/${customer.id}`} className="hover:text-blue-400 transition-colors">
                            {customer.company_name}
                          </Link>
                        </td>
                        <td className="table-cell text-gray-400">{customer.contact_person || '-'}</td>
                        <td className="table-cell">
                          <a href={`mailto:${customer.email}`} className="text-gray-400 hover:text-white">
                            {customer.email}
                          </a>
                        </td>
                        <td className="table-cell text-gray-400">{customer.city}</td>
                        <td className="table-cell">
                          <div className="flex items-center space-x-3">
                            <Link href={`/customer-detail/${customer.id}`} className="text-gray-400 hover:text-white" title="View">
                              <EyeIcon className="h-5 w-5" />
                            </Link>
                            <Link href={`/customer-detail/${customer.id}/edit`} className="text-gray-400 hover:text-blue-400" title="Edit">
                              <PencilIcon className="h-5 w-5" />
                            </Link>
                            <button onClick={() => handleDeleteCustomer(customer.id)} className="text-gray-400 hover:text-red-400" title="Delete">
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
      ) : activeTab === 'coworkers' ? (
        /* Coworkers Tab */
        <div className="space-y-6">
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
                          <img src={company.logo_url} alt={company.name} className="h-12 w-12 rounded-lg object-cover" />
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
                        <Link href={`/coworkers/${company.id}`} className="text-gray-400 hover:text-white">
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <button onClick={() => handleDeleteCompany(company.id)} className="text-gray-400 hover:text-red-400">
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
      ) : (
        /* Products Tab */
        <div className="space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              className="input block w-full pl-10 bg-dark-800 border-dark-500 text-white"
              placeholder="Search products by name or description..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>

          <div className="card bg-dark-800 border-dark-500">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-500">
                <thead className="bg-dark-700">
                  <tr>
                    <th className="table-header-cell">Name</th>
                    <th className="table-header-cell">Description</th>
                    <th className="table-header-cell">Unit</th>
                    <th className="table-header-cell">Price</th>
                    <th className="table-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-500">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                        {productSearch ? 'No products found matching your search.' : 'No products yet. Create your first product!'}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-dark-700/50">
                        <td className="table-cell font-medium text-white">{product.name}</td>
                        <td className="table-cell text-gray-400">{product.description || '-'}</td>
                        <td className="table-cell text-gray-400">
                          {PRODUCT_UNITS.find((u) => u.value === product.unit)?.label || product.unit || 'Piece'}
                        </td>
                        <td className="table-cell text-white">{formatCurrency(product.price)}</td>
                        <td className="table-cell">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setShowProductModal(true);
                              }}
                              className="text-gray-400 hover:text-white"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="text-gray-400 hover:text-red-400" title="Delete">
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

          {/* Product Modal */}
          {showProductModal && (
            <ProductModal
              editingProduct={editingProduct}
              onClose={() => {
                setShowProductModal(false);
                setEditingProduct(null);
              }}
              onSave={handleSaveProduct}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ProductModal({
  editingProduct,
  onClose,
  onSave,
}: {
  editingProduct: Product | null;
  onClose: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
        <div className="relative bg-dark-800 border border-dark-500 max-w-lg w-full p-8">
          <h3 className="text-lg font-medium text-white uppercase tracking-wider mb-8">
            {editingProduct ? 'Edit Product' : 'Add Product'}
          </h3>
          <form onSubmit={onSave} className="space-y-6">
            <div>
              <label htmlFor="name" className="label">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                defaultValue={editingProduct?.name}
                className="input bg-dark-800 border-dark-500 text-white"
              />
            </div>
            <div>
              <label htmlFor="description" className="label">
                Description
              </label>
              <input
                type="text"
                name="description"
                id="description"
                defaultValue={editingProduct?.description || ''}
                className="input bg-dark-800 border-dark-500 text-white"
              />
            </div>
            <div>
              <label htmlFor="unit" className="label">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                name="unit"
                id="unit"
                required
                defaultValue={editingProduct?.unit || 'piece'}
                className="input bg-dark-800 border-dark-500 text-white"
              >
                {PRODUCT_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value} className="bg-dark-800">
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="price" className="label">
                Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                id="price"
                required
                min="0"
                step="0.01"
                defaultValue={editingProduct?.price}
                className="input bg-dark-800 border-dark-500 text-white"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
              >
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
