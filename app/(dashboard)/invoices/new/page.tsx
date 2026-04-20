'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Customer, Product, Company, TAX_OPTIONS, TaxType, PRODUCT_UNITS, CURRENCIES } from '@/types';
import { formatCurrency, formatDateInput } from '@/lib/utils/helpers';
import { PlusIcon, TrashIcon, BuildingOfficeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { COUNTRIES, generateCustomerNumber } from '@/lib/utils/helpers';

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
  unit?: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const today = new Date();
  const twoWeeksLater = new Date(today);
  twoWeeksLater.setDate(today.getDate() + 14);

  const [formData, setFormData] = useState({
    company_id: '',
    customer_id: '',
    invoice_date: formatDateInput(today),
    service_date: formatDateInput(today),
    due_date: formatDateInput(twoWeeksLater),
    tax_type: 'vat_19' as TaxType,
    currency: 'EUR' as 'EUR' | 'CHF',
    notes: '',
    terms: 'Payment due within 14 days.',
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, price: 0, total: 0, unit: 'piece' },
  ]);

  // Modals state
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  
  // New company form
  const [newCompany, setNewCompany] = useState({
    name: '',
    street: '',
    postal_code: '',
    city: '',
    country: 'DE',
    email: '',
    phone: '',
    tax_number: '',
    vat_id: '',
    bank_name: '',
    iban: '',
    bic: '',
  });
  
  // New customer form
  const [newCustomer, setNewCustomer] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    street: '',
    postal_code: '',
    city: '',
    country: 'DE',
    customer_number: generateCustomerNumber(),
    bank_name: '',
    iban: '',
    bic: '',
  });

  // Fetch companies on load
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Fetch customers and products on load (not company-bound)
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  // Set selected company when company changes
  useEffect(() => {
    if (formData.company_id) {
      const company = companies.find(c => c.id === formData.company_id);
      setSelectedCompany(company || null);
    }
  }, [formData.company_id, companies]);

  const fetchCompanies = async () => {
    try {
      // Fetch ALL companies (shared data)
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      setCompanies(data || []);
      setLoadingData(false);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load coworkers');
      setLoadingData(false);
    }
  };

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('company_name');
    setCustomers(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name');
    setProducts(data || []);
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomer(customer || null);
    setFormData((prev) => ({ ...prev, customer_id: customerId }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Total equals price (quantity is independent/descriptive only)
    if (field === 'price') {
      newItems[index].total = Number(newItems[index].price.toFixed(2));
    }
    
    setItems(newItems);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('companies')
        .insert({ ...newCompany, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      
      setCompanies([...companies, data]);
      setFormData({ ...formData, company_id: data.id });
      setSelectedCompany(data);
      setShowCompanyModal(false);
      setNewCompany({
        name: '', street: '', postal_code: '', city: '', country: 'DE',
        email: '', phone: '', tax_number: '', vat_id: '',
        bank_name: '', iban: '', bic: '',
      });
      toast.success('Coworker created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create coworker');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCustomer(true);
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single();
      
      if (error) throw error;
      
      setCustomers([...customers, data]);
      setFormData({ ...formData, customer_id: data.id });
      setSelectedCustomer(data);
      setShowCustomerModal(false);
      setNewCustomer({
        company_name: '', contact_person: '', email: '', phone: '',
        street: '', postal_code: '', city: '', country: 'DE',
        customer_number: generateCustomerNumber(),
        bank_name: '', iban: '', bic: '',
      });
      toast.success('Customer created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0, total: 0, unit: 'piece' }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error('You must have at least one item');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      const newItems = [...items];
      // Keep existing unit and quantity, only update description and price
      // Total equals price (fixed price, not quantity dependent)
      newItems[index] = {
        ...newItems[index],
        description: product.name + (product.description ? ` - ${product.description}` : ''),
        price: product.price,
        total: product.price,
      };
      setItems(newItems);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = TAX_OPTIONS.find((t) => t.value === formData.tax_type)?.rate || 0;
    const tax = Number((subtotal * (taxRate / 100)).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    return { subtotal, tax, total, taxRate };
  };

  const handleSubmit = async (e: React.FormEvent, status: 'created' | 'sent') => {
    e.preventDefault();
    
    if (!formData.company_id) {
      toast.error('Please select a coworker');
      return;
    }

    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }

    if (items.some((item) => !item.description || item.quantity <= 0)) {
      toast.error('Please fill in all item details');
      return;
    }

    setLoading(true);

    try {
      const { subtotal, tax, total, taxRate } = calculateTotals();
      const year = new Date().getFullYear();

      // Generate invoice number first
      const { data: newInvoiceNumber, error: numberError } = await supabase.rpc(
        'get_next_invoice_number',
        { p_company_id: formData.company_id, p_year: year }
      );

      if (numberError) throw numberError;

      // Create invoice with the generated number
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          company_id: formData.company_id,
          customer_id: formData.customer_id,
          invoice_number: newInvoiceNumber,
          invoice_date: formData.invoice_date,
          service_date: formData.service_date || null,
          due_date: formData.due_date,
          status,
          subtotal,
          tax,
          tax_rate: taxRate,
          total,
          currency: formData.currency,
          notes: formData.notes || null,
          terms: formData.terms || null,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        unit: item.unit || null,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Send email if status is 'sent'
      if (status === 'sent') {
        try {
          await fetch(`/api/invoices/${invoice.id}/send`, { method: 'POST' });
        } catch (sendError) {
          console.error('Error sending invoice email:', sendError);
          toast.error('Invoice created but failed to send email');
          router.push('/invoices');
          return;
        }
      }

      toast.success(status === 'created' ? 'Invoice created successfully!' : 'Invoice created and sent!');
      router.push('/invoices');
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();
  const taxLabel = TAX_OPTIONS.find((t) => t.value === formData.tax_type)?.label || 'Tax';

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-white uppercase tracking-wider">No Coworkers Found</h2>
        <p className="mt-2 text-gray-400">Please create a coworker first.</p>
        <Link href="/coworkers/new" className="mt-4 inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider">
          Create Coworker
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            Create Invoice
          </h2>
        </div>
      </div>

      <form className="space-y-6">
        {/* Coworker Selection */}
        <div className="card bg-dark-800 border-dark-500">
          <div className="card-header border-b border-dark-500">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 mr-2" />
              Select Coworker
            </h3>
          </div>
          <div className="card-body">
            <select
              className="input bg-dark-800 border-dark-500 text-white"
              value={formData.company_id}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setShowCompanyModal(true);
                  e.target.value = '';
                } else {
                  setFormData({ ...formData, company_id: e.target.value });
                }
              }}
              required
            >
              <option value="" className="bg-dark-800">Select a coworker...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id} className="bg-dark-800">
                  {company.name} - {company.city}
                </option>
              ))}
              <option value="__new__" className="bg-blue-900 text-blue-200">+ New Coworker...</option>
            </select>

            {selectedCompany && (
              <div className="mt-4 p-4 bg-dark-700 border border-dark-500">
                <p className="font-medium text-white">{selectedCompany.name}</p>
                <p className="text-sm text-gray-400">{selectedCompany.street}</p>
                <p className="text-sm text-gray-400">
                  {selectedCompany.postal_code} {selectedCompany.city}
                </p>
                <p className="text-sm text-gray-400">{selectedCompany.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Selection */}
        <div className="card bg-dark-800 border-dark-500">
          <div className="card-header border-b border-dark-500">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">Customer</h3>
          </div>
          <div className="card-body">
            <select
              className="input bg-dark-800 border-dark-500 text-white"
              value={formData.customer_id}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setShowCustomerModal(true);
                  e.target.value = '';
                } else {
                  handleCustomerChange(e.target.value);
                }
              }}
              required
            >
              <option value="" className="bg-dark-800">Select a customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id} className="bg-dark-800">
                  {customer.company_name} - {customer.city}
                </option>
              ))}
              <option value="__new__" className="bg-blue-900 text-blue-200">+ New Customer...</option>
            </select>

            {selectedCustomer && (
              <div className="mt-4 p-4 bg-dark-700 border border-dark-500">
                <p className="font-medium text-white">{selectedCustomer.company_name}</p>
                <p className="text-sm text-gray-400">{selectedCustomer.street}</p>
                <p className="text-sm text-gray-400">
                  {selectedCustomer.postal_code} {selectedCustomer.city}
                </p>
                <p className="text-sm text-gray-400">{selectedCustomer.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="card bg-dark-800 border-dark-500">
          <div className="card-header border-b border-dark-500">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">Invoice Details</h3>
          </div>
          <div className="card-body grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label className="label">Invoice Date</label>
              <input
                type="date"
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Service Date</label>
              <input
                type="date"
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.service_date}
                onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card bg-dark-800 border-dark-500">
          <div className="card-header border-b border-dark-500">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">Items</h3>
          </div>
          <div className="card-body">
            {items.map((item, index) => (
              <div key={index} className="mb-4 p-4 border border-dark-500">
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 gap-6 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <label className="label">Description</label>
                      <input
                        type="text"
                        className="input bg-dark-800 border-dark-500 text-white"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="label">Product</label>
                      <select
                        className="input bg-dark-800 border-dark-500 text-white"
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                        value=""
                      >
                        <option value="" className="bg-dark-800">Select product...</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id} className="bg-dark-800">
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Unit</label>
                      <select
                        className="input bg-dark-800 border-dark-500 text-white"
                        value={item.unit || 'piece'}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      >
                        {PRODUCT_UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value} className="bg-dark-800">
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-1">
                      <label className="label">Qty</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input bg-dark-800 border-dark-500 text-white"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input bg-dark-800 border-dark-500 text-white"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="pt-8">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-right text-sm text-gray-400">
                  Total: {formatCurrency(item.total, formData.currency)}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Item
            </button>
          </div>
        </div>

        {/* Tax & Currency & Totals */}
        <div className="card bg-dark-800 border-dark-500">
          <div className="card-body">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="label">Tax Type</label>
                <select
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.tax_type}
                  onChange={(e) => setFormData({ ...formData, tax_type: e.target.value as TaxType })}
                >
                  {TAX_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-dark-800">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Currency</label>
                <select
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'EUR' | 'CHF' })}
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.value} value={curr.value} className="bg-dark-800">
                      {curr.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-right space-y-2">
                <p className="text-gray-400">Subtotal: {formatCurrency(subtotal, formData.currency)}</p>
                <p className="text-gray-400">{taxLabel}: {formatCurrency(tax, formData.currency)}</p>
                <p className="text-xl font-bold text-white">Total: {formatCurrency(total, formData.currency)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="card bg-dark-800 border-dark-500">
          <div className="card-body space-y-6">
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input bg-dark-800 border-dark-500 text-white"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes for the customer..."
              />
            </div>
            <div>
              <label className="label">Terms & Conditions</label>
              <textarea
                className="input bg-dark-800 border-dark-500 text-white"
                rows={2}
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                placeholder="Payment terms and conditions..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3">
          <Link href="/invoices" className="inline-flex items-center px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider">
            Cancel
          </Link>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'created')}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-green-500 text-green-400 hover:bg-green-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
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

      {/* New Coworker Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCompanyModal(false)} />
            <div className="relative bg-dark-800 border border-dark-500 max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-medium text-white uppercase tracking-wider">New Coworker</h3>
                <button onClick={() => setShowCompanyModal(false)} className="text-gray-400 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreateCompany} className="space-y-6">
                <div>
                  <label className="label">Coworker Name *</label>
                  <input type="text" required className="input bg-dark-800 border-dark-500 text-white" value={newCompany.name} onChange={(e) => setNewCompany({...newCompany, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="label">Street *</label>
                    <input type="text" required className="input bg-dark-800 border-dark-500 text-white" value={newCompany.street} onChange={(e) => setNewCompany({...newCompany, street: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Postal Code *</label>
                    <input type="text" required className="input bg-dark-800 border-dark-500 text-white" value={newCompany.postal_code} onChange={(e) => setNewCompany({...newCompany, postal_code: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">City *</label>
                    <input type="text" required className="input bg-dark-800 border-dark-500 text-white" value={newCompany.city} onChange={(e) => setNewCompany({...newCompany, city: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Country *</label>
                    <select className="input bg-dark-800 border-dark-500 text-white" value={newCompany.country} onChange={(e) => setNewCompany({...newCompany, country: e.target.value})}>
                      {COUNTRIES.map((c) => <option key={c.code} value={c.code} className="bg-dark-800">{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="label">Email *</label>
                    <input type="email" required className="input bg-dark-800 border-dark-500 text-white" value={newCompany.email} onChange={(e) => setNewCompany({...newCompany, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input type="tel" className="input bg-dark-800 border-dark-500 text-white" value={newCompany.phone} onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})} />
                  </div>
                </div>
                <div className="border-t border-dark-500 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Payment Information</h4>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="label">Bank Name</label>
                      <input type="text" className="input bg-dark-800 border-dark-500 text-white" value={newCompany.bank_name} onChange={(e) => setNewCompany({...newCompany, bank_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">IBAN</label>
                      <input type="text" className="input bg-dark-800 border-dark-500 text-white" value={newCompany.iban} onChange={(e) => setNewCompany({...newCompany, iban: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">BIC / SWIFT</label>
                      <input type="text" className="input bg-dark-800 border-dark-500 text-white" value={newCompany.bic} onChange={(e) => setNewCompany({...newCompany, bic: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <button type="button" onClick={() => setShowCompanyModal(false)} className="px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider">Cancel</button>
                  <button type="submit" disabled={savingCompany} className="px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50">{savingCompany ? 'Creating...' : 'Create Coworker'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCustomerModal(false)} />
            <div className="relative bg-dark-800 border border-dark-500 max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-medium text-white uppercase tracking-wider">New Customer</h3>
                <button onClick={() => setShowCustomerModal(false)} className="text-gray-400 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreateCustomer} className="space-y-6">
                <div>
                  <label className="label">Customer Name *</label>
                  <input type="text" required className="input bg-dark-800 border-dark-500 text-white" value={newCustomer.company_name} onChange={(e) => setNewCustomer({...newCustomer, company_name: e.target.value})} />
                </div>
                <div>
                  <label className="label">Contact Person</label>
                  <input type="text" className="input bg-dark-800 border-dark-500 text-white" value={newCustomer.contact_person} onChange={(e) => setNewCustomer({...newCustomer, contact_person: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="label">Email *</label>
                    <input type="email" required className="input bg-dark-800 border-dark-500 text-white" value={newCustomer.email} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input type="tel" className="input bg-dark-800 border-dark-500 text-white" value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="label">Street *</label>
                    <input type="text" required className="input bg-dark-800 border-dark-500 text-white" value={newCustomer.street} onChange={(e) => setNewCustomer({...newCustomer, street: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Postal Code *</label>
                    <input type="text" required className="input bg-dark-800 border-dark-500 text-white" value={newCustomer.postal_code} onChange={(e) => setNewCustomer({...newCustomer, postal_code: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">City *</label>
                    <input type="text" required className="input bg-dark-800 border-dark-500 text-white" value={newCustomer.city} onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Country *</label>
                    <select className="input bg-dark-800 border-dark-500 text-white" value={newCustomer.country} onChange={(e) => setNewCustomer({...newCustomer, country: e.target.value})}>
                      {COUNTRIES.map((c) => <option key={c.code} value={c.code} className="bg-dark-800">{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Customer Number</label>
                  <input type="text" className="input bg-dark-700 text-gray-400 border-dark-500" value={newCustomer.customer_number} readOnly />
                </div>
                <div className="border-t border-dark-500 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Payment Information (Optional)</h4>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="label">Bank Name</label>
                      <input type="text" className="input bg-dark-800 border-dark-500 text-white" value={newCustomer.bank_name} onChange={(e) => setNewCustomer({...newCustomer, bank_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">IBAN</label>
                      <input type="text" className="input bg-dark-800 border-dark-500 text-white" value={newCustomer.iban} onChange={(e) => setNewCustomer({...newCustomer, iban: e.target.value})} />
                    </div>
                    <div>
                      <label className="label">BIC / SWIFT</label>
                      <input type="text" className="input bg-dark-800 border-dark-500 text-white" value={newCustomer.bic} onChange={(e) => setNewCustomer({...newCustomer, bic: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6">
                  <button type="button" onClick={() => setShowCustomerModal(false)} className="px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider">Cancel</button>
                  <button type="submit" disabled={savingCustomer} className="px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50">{savingCustomer ? 'Creating...' : 'Create Customer'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
