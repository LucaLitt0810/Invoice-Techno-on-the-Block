'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Order, ORDER_STATUS_OPTIONS, Offer, OFFER_STATUS_OPTIONS, Customer } from '@/types';
import { Booking, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/types/bookings';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  DocumentCheckIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

const ORDER_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-900/30 text-blue-400 border-blue-800',
  in_progress: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  completed: 'bg-green-900/30 text-green-400 border-green-800',
  cancelled: 'bg-red-900/30 text-red-400 border-red-800',
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'offers' | 'contracts' | 'bookings'>('overview');

  // Related data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({ title: '', description: '', amount: '', valid_until: '' });
  const [savingOffer, setSavingOffer] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(*)')
        .eq('id', orderId)
        .single();

      if (error || !data) {
        toast.error('Order not found');
        router.push('/agency');
        return;
      }

      setOrder(data as Order);

      // Fetch related data in parallel
      const [{ data: inv }, { data: off }, { data: con }, { data: book }] = await Promise.all([
        supabase.from('invoices').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
        supabase.from('offers').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
        supabase.from('contracts').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
        supabase.from('bookings').select('*, dj:djs(*)').eq('order_id', orderId).order('start_date', { ascending: false }),
      ]);

      setInvoices(inv || []);
      setOffers(off || []);
      setContracts(con || []);
      setBookings((book || []) as Booking[]);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await (supabase.from('orders') as any)
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      setOrder((prev) => prev ? { ...prev, status: newStatus as any } : prev);
      toast.success('Status updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleDeleteOrder = async () => {
    if (!confirm('Delete this order? Linked items will remain but be unlinked.')) return;
    try {
      const { error } = await (supabase.from('orders') as any).delete().eq('id', orderId);
      if (error) throw error;
      toast.success('Order deleted');
      router.push('/agency');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete order');
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOffer(true);
    try {
      const { error } = await (supabase.from('offers') as any).insert({
        order_id: orderId,
        title: offerForm.title,
        description: offerForm.description || null,
        amount: parseFloat(offerForm.amount) || 0,
        valid_until: offerForm.valid_until || null,
      });

      if (error) throw error;
      toast.success('Offer created');
      setShowOfferModal(false);
      setOfferForm({ title: '', description: '', amount: '', valid_until: '' });
      fetchOrder();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create offer');
    } finally {
      setSavingOffer(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Delete this offer?')) return;
    try {
      const { error } = await (supabase.from('offers') as any).delete().eq('id', id);
      if (error) throw error;
      setOffers((prev) => prev.filter((o) => o.id !== id));
      toast.success('Offer deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete offer');
    }
  };

  const getOfferStatusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-900/30 text-gray-400 border-gray-800',
      sent: 'bg-blue-900/30 text-blue-400 border-blue-800',
      accepted: 'bg-green-900/30 text-green-400 border-green-800',
      rejected: 'bg-red-900/30 text-red-400 border-red-800',
    };
    return map[status] || map.draft;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="md:flex md:items-start md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link href="/agency" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Agency
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{order.title}</h2>
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-medium uppercase tracking-wider border rounded-full px-2.5 py-0.5 bg-transparent cursor-pointer"
              style={{
                borderColor: order.status === 'completed' ? '#22c55e' : order.status === 'cancelled' ? '#ef4444' : order.status === 'in_progress' ? '#eab308' : '#3b82f6',
                color: order.status === 'completed' ? '#22c55e' : order.status === 'cancelled' ? '#ef4444' : order.status === 'in_progress' ? '#eab308' : '#3b82f6',
              }}
            >
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {order.description && (
            <p className="mt-2 text-sm text-gray-400 max-w-2xl">{order.description}</p>
          )}
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <button
            onClick={handleDeleteOrder}
            className="inline-flex items-center px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <TrashIcon className="-ml-1 mr-2 h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg bg-[#0a0a0a] border border-white/5 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <CurrencyDollarIcon className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Invoices</span>
          </div>
          <p className="text-xl font-bold text-white">{invoices.length}</p>
        </div>
        <div className="rounded-lg bg-[#0a0a0a] border border-white/5 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <DocumentTextIcon className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Offers</span>
          </div>
          <p className="text-xl font-bold text-white">{offers.length}</p>
        </div>
        <div className="rounded-lg bg-[#0a0a0a] border border-white/5 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <DocumentCheckIcon className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Contracts</span>
          </div>
          <p className="text-xl font-bold text-white">{contracts.length}</p>
        </div>
        <div className="rounded-lg bg-[#0a0a0a] border border-white/5 p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <CalendarIcon className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Bookings</span>
          </div>
          <p className="text-xl font-bold text-white">{bookings.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-500 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', icon: ClipboardDocumentListIcon },
          { key: 'invoices', label: 'Invoices', icon: CurrencyDollarIcon },
          { key: 'offers', label: 'Offers', icon: DocumentTextIcon },
          { key: 'contracts', label: 'Contracts', icon: DocumentCheckIcon },
          { key: 'bookings', label: 'Bookings', icon: CalendarIcon },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 md:px-6 py-3 text-sm font-medium uppercase tracking-wider transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-white border-b-2 border-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card bg-dark-800">
            <div className="card-body space-y-4">
              <h3 className="text-lg font-medium text-white">Order Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Customer</span>
                  <span className="text-sm text-white">
                    {order.customer ? (
                      <Link href={`/customers/${order.customer_id}`} className="text-blue-400 hover:text-blue-300">
                        {order.customer.company_name}
                      </Link>
                    ) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Status</span>
                  <span className="text-sm text-white">{ORDER_STATUS_OPTIONS.find((o) => o.value === order.status)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Budget</span>
                  <span className="text-sm text-white">{order.total_budget ? `${order.total_budget.toFixed(2)}` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Created</span>
                  <span className="text-sm text-white">{new Date(order.created_at).toLocaleDateString('de-DE')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-dark-800">
            <div className="card-body space-y-4">
              <h3 className="text-lg font-medium text-white">Quick Links</h3>
              <div className="space-y-2">
                <Link
                  href={`/invoices/new?order_id=${orderId}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a] border border-white/5 hover:border-white/20 transition-colors"
                >
                  <CurrencyDollarIcon className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Create Invoice</p>
                    <p className="text-xs text-gray-500">Bill the customer for this order</p>
                  </div>
                </Link>
                <button
                  onClick={() => setShowOfferModal(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a] border border-white/5 hover:border-white/20 transition-colors text-left"
                >
                  <DocumentTextIcon className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Create Offer</p>
                    <p className="text-xs text-gray-500">Send a quote to the customer</p>
                  </div>
                </button>
                <Link
                  href={`/bookings/new?order_id=${orderId}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a] border border-white/5 hover:border-white/20 transition-colors"
                >
                  <CalendarIcon className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Create Booking</p>
                    <p className="text-xs text-gray-500">Add a DJ booking to this order</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Invoices</h3>
            <Link
              href={`/invoices/new?order_id=${orderId}`}
              className="inline-flex items-center px-3 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              New Invoice
            </Link>
          </div>
          {invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No invoices yet. Create one from the Overview tab.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-dark-500">
                    <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Number</th>
                    <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Due Date</th>
                    <th className="table-cell text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-dark-500 hover:bg-dark-800/50">
                      <td className="table-cell">
                        <Link href={`/invoices/${inv.id}`} className="text-white font-medium hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="table-cell text-gray-400">{inv.total?.toFixed(2)} {inv.currency}</td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          inv.status === 'paid' ? 'bg-green-900/30 text-green-400 border-green-800' :
                          inv.status === 'sent' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                          'bg-gray-900/30 text-gray-400 border-gray-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="table-cell text-gray-400">{new Date(inv.due_date).toLocaleDateString('de-DE')}</td>
                      <td className="table-cell text-right">
                        <Link href={`/invoices/${inv.id}`} className="text-blue-400 hover:text-blue-300 text-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Offers Tab */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Offers</h3>
            <button
              onClick={() => setShowOfferModal(true)}
              className="inline-flex items-center px-3 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              New Offer
            </button>
          </div>
          {offers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No offers yet.</p>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => (
                <div key={offer.id} className="rounded-lg bg-[#0a0a0a] border border-white/5 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{offer.title}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getOfferStatusColor(offer.status)}`}>
                          {OFFER_STATUS_OPTIONS.find((o) => o.value === offer.status)?.label}
                        </span>
                      </div>
                      {offer.description && (
                        <p className="text-xs text-gray-500 mt-1">{offer.description}</p>
                      )}
                      <p className="text-sm text-blue-400 font-semibold mt-2">{offer.amount.toFixed(2)}</p>
                      {offer.valid_until && (
                        <p className="text-xs text-gray-500">Valid until {new Date(offer.valid_until).toLocaleDateString('de-DE')}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteOffer(offer.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contracts Tab */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Contracts</h3>
            <Link
              href={`/contracts/new?order_id=${orderId}`}
              className="inline-flex items-center px-3 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              New Contract
            </Link>
          </div>
          {contracts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No contracts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-dark-500">
                    <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
                    <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="table-cell text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id} className="border-b border-dark-500 hover:bg-dark-800/50">
                      <td className="table-cell">
                        <Link href={`/contracts/${c.id}`} className="text-white font-medium hover:underline">
                          {c.title}
                        </Link>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          c.status === 'signed' ? 'bg-green-900/30 text-green-400 border-green-800' :
                          c.status === 'sent' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                          'bg-gray-900/30 text-gray-400 border-gray-800'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="table-cell text-gray-400">{new Date(c.created_at).toLocaleDateString('de-DE')}</td>
                      <td className="table-cell text-right">
                        <Link href={`/contracts/${c.id}`} className="text-blue-400 hover:text-blue-300 text-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Bookings</h3>
            <Link
              href={`/bookings/new?order_id=${orderId}`}
              className="inline-flex items-center px-3 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              New Booking
            </Link>
          </div>
          {bookings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-dark-500">
                    <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Event</th>
                    <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">DJ</th>
                    <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="table-cell text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-dark-500 hover:bg-dark-800/50">
                      <td className="table-cell">
                        <Link href={`/bookings/${b.id}`} className="text-white font-medium hover:underline">
                          {b.event_name}
                        </Link>
                      </td>
                      <td className="table-cell text-gray-400">{new Date(b.start_date).toLocaleDateString('de-DE')}</td>
                      <td className="table-cell text-gray-400">{b.dj?.name || '-'}</td>
                      <td className="table-cell">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                          style={{
                            borderColor: BOOKING_STATUS_COLORS[b.status],
                            color: BOOKING_STATUS_COLORS[b.status],
                            backgroundColor: `${BOOKING_STATUS_COLORS[b.status]}20`,
                          }}
                        >
                          {BOOKING_STATUS_LABELS[b.status]}
                        </span>
                      </td>
                      <td className="table-cell text-right text-white">{b.fee?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#1a1a1a] border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">New Offer</h3>
              <button onClick={() => setShowOfferModal(false)} className="text-gray-400 hover:text-white">
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOffer} className="p-5 space-y-4">
              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  className="input"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input min-h-[80px]"
                  value={offerForm.description}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={offerForm.amount}
                    onChange={(e) => setOfferForm((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Valid Until</label>
                  <input
                    type="date"
                    className="input"
                    value={offerForm.valid_until}
                    onChange={(e) => setOfferForm((prev) => ({ ...prev, valid_until: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="px-4 py-2 border border-dark-500 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOffer}
                  className="px-4 py-2 bg-[#2563eb] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {savingOffer ? 'Saving...' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
