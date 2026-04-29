'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Employee, Department } from '@/types';
import { COUNTRIES } from '@/lib/utils/helpers';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [formData, setFormData] = useState({
    department_id: '',
    secondary_department_ids: [] as string[],
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street: '',
    postal_code: '',
    city: '',
    country: 'DE',
    entry_date: '',
    nda_link: '',
    job_desc_link: '',
    data_storage_link: '',
    bank_name: '',
    iban: '',
    bic: '',
  });

  useEffect(() => {
    fetchDepartments();
    if (params.id) fetchEmployee();
  }, [params.id]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*').order('name');
    setDepartments(data || []);
  };

  const fetchEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Employee not found');
        router.push('/personal');
        return;
      }

      const emp = data as Employee;
      setFormData({
        department_id: emp.department_id || '',
        secondary_department_ids: emp.secondary_department_ids || [],
        first_name: emp.first_name,
        last_name: emp.last_name,
        email: emp.email,
        phone: emp.phone || '',
        street: emp.street,
        postal_code: emp.postal_code,
        city: emp.city,
        country: emp.country || 'DE',
        entry_date: emp.entry_date,
        nda_link: emp.nda_link || '',
        job_desc_link: emp.job_desc_link || '',
        data_storage_link: emp.data_storage_link || '',
        bank_name: emp.bank_name || '',
        iban: emp.iban || '',
        bic: emp.bic || '',
      });
    } catch (error) {
      console.error('Error fetching employee:', error);
      toast.error('Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = {
        ...formData,
        department_id: formData.department_id || null,
        secondary_department_ids: formData.secondary_department_ids.length > 0 ? formData.secondary_department_ids : [],
        phone: formData.phone || null,
        nda_link: formData.nda_link || null,
        job_desc_link: formData.job_desc_link || null,
        data_storage_link: formData.data_storage_link || null,
        bank_name: formData.bank_name || null,
        iban: formData.iban || null,
        bic: formData.bic || null,
      };

      const { error } = await (supabase.from('employees') as any)
        .update(updateData)
        .eq('id', params.id);

      if (error) throw error;

      toast.success('Employee updated successfully');
      router.push(`/personal/${params.id}`);
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast.error(error.message || 'Failed to update employee');
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href={`/personal/${params.id}`} className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Employee
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Edit Employee</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card bg-dark-800 space-y-8">
        <div className="card-body space-y-8">
          {/* Personal Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Personal Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="label">First Name *</label>
                <input type="text" className="input" value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} required />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input type="text" className="input" value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="tel" className="input" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">Hauptabteilung</label>
                <select className="input" value={formData.department_id} onChange={(e) => handleChange('department_id', e.target.value)}>
                  <option value="" className="bg-dark-800">Abteilung waehlen...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id} className="bg-dark-800">{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Nebenabteilungen</label>
                <div className="flex flex-wrap gap-2">
                  {departments.map((d) => {
                    const selected = formData.secondary_department_ids.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          if (d.id === formData.department_id) return;
                          setFormData((prev) => ({
                            ...prev,
                            secondary_department_ids: selected
                              ? prev.secondary_department_ids.filter((id) => id !== d.id)
                              : [...prev.secondary_department_ids, d.id],
                          }));
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                          d.id === formData.department_id
                            ? 'border-gray-600 bg-gray-800 text-gray-500 cursor-not-allowed'
                            : selected
                            ? 'border-[#d0ff59] bg-[#d0ff59]/10 text-[#d0ff59]'
                            : 'border-white/10 bg-[#0a0a0a] text-gray-400 hover:border-white/30 hover:text-white'
                        }`}
                        disabled={d.id === formData.department_id}
                        title={d.id === formData.department_id ? 'Bereits Hauptabteilung' : ''}
                      >
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="label">Entry Date *</label>
                <input type="date" className="input" value={formData.entry_date} onChange={(e) => handleChange('entry_date', e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Address</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Street *</label>
                <input type="text" className="input" value={formData.street} onChange={(e) => handleChange('street', e.target.value)} required />
              </div>
              <div>
                <label className="label">Postal Code *</label>
                <input type="text" className="input" value={formData.postal_code} onChange={(e) => handleChange('postal_code', e.target.value)} required />
              </div>
              <div>
                <label className="label">City *</label>
                <input type="text" className="input" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} required />
              </div>
              <div>
                <label className="label">Country</label>
                <select className="input" value={formData.country} onChange={(e) => handleChange('country', e.target.value)}>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-dark-800">{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Document Links */}
          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Google Drive Links</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="label">NDA / Verschwiegenheitsvertrag</label>
                <input type="url" className="input" value={formData.nda_link} onChange={(e) => handleChange('nda_link', e.target.value)} placeholder="https://drive.google.com/..." />
              </div>
              <div>
                <label className="label">Stellenbeschreibung</label>
                <input type="url" className="input" value={formData.job_desc_link} onChange={(e) => handleChange('job_desc_link', e.target.value)} placeholder="https://drive.google.com/..." />
              </div>
              <div>
                <label className="label">Speicherung Persönlicher Daten</label>
                <input type="url" className="input" value={formData.data_storage_link} onChange={(e) => handleChange('data_storage_link', e.target.value)} placeholder="https://drive.google.com/..." />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-6 pt-6 border-t border-dark-500">
            <h3 className="text-lg font-medium text-white">Bank Details</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="label">Bank Name</label>
                <input type="text" className="input" value={formData.bank_name} onChange={(e) => handleChange('bank_name', e.target.value)} />
              </div>
              <div>
                <label className="label">IBAN</label>
                <input type="text" className="input" value={formData.iban} onChange={(e) => handleChange('iban', e.target.value)} />
              </div>
              <div>
                <label className="label">BIC</label>
                <input type="text" className="input" value={formData.bic} onChange={(e) => handleChange('bic', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-5 border-t border-dark-500 flex justify-end space-x-4">
          <Link href={`/personal/${params.id}`} className="px-6 py-3 border border-dark-500 text-gray-300 hover:text-white hover:border-white transition-colors text-sm font-medium uppercase tracking-wider">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="px-6 py-3 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50">
            {saving ? 'Saving...' : 'Update Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
