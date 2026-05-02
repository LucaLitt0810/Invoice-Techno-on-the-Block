'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { AGENCY_STATUS_OPTIONS } from '@/types';
import { COUNTRIES, generateCustomerNumber } from '@/lib/utils/helpers';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function NewAgencyLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get('customer_id');
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [prefillCustomer, setPrefillCustomer] = useState<{ company_name: string; contact_person: string | null; email: string; phone: string | null; street: string; postal_code: string; city: string; country: string } | null>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    street: '',
    postal_code: '',
    city: '',
    country: 'DE',
    status: 'contacted' as 'contacted' | 'negotiation' | 'closed',
    notes: '',
    email_name: '',
    email_venue: '',
    email_sender: '',
  });

  // Load prefill customer data
  useEffect(() => {
    if (prefillCustomerId) {
      supabase
        .from('customers')
        .select('*')
        .eq('id', prefillCustomerId)
        .single()
        .then(({ data }) => {
          if (data) {
            setPrefillCustomer(data);
            setFormData({
              company_name: data.company_name,
              contact_person: data.contact_person || '',
              email: data.email,
              phone: data.phone || '',
              street: data.street,
              postal_code: data.postal_code,
              city: data.city,
              country: data.country,
              status: 'contacted',
              notes: '',
            });
          }
        });
    }
  }, [prefillCustomerId]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let customerId = prefillCustomerId;

      // Step 1: Create customer only if not prefilled
      if (!customerId) {
        const customerData = {
          company_name: formData.company_name,
          contact_person: formData.contact_person || null,
          email: formData.email,
          phone: formData.phone || null,
          street: formData.street,
          postal_code: formData.postal_code,
          city: formData.city,
          country: formData.country,
          customer_number: generateCustomerNumber(),
        };

        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .insert(customerData)
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = customer.id;
      }

      // Step 2: Create agency lead linked to customer and user
      const leadData = {
        user_id: user.id,
        user_email: user.email,
        company_name: formData.company_name,
        contact_person: formData.contact_person || null,
        email: formData.email,
        phone: formData.phone || null,
        street: formData.street,
        postal_code: formData.postal_code,
        city: formData.city,
        country: formData.country,
        status: formData.status,
        notes: formData.notes || null,
        customer_id: customerId,
      };

      const { error: leadError } = await supabase
        .from('agency_leads')
        .insert(leadData);

      if (leadError) {
        if (leadError.message?.includes('agency_leads') || leadError.code === '42P01') {
          toast.error(
            'The agency_leads table does not exist yet. Please run the SQL migration in Supabase first.',
            { duration: 6000 }
          );
          router.push('/agency');
          return;
        }
        throw leadError;
      }

      // Step 3: Send welcome email if email fields are filled
      if (formData.email && formData.email_name && formData.email_venue && formData.email_sender) {
        try {
          const emailRes = await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: formData.email,
              subject: `Anfrage - ${formData.company_name}`,
              html: `
                <p>Hallo ${formData.email_name},</p>
                <p>wir sind Techno on the Block, ein Verein, der sich auf die Organisation von Events spezialisiert hat.</p>
                <p>Wir würden uns freuen, bald auch in <strong>${formData.email_venue}</strong> ein Event organisieren zu dürfen.</p>
                <p>Falls du Interesse hast, melde dich gerne bei uns.</p>
                <br>
                <p>Freundliche Grüsse</p>
                <p>${formData.email_sender}<br>Techno on the Block</p>
              `,
            }),
          });
          if (emailRes.ok) {
            toast.success('Email wurde verschickt!');
          } else {
            const err = await emailRes.json();
            toast.error('Email konnte nicht verschickt werden: ' + (err.error || 'Unbekannter Fehler'));
          }
        } catch (emailErr: any) {
          console.error('Email error:', emailErr);
          toast.error('Email-Fehler: ' + emailErr.message);
        }
      }

      toast.success('Lead created successfully and customer added!');
      router.push('/agency');
    } catch (error: any) {
      console.error('Error creating lead:', error);
      toast.error(error.message || 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href="/agency" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Agency
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">New Lead</h2>
          <p className="mt-1 text-sm text-gray-400">
            Register a new venue or organizer. A customer record will be created automatically.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card bg-dark-800 space-y-8">
        <div className="card-body">
          {/* Company Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Company Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Company Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Contact Person</label>
                <input
                  type="text"
                  className="input"
                  value={formData.contact_person}
                  onChange={(e) => handleChange('contact_person', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  className="input"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  {AGENCY_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-dark-800">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Address</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Street *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.street}
                  onChange={(e) => handleChange('street', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Postal Code *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.postal_code}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">City *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Country</label>
                <select
                  className="input"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-dark-800">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Email Auto-Send */}
          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Automatische Email</h3>
            <p className="text-sm text-gray-400">
              Diese Felder werden für die automatische Willkommens-Email verwendet.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="label">Name Empfänger</label>
                <input
                  type="text"
                  className="input"
                  value={formData.email_name}
                  onChange={(e) => handleChange('email_name', e.target.value)}
                  placeholder="z.B. Max Mustermann"
                />
              </div>
              <div>
                <label className="label">Ort / Venue</label>
                <input
                  type="text"
                  className="input"
                  value={formData.email_venue}
                  onChange={(e) => handleChange('email_venue', e.target.value)}
                  placeholder="z.B. Pratteln"
                />
              </div>
              <div>
                <label className="label">Geschickt von</label>
                <input
                  type="text"
                  className="input"
                  value={formData.email_sender}
                  onChange={(e) => handleChange('email_sender', e.target.value)}
                  placeholder="z.B. Ben Littmann"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Notes</h3>
            <div>
              <label className="label">Internal Notes</label>
              <textarea
                className="input min-h-[100px]"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any notes about this lead..."
              />
            </div>
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
            {saving ? 'Saving...' : 'Create Lead & Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
