'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Customer, Invoice, Contract } from '@/types';
import { Booking } from '@/types/bookings';
import { AgencyLead } from '@/types';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BanknotesIcon,
  DocumentTextIcon,
  CalendarIcon,
  BriefcaseIcon,
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { CONTRACT_STATUS_LABELS } from '@/types/contracts';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/types/bookings';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [leads, setLeads] = useState<AgencyLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) fetchAll();
  }, [params.id]);

  const fetchAll = async () => {
    try {
      // Customer
      const { data: cust, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', params.id)
        .single();
      if (custErr || !cust) {
        toast.error('Customer not found');
        router.push('/customers');
        return;
      }
      setCustomer(cust);

      // Invoices
      const { data: invData } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', params.id)
        .order('invoice_date', { ascending: false });
      setInvoices(invData || []);

      // Contracts
      const { data: contData } = await supabase
        .from('contracts')
        .select('*')
        .eq('customer_id', params.id)
        .order('created_at', { ascending: false });
      setContracts(contData || []);

      // Bookings
      const { data: bookData } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', params.id)
        .order('start_date', { ascending: false });
      setBookings(bookData || []);

      // Agency Leads
      const { data: leadData } = await supabase
        .from('agency_leads')
        .select('*')
        .eq('customer_id', params.id)
        .order('created_at', { ascending: false });
      setLeads(leadData || []);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Customer not found.</p>
        <Link href="/customers" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
          Back to Customers
        </Link>
      </div>
    );
  }

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalOpen = totalInvoiced - totalPaid;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/customers" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Back to Customers
        </Link>
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{customer.company_name}</h2>
            <p className="text-sm text-gray-400 mt-1">{customer.customer_number}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href={`/invoices/new?customer_id=${customer.id}`}
          className="flex items-center justify-center px-4 py-3 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Invoice
        </Link>
        <Link
          href={`/contracts/new?customer_id=${customer.id}`}
          className="flex items-center justify-center px-4 py-3 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Contract
        </Link>
        <Link
          href={`/bookings?customer_id=${customer.id}`}
          className="flex items-center justify-center px-4 py-3 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Booking
        </Link>
        <Link
          href={`/agency/new?customer_id=${customer.id}`}
          className="flex items-center justify-center px-4 py-3 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Lead
        </Link>
      </div>

      {/* Customer Info + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-dark-800 md:col-span-2">
          <div className="card-body space-y-4">
            <h3 className="text-lg font-medium text-white">Contact Information</h3>
            <dl className="space-y-3">
              <div className="flex items-start gap-3">
                <EnvelopeIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Email</dt>
                  <dd className="text-white">
                    <a href={`mailto:${customer.email}`} className="hover:text-blue-400">{customer.email}</a>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <PhoneIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Phone</dt>
                  <dd className="text-white">{customer.phone || '-'}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPinIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Address</dt>
                  <dd className="text-white">{customer.street}, {customer.postal_code} {customer.city}, {customer.country}</dd>
                </div>
              </div>
              {customer.contact_person && (
                <div className="flex items-start gap-3">
                  <EyeIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <dt className="text-xs text-gray-500 uppercase">Contact Person</dt>
                    <dd className="text-white">{customer.contact_person}</dd>
                  </div>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="card bg-dark-800">
          <div className="card-body space-y-4">
            <h3 className="text-lg font-medium text-white">Finance Overview</h3>
            <div className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500 uppercase">Total Invoiced</dt>
                <dd className="text-xl font-bold text-white">{totalInvoiced.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase">Total Paid</dt>
                <dd className="text-xl font-bold text-green-400">{totalPaid.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase">Open Amount</dt>
                <dd className="text-xl font-bold text-yellow-400">{totalOpen.toFixed(2)}</dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5" />
              Invoices ({invoices.length})
            </h3>
            <Link
              href={`/invoices/new?customer_id=${customer.id}`}
              className="inline-flex items-center px-3 py-1.5 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
            >
              <PlusIcon className="mr-1 h-3 w-3" />
              New
            </Link>
          </div>
          {invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between p-3 border border-dark-500 rounded-sm hover:border-white transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-white">{inv.invoice_number}</span>
                    <span className="text-xs text-gray-400">{new Date(inv.invoice_date).toLocaleDateString('de-DE')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      inv.status === 'paid' ? 'bg-green-900/30 text-green-400 border-green-800' :
                      inv.status === 'overdue' ? 'bg-red-900/30 text-red-400 border-red-800' :
                      inv.status === 'sent' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                      'bg-gray-900/30 text-gray-400 border-gray-800'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-white">{inv.total?.toFixed(2)} {inv.currency}</span>
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-500" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contracts */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5" />
              Contracts ({contracts.length})
            </h3>
            <Link
              href={`/contracts/new?customer_id=${customer.id}`}
              className="inline-flex items-center px-3 py-1.5 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
            >
              <PlusIcon className="mr-1 h-3 w-3" />
              New
            </Link>
          </div>
          {contracts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No contracts yet.</p>
          ) : (
            <div className="space-y-2">
              {contracts.map((cont) => (
                <Link
                  key={cont.id}
                  href={`/contracts/${cont.id}`}
                  className="flex items-center justify-between p-3 border border-dark-500 rounded-sm hover:border-white transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-white">{cont.title}</span>
                    <span className="text-xs text-gray-400">{cont.contract_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      cont.status === 'accepted' ? 'bg-green-900/30 text-green-400 border-green-800' :
                      cont.status === 'sent' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                      cont.status === 'rejected' ? 'bg-red-900/30 text-red-400 border-red-800' :
                      'bg-gray-900/30 text-gray-400 border-gray-800'
                    }`}>
                      {CONTRACT_STATUS_LABELS[cont.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-white">{cont.fee?.toFixed(2)} {cont.currency}</span>
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-500" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bookings */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Bookings ({bookings.length})
            </h3>
            <Link
              href={`/bookings?customer_id=${customer.id}`}
              className="inline-flex items-center px-3 py-1.5 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
            >
              <PlusIcon className="mr-1 h-3 w-3" />
              New
            </Link>
          </div>
          {bookings.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No bookings yet.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center justify-between p-3 border border-dark-500 rounded-sm"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-white">{book.event_name}</span>
                    <span className="text-xs text-gray-400">{new Date(book.start_date).toLocaleDateString('de-DE')}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: BOOKING_STATUS_COLORS[book.status], color: BOOKING_STATUS_COLORS[book.status], backgroundColor: `${BOOKING_STATUS_COLORS[book.status]}20` }}>
                      {BOOKING_STATUS_LABELS[book.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-white">{book.fee?.toFixed(2)}</span>
                    <span className="text-xs text-gray-400">{book.location}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agency Leads */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <BriefcaseIcon className="h-5 w-5" />
              Agency Leads ({leads.length})
            </h3>
            <Link
              href={`/agency/new?customer_id=${customer.id}`}
              className="inline-flex items-center px-3 py-1.5 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
            >
              <PlusIcon className="mr-1 h-3 w-3" />
              New
            </Link>
          </div>
          {leads.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No agency leads yet.</p>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/agency/${lead.id}`}
                  className="flex items-center justify-between p-3 border border-dark-500 rounded-sm hover:border-white transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-white">{lead.company_name}</span>
                    <span className="text-xs text-gray-400">{lead.contact_person || '-'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      lead.status === 'closed' ? 'bg-green-900/30 text-green-400 border-green-800' :
                      lead.status === 'negotiation' ? 'bg-orange-900/30 text-orange-400 border-orange-800' :
                      'bg-blue-900/30 text-blue-400 border-blue-800'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-500" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
