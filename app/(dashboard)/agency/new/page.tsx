'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { AGENCY_STATUS_OPTIONS } from '@/types';
import { DJ } from '@/types/bookings';
import { COUNTRIES, generateCustomerNumber } from '@/lib/utils/helpers';
import { ArrowLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function NewAgencyLeadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get('customer_id');
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [djs, setDjs] = useState<DJ[]>([]);
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
    email_venue: '',
    email_sender: '',
  });

  // Load DJ roster
  useEffect(() => {
    fetchDJs();
  }, []);

  const fetchDJs = async () => {
    try {
      const res = await fetch('/api/djs');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setDjs((data.djs || []).filter((d: DJ) => d.active));
    } catch {
      // silent fail
    }
  };

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
            setFormData((prev) => ({
              ...prev,
              company_name: data.company_name,
              contact_person: data.contact_person || '',
              email: data.email,
              phone: data.phone || '',
              street: data.street,
              postal_code: data.postal_code,
              city: data.city,
              country: data.country,
              status: 'contacted',
              email_venue: data.city || '',
            }));
          }
        });
    }
  }, [prefillCustomerId]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const buildEmailHtml = () => {
    const venue = formData.email_venue || 'your venue';
    const contact = formData.contact_person || 'there';
    const sender = formData.email_sender || '';
    const ort = formData.city || 'Basel';

    const activeDJs = djs.filter((d) => d.active);
    let rosterText = 'JKB, Kalisto, NoPardon, Imgefecht and Toyz';
    if (activeDJs.length > 0) {
      const names = activeDJs.map((d) => d.name);
      if (names.length === 1) rosterText = names[0];
      else if (names.length === 2) rosterText = `${names[0]} and ${names[1]}`;
      else rosterText = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#111111;border-radius:12px;overflow:hidden;border:1px solid #1a1a1a;">
          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#0000FF 0%,#0000cc 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:3px;text-transform:uppercase;">TECHNO ON THE BLOCK</p>
              <p style="margin:6px 0 0 0;font-size:11px;color:#cccccc;letter-spacing:2px;text-transform:uppercase;">The Agency – Artist Management</p>
            </td>
          </tr>
          <!-- BODY -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px 0;font-size:15px;color:#ffffff;line-height:1.6;">Hey ${contact},</p>
              <p style="margin:0 0 20px 0;font-size:15px;color:#cccccc;line-height:1.6;">Big respect for what you've built with <strong style="color:#0000FF;">${venue}</strong>. The space, the sound and the atmosphere have become a real pillar of the ${ort} techno scene.</p>
              <p style="margin:0 0 20px 0;font-size:15px;color:#cccccc;line-height:1.6;">My name is <strong style="color:#ffffff;">${sender}</strong> and I'm reaching out from <strong style="color:#ffffff;">The Agency – Artist Management</strong>, part of Techno on the Block, based in ${ort}.</p>
              <p style="margin:0 0 20px 0;font-size:15px;color:#cccccc;line-height:1.6;">We represent a group of strong techno artists who deliver the kind of raw, driving and uncompromising sound that fits rooms like yours perfectly. Artists who understand the floor and know how to hold a crowd.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;background:#0d0d0d;border-radius:8px;border-left:4px solid #0000FF;">
                <tr><td style="padding:20px 24px;">
                  <p style="margin:0 0 8px 0;font-size:12px;color:#666666;text-transform:uppercase;letter-spacing:1px;">Current Roster</p>
                  <p style="margin:0;font-size:15px;color:#ffffff;line-height:1.6;">${rosterText}</p>
                </td></tr>
              </table>
              <p style="margin:0 0 20px 0;font-size:15px;color:#cccccc;line-height:1.6;">I'm confident some of them would be a great match for future nights at <strong style="color:#ffffff;">${venue}</strong>.</p>
              <p style="margin:0 0 20px 0;font-size:15px;color:#cccccc;line-height:1.6;">If you're open to it, I'd be happy to send over artist profiles and mixes so you can get a better impression.</p>
              <p style="margin:0 0 20px 0;font-size:15px;color:#cccccc;line-height:1.6;">Respect for what you're doing for the scene — looking forward to hearing from you.</p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px 40px;text-align:center;">
              <a href="mailto:agency@technoontheblock.ch?subject=Re:%20Artists%20from%20Basel%20%E2%80%93%20Techno%20on%20the%20Block" style="display:inline-block;background:linear-gradient(135deg,#0000FF 0%,#0000cc 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Reply to this email</a>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 40px;background:#0d0d0d;border-top:1px solid #1a1a1a;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:14px;font-weight:600;color:#ffffff;">${sender}</p>
              <p style="margin:0 0 4px 0;font-size:12px;color:#666666;">The Agency – Artist Management</p>
              <p style="margin:0 0 4px 0;font-size:12px;color:#0000FF;font-weight:600;">Club Techno on the Block</p>
              <p style="margin:0;font-size:12px;color:#444444;">Basel, Switzerland</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let customerId = prefillCustomerId;

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

      // Send email
      if (formData.email && formData.contact_person && formData.email_venue && formData.email_sender) {
        try {
          const emailRes = await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: formData.email,
              subject: `Artists from Basel – Techno on the Block`,
              html: buildEmailHtml(),
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

  const emailPreview = buildEmailHtml();

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
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5" />
              Automatische Email
            </h3>
            <p className="text-sm text-gray-400">
              Wenn alle Felder ausgefüllt sind, wird beim Erstellen des Leads automatisch eine professionelle DJ-Vermarktungs-Email verschickt.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="label">Venue Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.email_venue}
                  onChange={(e) => handleChange('email_venue', e.target.value)}
                  placeholder="z.B. Kinker"
                />
              </div>
              <div>
                <label className="label">Geschickt von</label>
                <input
                  type="text"
                  className="input"
                  value={formData.email_sender}
                  onChange={(e) => handleChange('email_sender', e.target.value)}
                  placeholder="z.B. Luca Littmann"
                />
              </div>
              <div>
                <label className="label">Contact Person (auto)</label>
                <input
                  type="text"
                  className="input bg-white/5"
                  value={formData.contact_person || '—'}
                  readOnly
                  title="Wird automatisch aus dem Contact Person Feld übernommen"
                />
              </div>
            </div>

            {/* Email Preview */}
            {(formData.contact_person || formData.email_venue || formData.email_sender) && (
              <div className="mt-4 rounded-lg border border-white/10 bg-[#0a0a0a] p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Vorschau</p>
                <p className="mb-2 text-sm text-[#d0ff59]">Betreff: Artists from Basel – Techno on the Block</p>
                <div
                  className="text-sm text-gray-300 space-y-2"
                  dangerouslySetInnerHTML={{ __html: emailPreview }}
                />
              </div>
            )}
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
