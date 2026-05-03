'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { AGENCY_STATUS_OPTIONS, EmailTeamMember } from '@/types';
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
  const [teamMembers, setTeamMembers] = useState<EmailTeamMember[]>([]);
  const [emailSenderId, setEmailSenderId] = useState('');
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
  });

  // Load DJ roster & team
  useEffect(() => {
    fetchDJs();
    fetchTeam();
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

  const fetchTeam = async () => {
    try {
      const { data, error } = await supabase
        .from('email_team_members')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      const members = (data || []) as EmailTeamMember[];
      setTeamMembers(members);
      // Default to first member
      if (members.length > 0) setEmailSenderId(members[0].id);
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
    const selectedSender = teamMembers.find((m) => m.id === emailSenderId);
    const sender = selectedSender?.name || 'Luca Littmann';
    const senderCity = formData.city || 'Basel';
    const ort = formData.city || 'Basel';

    const activeDJs = djs.filter((d) => d.active);
    const defaultDJs = [
      { name: 'JKB', genre: 'Raw Techno' },
      { name: 'Kalisto', genre: 'Peak Time' },
      { name: 'NoPardon', genre: 'Hardgroove' },
      { name: 'Imgefecht', genre: 'Industrial' },
      { name: 'Toyz', genre: 'Hypnotic' },
    ];
    const rosterDJs = activeDJs.length > 0
      ? activeDJs.map((d) => ({ name: d.name, genre: d.genre || '' }))
      : defaultDJs;

    const rosterRows = rosterDJs.map((dj) => `
      <tr>
        <td style="padding:8px 0;">
          <p class="dm-text-strong" style="margin:0;font-size:13px;font-weight:700;color:#111111;letter-spacing:0.3px;">${dj.name}</p>
          ${dj.genre ? `<p style="margin:2px 0 0 0;font-size:10px;color:#2563eb;text-transform:uppercase;letter-spacing:1px;">${dj.genre}</p>` : ''}
        </td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    body { word-wrap: break-word; overflow-wrap: break-word; -webkit-text-size-adjust: 100%; }
    @media only screen and (max-width: 600px) {
      .hide-mobile { display: none !important; }
      .show-mobile { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
      .mob-center { text-align: center !important; }
      .mob-pad { padding: 24px 20px !important; }
      .mob-border { border-top: 1px solid #e8e8e8 !important; border-bottom: 1px solid #e8e8e8 !important; }
      .mob-wrap { word-wrap: break-word !important; overflow-wrap: break-word !important; }
    }
    @media only screen and (min-width: 601px) {
      .hide-desktop { display: none !important; }
    }
    @media (prefers-color-scheme: dark) {
      .dm-bg-body { background-color: #111111 !important; }
      .dm-bg-card { background-color: #1a1a1a !important; }
      .dm-bg-left { background-color: #141414 !important; border-color: #2a2a2a !important; }
      .dm-bg-right { background-color: #141414 !important; border-color: #2a2a2a !important; }
      .dm-bg-footer { background-color: #111111 !important; border-color: #2a2a2a !important; }
      .dm-text-primary { color: #f5f5f5 !important; }
      .dm-text-secondary { color: #bbbbbb !important; }
      .dm-text-muted { color: #777777 !important; }
      .dm-text-strong { color: #ffffff !important; }
      .dm-border { border-color: #2a2a2a !important; }
    }
  </style>
</head>
<body class="dm-bg-body" style="margin:0;padding:0;background-color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:720px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);" class="dm-bg-card">

          <!-- TOP BAR -->
          <tr>
            <td style="background:linear-gradient(90deg,#2563eb 0%,#1d4ed8 100%);padding:16px 24px;text-align:center;">
              <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:4px;text-transform:uppercase;">TECHNO ON THE BLOCK</p>
              <p style="margin:4px 0 0 0;font-size:9px;color:rgba(255,255,255,0.8);letter-spacing:3px;text-transform:uppercase;">The Agency – Artist Management</p>
            </td>
          </tr>

          <!-- DESKTOP: 3 columns side by side -->
          <tr class="hide-mobile">
            <td style="padding:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <!-- LEFT: DJ ROSTER -->
                  <td class="dm-bg-left" width="180" style="width:180px;min-width:180px;background:#f8f9fa;border-right:1px solid #e8e8e8;padding:28px 20px;vertical-align:top;">
                    <p style="margin:0 0 16px 0;font-size:10px;color:#2563eb;text-transform:uppercase;letter-spacing:2px;font-weight:700;">DJ Roster</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${rosterRows}
                    </table>
                  </td>
                  <!-- CENTER: MAIN CONTENT -->
                  <td style="padding:32px 28px;vertical-align:top;">
                    <p class="dm-text-primary" style="margin:0 0 16px 0;font-size:15px;color:#111111;line-height:1.55;">Hey ${contact},</p>
                    <p class="dm-text-secondary" style="margin:0 0 16px 0;font-size:15px;color:#444444;line-height:1.55;">Big respect for what you've built with <strong style="color:#2563eb;">${venue}</strong>. The space, the sound and the atmosphere have become a real pillar of the ${ort} techno scene.</p>
                    <p class="dm-text-secondary" style="margin:0 0 16px 0;font-size:15px;color:#444444;line-height:1.55;">My name is <strong class="dm-text-strong" style="color:#111111;">${sender}</strong> and I'm reaching out from <strong class="dm-text-strong" style="color:#111111;">The Agency – Artist Management</strong>, part of Techno on the Block, based in Basel.</p>
                    <p class="dm-text-secondary" style="margin:0 0 16px 0;font-size:15px;color:#444444;line-height:1.55;">We represent a group of strong techno artists who deliver the kind of raw, driving and uncompromising sound that fits rooms like yours perfectly.</p>
                    <p class="dm-text-secondary" style="margin:0 0 16px 0;font-size:15px;color:#444444;line-height:1.55;">I'm confident some of them would be a great match for future nights at <strong class="dm-text-strong" style="color:#111111;">${venue}</strong>.</p>
                    <p class="dm-text-secondary" style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.55;">If you're open to it, I'd be happy to send over artist profiles and mixes so you can get a better impression.</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="text-align:center;padding:8px 0 4px 0;">
                          <a href="mailto:agency@technoontheblock.ch?subject=Re:%20Artists%20from%20Basel%20%E2%80%93%20Techno%20on%20the%20Block" style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Reply to this email</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- RIGHT: AGENCY TEAM -->
                  <td class="dm-bg-right" width="160" style="width:160px;min-width:160px;background:#f8f9fa;border-left:1px solid #e8e8e8;padding:28px 18px;vertical-align:top;">
                    <p style="margin:0 0 16px 0;font-size:10px;color:#2563eb;text-transform:uppercase;letter-spacing:2px;font-weight:700;">Agency Team</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom:14px;">
                          <p class="dm-text-strong" style="margin:0;font-size:13px;font-weight:700;color:#111111;">${sender}</p>
                          <p style="margin:3px 0 0 0;font-size:10px;color:#666666;line-height:1.4;">Artist Management<br>Techno on the Block</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:14px;border-top:1px solid #e0e0e0;" class="dm-border">
                          <p style="margin:0;font-size:10px;color:#888888;line-height:1.5;">
                            <strong style="color:#2563eb;">Club</strong><br>
                            Techno on the Block<br>
                            Basel, Switzerland<br><br>
                            <a href="mailto:agency@technoontheblock.ch" style="color:#2563eb;text-decoration:none;">agency@technoontheblock.ch</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MOBILE: stacked Content → Team → Roster -->
          <tr class="hide-desktop">
            <td style="padding:0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;">
                <!-- CONTENT -->
                <tr>
                  <td class="mob-wrap mob-pad" style="padding:28px 20px;word-wrap:break-word;overflow-wrap:break-word;">
                    <p class="dm-text-primary" style="margin:0 0 16px 0;font-size:15px;color:#111111;line-height:1.55;">Hey ${contact},</p>
                    <p class="dm-text-secondary" style="margin:0 0 16px 0;font-size:15px;color:#444444;line-height:1.55;">Big respect for what you've built with <strong style="color:#2563eb;">${venue}</strong>. The space, the sound and the atmosphere have become a real pillar of the ${ort} techno scene.</p>
                    <p class="dm-text-secondary" style="margin:0 0 16px 0;font-size:15px;color:#444444;line-height:1.55;">My name is <strong class="dm-text-strong" style="color:#111111;">${sender}</strong> and I'm reaching out from <strong class="dm-text-strong" style="color:#111111;">The Agency – Artist Management</strong>, part of Techno on the Block, based in Basel.</p>
                    <p class="dm-text-secondary" style="margin:0 0 16px 0;font-size:15px;color:#444444;line-height:1.55;">We represent a group of strong techno artists who deliver the kind of raw, driving and uncompromising sound that fits rooms like yours perfectly.</p>
                    <p class="dm-text-secondary" style="margin:0 0 16px 0;font-size:15px;color:#444444;line-height:1.55;">I'm confident some of them would be a great match for future nights at <strong class="dm-text-strong" style="color:#111111;">${venue}</strong>.</p>
                    <p class="dm-text-secondary" style="margin:0 0 20px 0;font-size:15px;color:#444444;line-height:1.55;">If you're open to it, I'd be happy to send over artist profiles and mixes so you can get a better impression.</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td class="mob-center" style="text-align:center;padding:8px 0 4px 0;">
                          <a href="mailto:agency@technoontheblock.ch?subject=Re:%20Artists%20from%20Basel%20%E2%80%93%20Techno%20on%20the%20Block" style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Reply to this email</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- TEAM -->
                <tr>
                  <td class="mob-wrap mob-pad dm-bg-right" style="padding:24px 20px;background:#f8f9fa;border-top:1px solid #e8e8e8;word-wrap:break-word;overflow-wrap:break-word;">
                    <p style="margin:0 0 12px 0;font-size:10px;color:#2563eb;text-transform:uppercase;letter-spacing:2px;font-weight:700;">Agency Team</p>
                    <p class="dm-text-strong" style="margin:0;font-size:13px;font-weight:700;color:#111111;">${sender}</p>
                    <p style="margin:3px 0 0 0;font-size:10px;color:#666666;line-height:1.4;">Artist Management<br>Techno on the Block</p>
                    <p style="margin:12px 0 0 0;padding-top:12px;border-top:1px solid #e0e0e0;font-size:10px;color:#888888;line-height:1.5;" class="dm-border">
                      <strong style="color:#2563eb;">Club</strong><br>
                      Techno on the Block<br>
                      Basel, Switzerland<br><br>
                      <a href="mailto:agency@technoontheblock.ch" style="color:#2563eb;text-decoration:none;">agency@technoontheblock.ch</a>
                    </p>
                  </td>
                </tr>
                <!-- ROSTER -->
                <tr>
                  <td class="mob-wrap mob-pad dm-bg-left" style="padding:24px 20px;background:#f8f9fa;border-top:1px solid #e8e8e8;border-bottom:1px solid #e8e8e8;word-wrap:break-word;overflow-wrap:break-word;">
                    <p style="margin:0 0 12px 0;font-size:10px;color:#2563eb;text-transform:uppercase;letter-spacing:2px;font-weight:700;">DJ Roster</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${rosterRows}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="dm-bg-footer" style="padding:16px 24px;background:#f0f0f0;border-top:1px solid #e0e0e0;text-align:center;">
              <p class="dm-text-muted" style="margin:0;font-size:10px;color:#999999;letter-spacing:1px;text-transform:uppercase;">© Techno on the Block — The Agency</p>
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
      if (formData.email && formData.contact_person && formData.email_venue && emailSenderId) {
        try {
          const selSender = teamMembers.find((m) => m.id === emailSenderId);
          const subjCity = formData.city || 'Basel';
          const emailRes = await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: formData.email,
              subject: `Artists from ${subjCity} – Techno on the Block`,
              from: selSender?.email ? `${selSender.name} <${selSender.email}>` : undefined,
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
                <select
                  className="input"
                  value={emailSenderId}
                  onChange={(e) => setEmailSenderId(e.target.value)}
                >
                  {teamMembers.length === 0 && (
                    <option value="" className="bg-dark-800">Loading team...</option>
                  )}
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id} className="bg-dark-800">
                      {m.name}{m.role ? ` (${m.role})` : ''}
                    </option>
                  ))}
                </select>
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
            {(formData.contact_person || formData.email_venue || emailSenderId) && (
              <div className="mt-4 rounded-lg border border-white/10 bg-[#0a0a0a] p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Vorschau</p>
                <p className="mb-2 text-sm text-[#d0ff59]">Betreff: Artists from {formData.city || 'Basel'} – Techno on the Block</p>
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
