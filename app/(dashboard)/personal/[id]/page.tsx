'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Employee, EmployeeEntry, ENTRY_TYPE_OPTIONS } from '@/types';
import { ArrowLeftIcon, PencilIcon, TrashIcon, ArrowTopRightOnSquareIcon, PlusIcon, DocumentTextIcon, PencilSquareIcon, CloudArrowUpIcon, LinkIcon, XMarkIcon } from '@heroicons/react/24/outline';

const TYPE_COLORS: Record<string, string> = {
  green: 'bg-green-900/30 text-green-400 border-green-800',
  red: 'bg-red-900/30 text-red-400 border-red-800',
  orange: 'bg-orange-900/30 text-orange-400 border-orange-800',
  blue: 'bg-blue-900/30 text-blue-400 border-blue-800',
  purple: 'bg-purple-900/30 text-purple-400 border-purple-800',
  teal: 'bg-teal-900/30 text-teal-400 border-teal-800',
  indigo: 'bg-indigo-900/30 text-indigo-400 border-indigo-800',
};

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<EmployeeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);

  const [entryForm, setEntryForm] = useState({
    type: 'positive' as EmployeeEntry['type'],
    title: '',
    description: '',
    entry_date: new Date().toISOString().split('T')[0],
  });

  const [linkInputs, setLinkInputs] = useState({ nda: '', jobDesc: '', dataStorage: '' });
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) fetchEmployee();
  }, [params.id]);

  const fetchEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*, department:departments(*)')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Employee not found');
        router.push('/personal');
        return;
      }

      setEmployee(data);
      setLinkInputs({
        nda: data.nda_link || '',
        jobDesc: data.job_desc_link || '',
        dataStorage: data.data_storage_link || '',
      });

      const { data: entryData, error: entryError } = await supabase
        .from('employee_entries')
        .select('*')
        .eq('employee_id', params.id)
        .order('entry_date', { ascending: false });

      if (entryError) throw entryError;
      setEntries(entryData || []);
    } catch (error) {
      console.error('Error fetching employee:', error);
      toast.error('Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLink = async (field: 'nda_link' | 'job_desc_link' | 'data_storage_link', value: string) => {
    try {
      const { error } = await (supabase.from('employees') as any)
        .update({ [field]: value || null })
        .eq('id', params.id);
      if (error) throw error;
      toast.success('Link saved');
      fetchEmployee();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save link');
    }
  };

  const handleUploadPdf = async (field: 'nda_pdf' | 'job_desc_pdf' | 'data_storage_pdf', file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('PDF must be smaller than 5MB');
      return;
    }
    setUploading(field);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const { error } = await (supabase.from('employees') as any)
          .update({ [field]: base64 })
          .eq('id', params.id);
        if (error) throw error;
        toast.success('PDF uploaded');
        fetchEmployee();
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload PDF');
    } finally {
      setUploading(null);
    }
  };

  const handleDeletePdf = async (field: 'nda_pdf' | 'job_desc_pdf' | 'data_storage_pdf') => {
    if (!confirm('Delete this PDF?')) return;
    try {
      const { error } = await (supabase.from('employees') as any)
        .update({ [field]: null })
        .eq('id', params.id);
      if (error) throw error;
      toast.success('PDF deleted');
      fetchEmployee();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete PDF');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const { error } = await (supabase.from('employees') as any).delete().eq('id', params.id);
      if (error) throw error;
      toast.success('Employee deleted');
      router.push('/personal');
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEntry(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('employee_entries').insert({
        employee_id: params.id,
        type: entryForm.type,
        title: entryForm.title,
        description: entryForm.description || null,
        entry_date: entryForm.entry_date,
        created_by: user?.id || null,
      });

      if (error) throw error;

      toast.success('Entry added successfully');
      setEntryForm({ type: 'positive', title: '', description: '', entry_date: new Date().toISOString().split('T')[0] });
      setShowEntryForm(false);
      fetchEmployee();
    } catch (error: any) {
      console.error('Error adding entry:', error);
      toast.error(error.message || 'Failed to add entry');
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this entry?')) return;

    try {
      const { error } = await (supabase.from('employee_entries') as any).delete().eq('id', entryId);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      toast.success('Entry deleted');
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry');
    }
  };

  const getTypeLabel = (type: string) => ENTRY_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;
  const getTypeColor = (type: string) => {
    const color = ENTRY_TYPE_OPTIONS.find((o) => o.value === type)?.color || 'blue';
    return TYPE_COLORS[color] || TYPE_COLORS.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Employee not found.</p>
        <Link href="/personal" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">Back to Personal</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href="/personal" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to Personal
          </Link>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">
            {employee.first_name} {employee.last_name}
          </h2>
          <p className="text-sm text-gray-400">{employee.department?.name || 'No department'}</p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <Link
            href={`/personal/${employee.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-white text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PencilIcon className="-ml-1 mr-2 h-5 w-5" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <TrashIcon className="-ml-1 mr-2 h-5 w-5" />
            Delete
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="card bg-dark-800">
          <div className="card-body space-y-4">
            <h3 className="text-lg font-medium text-white">Personal Information</h3>
            <dl className="space-y-3">
              <div><dt className="text-xs text-gray-500 uppercase">Email</dt><dd className="text-white">{employee.email}</dd></div>
              <div><dt className="text-xs text-gray-500 uppercase">Phone</dt><dd className="text-white">{employee.phone || '-'}</dd></div>
              <div><dt className="text-xs text-gray-500 uppercase">Address</dt><dd className="text-white">{employee.street}, {employee.postal_code} {employee.city}, {employee.country}</dd></div>
              <div><dt className="text-xs text-gray-500 uppercase">Entry Date</dt><dd className="text-white">{new Date(employee.entry_date).toLocaleDateString('de-DE')}</dd></div>
            </dl>
          </div>
        </div>

        {/* Bank Details */}
        <div className="card bg-dark-800">
          <div className="card-body space-y-4">
            <h3 className="text-lg font-medium text-white">Bank Details</h3>
            <dl className="space-y-3">
              <div><dt className="text-xs text-gray-500 uppercase">Bank Name</dt><dd className="text-white">{employee.bank_name || '-'}</dd></div>
              <div><dt className="text-xs text-gray-500 uppercase">IBAN</dt><dd className="text-white">{employee.iban || '-'}</dd></div>
              <div><dt className="text-xs text-gray-500 uppercase">BIC</dt><dd className="text-white">{employee.bic || '-'}</dd></div>
            </dl>
          </div>
        </div>

        {/* Documents */}
        <div className="card bg-dark-800 md:col-span-2">
          <div className="card-body space-y-6">
            <h3 className="text-lg font-medium text-white">Documents</h3>

            {/* NDA */}
            <div className="border border-dark-500 rounded-sm p-4 space-y-4">
              <h4 className="text-sm font-medium text-white uppercase tracking-wider">NDA / Verschwiegenheitsvertrag</h4>

              {/* Google Drive Link */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase flex items-center gap-1.5">
                  <LinkIcon className="h-3 w-3" /> Google Drive Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="input flex-1 text-sm"
                    placeholder="https://drive.google.com/..."
                    value={linkInputs.nda}
                    onChange={(e) => setLinkInputs((p) => ({ ...p, nda: e.target.value }))}
                  />
                  <button
                    onClick={() => handleUpdateLink('nda_link', linkInputs.nda)}
                    className="px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
                  >
                    Save
                  </button>
                </div>
                {employee.nda_link && (
                  <a href={employee.nda_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300">
                    <ArrowTopRightOnSquareIcon className="mr-1 h-3 w-3" />
                    Open Link
                  </a>
                )}
              </div>

              <div className="h-px bg-dark-500" />

              {/* PDF Upload */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase flex items-center gap-1.5">
                  <CloudArrowUpIcon className="h-3 w-3" /> PDF Upload
                </label>
                {employee.nda_pdf ? (
                  <div className="flex items-center justify-between p-3 border border-green-500/30 rounded-sm bg-green-900/10">
                    <a href={employee.nda_pdf} target="_blank" rel="noopener noreferrer" className="text-sm text-green-400 hover:text-green-300 flex items-center">
                      <DocumentTextIcon className="mr-2 h-4 w-4" />
                      PDF uploaded — View
                    </a>
                    <button
                      onClick={() => handleDeletePdf('nda_pdf')}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Delete PDF"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".pdf"
                      id="nda-pdf-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadPdf('nda_pdf', file);
                        e.target.value = '';
                      }}
                    />
                    <label
                      htmlFor="nda-pdf-upload"
                      className={`flex-1 flex items-center justify-center px-3 py-2 border border-dark-500 text-gray-400 hover:border-white hover:text-white transition-colors text-xs font-medium uppercase tracking-wider cursor-pointer ${uploading === 'nda_pdf' ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {uploading === 'nda_pdf' ? 'Uploading...' : 'Choose PDF'}
                    </label>
                  </div>
                )}
              </div>

              <div className="h-px bg-dark-500" />

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Link
                  href={`/personal/${employee.id}/nda/sign`}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors text-xs font-medium uppercase tracking-wider"
                >
                  <PencilSquareIcon className="mr-1.5 h-4 w-4" />
                  {employee.signature_verein && employee.signature_vertragsnehmer ? 'Signatures Edit' : 'Sign NDA'}
                </Link>
                <Link
                  href={`/api/personal/${employee.id}/nda/pdf`}
                  target="_blank"
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
                >
                  <DocumentTextIcon className="mr-1.5 h-4 w-4" />
                  NDA PDF
                </Link>
              </div>
            </div>

            {/* Job Description */}
            <div className="border border-dark-500 rounded-sm p-4 space-y-4">
              <h4 className="text-sm font-medium text-white uppercase tracking-wider">Stellenbeschreibung</h4>

              {/* Google Drive Link */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase flex items-center gap-1.5">
                  <LinkIcon className="h-3 w-3" /> Google Drive Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="input flex-1 text-sm"
                    placeholder="https://drive.google.com/..."
                    value={linkInputs.jobDesc}
                    onChange={(e) => setLinkInputs((p) => ({ ...p, jobDesc: e.target.value }))}
                  />
                  <button
                    onClick={() => handleUpdateLink('job_desc_link', linkInputs.jobDesc)}
                    className="px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
                  >
                    Save
                  </button>
                </div>
                {employee.job_desc_link && (
                  <a href={employee.job_desc_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300">
                    <ArrowTopRightOnSquareIcon className="mr-1 h-3 w-3" />
                    Open Link
                  </a>
                )}
              </div>

              <div className="h-px bg-dark-500" />

              {/* PDF Upload */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase flex items-center gap-1.5">
                  <CloudArrowUpIcon className="h-3 w-3" /> PDF Upload
                </label>
                {employee.job_desc_pdf ? (
                  <div className="flex items-center justify-between p-3 border border-green-500/30 rounded-sm bg-green-900/10">
                    <a href={employee.job_desc_pdf} target="_blank" rel="noopener noreferrer" className="text-sm text-green-400 hover:text-green-300 flex items-center">
                      <DocumentTextIcon className="mr-2 h-4 w-4" />
                      PDF uploaded — View
                    </a>
                    <button
                      onClick={() => handleDeletePdf('job_desc_pdf')}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Delete PDF"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".pdf"
                      id="job-desc-pdf-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadPdf('job_desc_pdf', file);
                        e.target.value = '';
                      }}
                    />
                    <label
                      htmlFor="job-desc-pdf-upload"
                      className={`flex-1 flex items-center justify-center px-3 py-2 border border-dark-500 text-gray-400 hover:border-white hover:text-white transition-colors text-xs font-medium uppercase tracking-wider cursor-pointer ${uploading === 'job_desc_pdf' ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {uploading === 'job_desc_pdf' ? 'Uploading...' : 'Choose PDF'}
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Data Storage Consent */}
            <div className="border border-dark-500 rounded-sm p-4 space-y-4">
              <h4 className="text-sm font-medium text-white uppercase tracking-wider">Speicherung Pers. Daten</h4>

              {/* Google Drive Link */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase flex items-center gap-1.5">
                  <LinkIcon className="h-3 w-3" /> Google Drive Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="input flex-1 text-sm"
                    placeholder="https://drive.google.com/..."
                    value={linkInputs.dataStorage}
                    onChange={(e) => setLinkInputs((p) => ({ ...p, dataStorage: e.target.value }))}
                  />
                  <button
                    onClick={() => handleUpdateLink('data_storage_link', linkInputs.dataStorage)}
                    className="px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
                  >
                    Save
                  </button>
                </div>
                {employee.data_storage_link && (
                  <a href={employee.data_storage_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300">
                    <ArrowTopRightOnSquareIcon className="mr-1 h-3 w-3" />
                    Open Link
                  </a>
                )}
              </div>

              <div className="h-px bg-dark-500" />

              {/* PDF Upload */}
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase flex items-center gap-1.5">
                  <CloudArrowUpIcon className="h-3 w-3" /> PDF Upload
                </label>
                {employee.data_storage_pdf ? (
                  <div className="flex items-center justify-between p-3 border border-green-500/30 rounded-sm bg-green-900/10">
                    <a href={employee.data_storage_pdf} target="_blank" rel="noopener noreferrer" className="text-sm text-green-400 hover:text-green-300 flex items-center">
                      <DocumentTextIcon className="mr-2 h-4 w-4" />
                      PDF uploaded — View
                    </a>
                    <button
                      onClick={() => handleDeletePdf('data_storage_pdf')}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Delete PDF"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".pdf"
                      id="data-storage-pdf-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadPdf('data_storage_pdf', file);
                        e.target.value = '';
                      }}
                    />
                    <label
                      htmlFor="data-storage-pdf-upload"
                      className={`flex-1 flex items-center justify-center px-3 py-2 border border-dark-500 text-gray-400 hover:border-white hover:text-white transition-colors text-xs font-medium uppercase tracking-wider cursor-pointer ${uploading === 'data_storage_pdf' ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {uploading === 'data_storage_pdf' ? 'Uploading...' : 'Choose PDF'}
                    </label>
                  </div>
                )}
              </div>

              <div className="h-px bg-dark-500" />

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Link
                  href={`/personal/${employee.id}/consent/sign`}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors text-xs font-medium uppercase tracking-wider"
                >
                  <PencilSquareIcon className="mr-1.5 h-4 w-4" />
                  {employee.consent_signature_verein && employee.consent_signature_vertragsnehmer ? 'Signatures Edit' : 'Sign Consent'}
                </Link>
                <Link
                  href={`/api/personal/${employee.id}/consent/pdf`}
                  target="_blank"
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-colors text-xs font-medium uppercase tracking-wider"
                >
                  <DocumentTextIcon className="mr-1.5 h-4 w-4" />
                  Consent PDF
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Entries / Logs */}
      <div className="card bg-dark-800">
        <div className="card-body space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Logs</h3>
            <button
              onClick={() => setShowEntryForm(!showEntryForm)}
              className="inline-flex items-center px-3 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
            >
              <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
              {showEntryForm ? 'Cancel' : 'Add Entry'}
            </button>
          </div>

          {showEntryForm && (
            <form onSubmit={handleAddEntry} className="p-4 border border-dark-500 rounded-sm space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={entryForm.type} onChange={(e) => setEntryForm((p) => ({ ...p, type: e.target.value as EmployeeEntry['type'] }))}>
                    {ENTRY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-dark-800">{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Title *</label>
                  <input type="text" className="input" value={entryForm.title} onChange={(e) => setEntryForm((p) => ({ ...p, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={entryForm.entry_date} onChange={(e) => setEntryForm((p) => ({ ...p, entry_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input min-h-[80px]" value={entryForm.description} onChange={(e) => setEntryForm((p) => ({ ...p, description: e.target.value }))} placeholder="Details..." />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={savingEntry} className="px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50">
                  {savingEntry ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No logs yet.</p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="p-4 border border-dark-500 rounded-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(entry.type)}`}>
                          {getTypeLabel(entry.type)}
                        </span>
                        <span className="text-sm text-gray-500">{new Date(entry.entry_date).toLocaleDateString('de-DE')}</span>
                      </div>
                      <h4 className="text-white font-medium">{entry.title}</h4>
                      {entry.description && <p className="text-gray-400 text-sm mt-1">{entry.description}</p>}
                    </div>
                    <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-400 hover:text-red-300 ml-4">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
