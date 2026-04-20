'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Company } from '@/types';
import { COUNTRIES } from '@/lib/utils/helpers';

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchCompany();
  }, [params.id]);

  const fetchCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Coworker not found');
        router.push('/coworkers');
        return;
      }

      const company = data as Company;
      setFormData({
        name: company.name || '',
        street: company.street || '',
        postal_code: company.postal_code || '',
        city: company.city || '',
        country: company.country || 'DE',
        email: company.email || '',
        phone: company.phone || '',
        tax_number: company.tax_number || '',
        vat_id: company.vat_id || '',
        bank_name: company.bank_name || '',
        iban: company.iban || '',
        bic: company.bic || '',
      });
      setLogoUrl(company.logo_url);
    } catch (error) {
      console.error('Error fetching company:', error);
      toast.error('Failed to load coworker');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData: Record<string, any> = {
        ...formData,
        logo_url: logoUrl,
      };
      
      const { error } = await (supabase
        .from('companies') as any)
        .update(updateData)
        .eq('id', params.id);

      if (error) throw error;

      toast.success('Coworker updated successfully!');
      router.push('/coworkers');
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast.error(error.message || 'Failed to update coworker');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            Edit Coworker
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Update the coworker profile.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/coworkers"
            className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            Back to Coworkers
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card bg-dark-800 border-dark-500 max-w-3xl">
        <div className="card-body space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="label">Coworker Logo</label>
            <div className="mt-2 flex items-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo preview" className="h-20 w-20 object-cover rounded-lg border border-dark-500" />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-dark-700 flex items-center justify-center border border-dark-500">
                  <span className="text-gray-500 text-xs">No logo</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="ml-4 inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
              >
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Coworker Name */}
          <div>
            <label htmlFor="name" className="label">
              Coworker Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              className="input bg-dark-800 border-dark-500 text-white"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="street" className="label">
                Street <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="street"
                id="street"
                required
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.street}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="postal_code" className="label">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="postal_code"
                id="postal_code"
                required
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.postal_code}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="city" className="label">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                id="city"
                required
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="country" className="label">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                name="country"
                id="country"
                required
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.country}
                onChange={handleChange}
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code} className="bg-dark-800">
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="label">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                id="email"
                required
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="phone" className="label">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                className="input bg-dark-800 border-dark-500 text-white"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Tax Info */}
          <div className="border-t border-dark-500 pt-6">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider mb-4">Tax Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="tax_number" className="label">
                  Tax Number
                </label>
                <input
                  type="text"
                  name="tax_number"
                  id="tax_number"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.tax_number}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="vat_id" className="label">
                  VAT ID
                </label>
                <input
                  type="text"
                  name="vat_id"
                  id="vat_id"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.vat_id}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="border-t border-dark-500 pt-6">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider mb-4">Bank Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="bank_name" className="label">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bank_name"
                  id="bank_name"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.bank_name}
                  onChange={handleChange}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="iban" className="label">
                  IBAN
                </label>
                <input
                  type="text"
                  name="iban"
                  id="iban"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.iban}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="bic" className="label">
                  BIC / SWIFT
                </label>
                <input
                  type="text"
                  name="bic"
                  id="bic"
                  className="input bg-dark-800 border-dark-500 text-white"
                  value={formData.bic}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card-header border-t border-dark-500 flex items-center justify-end space-x-3">
          <Link
            href="/coworkers"
            className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
