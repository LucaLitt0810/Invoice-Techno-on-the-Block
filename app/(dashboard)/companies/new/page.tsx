'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { COUNTRIES } from '@/lib/utils/helpers';

export default function NewCompanyPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData: Record<string, any> = {
        ...formData,
        logo_url: logoUrl,
        user_id: user.id,
      };
      
      const { data, error } = await (supabase
        .from('companies') as any)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Company created successfully!');
      router.push('/companies');
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error(error.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
            New Company
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create a new company profile for invoicing.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-3xl">
        <div className="card-body space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="label">Company Logo</label>
            <div className="mt-2 flex items-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo preview" className="h-20 w-20 object-cover rounded-lg" />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No logo</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="ml-4 btn-secondary"
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

          {/* Company Name */}
          <div>
            <label htmlFor="name" className="label">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              className="input"
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
                className="input"
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
                className="input"
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
                className="input"
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
                className="input"
                value={formData.country}
                onChange={handleChange}
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
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
                className="input"
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
                className="input"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Tax Info */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="tax_number" className="label">
                  Tax Number
                </label>
                <input
                  type="text"
                  name="tax_number"
                  id="tax_number"
                  className="input"
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
                  className="input"
                  value={formData.vat_id}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="bank_name" className="label">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bank_name"
                  id="bank_name"
                  className="input"
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
                  className="input"
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
                  className="input"
                  value={formData.bic}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card-header border-t border-gray-200 flex items-center justify-end space-x-3">
          <Link href="/companies" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Company'}
          </button>
        </div>
      </form>
    </div>
  );
}
