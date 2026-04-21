'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Invoice, InvoiceItem, TAX_OPTIONS, TaxType, PRODUCT_UNITS, CURRENCIES } from '@/types';
import { formatDateInput } from '@/lib/utils/helpers';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface EditItem {
  id?: string;
  description: string;
  quantity: number | string;
  price: number | string;
  total: number;
  unit?: string;
  service_date?: string;
}

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const [formData, setFormData] = useState({
    invoice_date: '',
    due_date: '',
    tax_type: 'no_vat' as TaxType,
    currency: 'CHF' as 'EUR' | 'CHF',
    ahv_waiver: false,
    notes: '',
    terms: '',
    status: 'created' as Invoice['status'],
  });

  const [items, setItems] = useState<EditItem[]>([]);

  useEffect(() => {
    if (params.id) fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, items:invoice_items(*)')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Invoice not found');
        router.push('/invoices');
        return;
      }

      const inv = data as Invoice;
      setInvoice(inv);
      setFormData({
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        tax_type: getTaxType(inv.tax_rate, inv.tax_type),
        currency: (inv.currency as 'EUR' | 'CHF') || 'CHF',
        ahv_waiver: inv.ahv_waiver || false,
        notes: inv.notes || '',
        terms: inv.terms || '',
        status: inv.status,
      });
      setItems(
        (inv.items || []).map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          unit: item.unit || 'piece',
          service_date: item.service_date || inv.invoice_date,
        }))
      );
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const getTaxType = (rate: number, taxType?: string): TaxType => {
    if (taxType) return taxType as TaxType;
    if (rate === 19) return 'vat_19';
    if (rate === 7) return 'vat_7';
    return 'no_vat';
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof EditItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'price') {
      const priceNum = typeof value === 'string' ? parseFloat(value) || 0 : value;
      newItems[index].total = Number(priceNum.toFixed(2));
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        price: 0,
        total: 0,
        unit: 'piece',
        service_date: formData.invoice_date || formatDateInput(new Date()),
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) || 0 : item.price;
      return sum + price;
    }, 0);

    const taxOption = TAX_OPTIONS.find((t) => t.value === formData.tax_type);
    const taxRate = taxOption?.rate || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    return { subtotal, tax, taxRate, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { subtotal, tax, taxRate, total } = calculateTotals();

      // Update invoice
      const updatePayload: any = {
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        tax_rate: taxRate,
        subtotal,
        tax,
        total,
        currency: formData.currency,
        notes: formData.notes || null,
        terms: formData.terms || null,
        status: formData.status,
        ahv_waiver: formData.ahv_waiver,
      };

      let invoiceResult = await supabase
        .from('invoices')
        .update(updatePayload)
        .eq('id', params.id);

      // Retry without columns that may not exist in DB
      if (invoiceResult.error) {
        const msg = invoiceResult.error.message || '';
        if (msg.includes('ahv_waiver')) {
          delete updatePayload.ahv_waiver;
        }
        if (msg.includes('tax_type')) {
          delete updatePayload.tax_type;
        }
        if (msg.includes('ahv_waiver') || msg.includes('tax_type')) {
          invoiceResult = await supabase
            .from('invoices')
            .update(updatePayload)
            .eq('id', params.id);
        }
      }

      if (invoiceResult.error) throw invoiceResult.error;

      // Delete old items and insert new ones
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', params.id);

      if (deleteError) throw deleteError;

      const invoiceItems = items.map((item) => ({
        invoice_id: params.id,
        description: item.description,
        quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity,
        price: typeof item.price === 'string' ? parseFloat(item.price) || 0 : item.price,
        total: item.total,
        unit: item.unit || null,
        service_date: item.service_date || null,
      }));

      let itemsResult = await supabase.from('invoice_items').insert(invoiceItems);

      if (itemsResult.error && itemsResult.error.message?.includes('service_date')) {
        const fallbackItems = invoiceItems.map(({ service_date, ...rest }) => rest);
        itemsResult = await supabase.from('invoice_items').insert(fallbackItems);
      }

      if (itemsResult.error) throw itemsResult.error;

      toast.success('Invoice updated successfully');
      router.push(`/invoices/${params.id}`);
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      toast.error(error.message || 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Invoice not found.</p>
        <Link href="/invoices" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
          Back to Invoices
        </Link>
      </div>
    );
  }

  const { subtotal, tax, total } = calculateTotals();
  const taxOption = TAX_OPTIONS.find((t) => t.value === formData.tax_type);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href={`/invoices/${params.id}`} className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Invoice
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            Edit Invoice {invoice.invoice_number}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Invoice Info */}
        <div className="card bg-dark-800">
          <div className="card-body space-y-6">
            <h3 className="text-lg font-medium text-white">Invoice Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="label">Invoice Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.invoice_date}
                  onChange={(e) => handleChange('invoice_date', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Due Date *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="created" className="bg-dark-800">Created</option>
                  <option value="sent" className="bg-dark-800">Sent</option>
                  <option value="paid" className="bg-dark-800">Paid</option>
                  <option value="overdue" className="bg-dark-800">Overdue</option>
                  <option value="cancelled" className="bg-dark-800">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="label">Tax</label>
                <select
                  className="input"
                  value={formData.tax_type}
                  onChange={(e) => handleChange('tax_type', e.target.value as TaxType)}
                >
                  {TAX_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-dark-800">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Currency</label>
                <select
                  className="input"
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value as 'EUR' | 'CHF')}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-dark-800">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-dark-500 bg-dark-800 text-white focus:ring-white"
                    checked={formData.ahv_waiver}
                    onChange={(e) => handleChange('ahv_waiver', e.target.checked)}
                  />
                  <span className="text-sm text-gray-300">AHV Verzicht</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input min-h-[80px]"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Optional notes..."
                />
              </div>
              <div>
                <label className="label">Terms</label>
                <textarea
                  className="input min-h-[80px]"
                  value={formData.terms}
                  onChange={(e) => handleChange('terms', e.target.value)}
                  placeholder="Payment terms..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card bg-dark-800">
          <div className="card-body space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
              >
                <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                Add Item
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="p-4 border border-dark-500 rounded-sm space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-12">
                    <div className="sm:col-span-3">
                      <label className="label">Description</label>
                      <input
                        type="text"
                        className="input bg-dark-800 border-dark-500 text-white"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Service Date</label>
                      <input
                        type="date"
                        className="input bg-dark-800 border-dark-500 text-white"
                        value={item.service_date || ''}
                        onChange={(e) => handleItemChange(index, 'service_date', e.target.value)}
                      />
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
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
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
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-end">
                      <div className="text-right w-full pb-3">
                        <p className="text-sm text-gray-400">Total</p>
                        <p className="text-lg font-medium text-white">
                          {item.total.toFixed(2)} {formData.currency}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-400 hover:text-red-300 transition-colors mt-8"
                    title="Remove item"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <p className="text-gray-500 text-center py-4">No items. Click "Add Item" to add one.</p>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="card bg-dark-800">
          <div className="card-body">
            <div className="space-y-2 text-right">
              <p className="text-gray-400">
                Subtotal: <span className="text-white font-medium">{subtotal.toFixed(2)} {formData.currency}</span>
              </p>
              <p className="text-gray-400">
                Tax ({taxOption?.rate || 0}%): <span className="text-white font-medium">{tax.toFixed(2)} {formData.currency}</span>
              </p>
              <p className="text-xl font-bold text-white">
                Total: {total.toFixed(2)} {formData.currency}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Link
            href={`/invoices/${params.id}`}
            className="px-6 py-3 border border-dark-500 text-gray-300 hover:text-white hover:border-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
