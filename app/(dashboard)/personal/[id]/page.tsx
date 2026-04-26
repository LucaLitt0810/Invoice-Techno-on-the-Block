'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Employee, EmployeeEntry, ENTRY_TYPE_OPTIONS } from '@/types';
import { ArrowLeftIcon, PencilIcon, TrashIcon, ArrowTopRightOnSquareIcon, PlusIcon, DocumentTextIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

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
            href={`/personal/${employee.id}/nda/sign`}
            className="inline-flex items-center px-4 py-2 border border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PencilSquareIcon className="-ml-1 mr-2 h-5 w-5" />
            {employee.signature_verein && employee.signature_vertragsnehmer ? 'Signatures Edit' : 'Sign NDA'}
          </Link>
          <Link
            href={`/api/personal/${employee.id}/nda/pdf`}
            target="_blank"
            className="inline-flex items-center px-4 py-2 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <DocumentTextIcon className="-ml-1 mr-2 h-5 w-5" />
            NDA PDF
          </Link>
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
          <div className="card-body space-y-4">
            <h3 className="text-lg font-medium text-white">Google Drive Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {employee.nda_link ? (
                <a href={employee.nda_link} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 border border-dark-500 rounded-sm hover:border-white transition-colors">
                  <span className="text-white text-sm flex-1">NDA / Verschwiegenheitsvertrag</span>
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
                </a>
              ) : (
                <div className="flex items-center p-4 border border-dark-500 rounded-sm">
                  <span className="text-gray-500 text-sm">NDA / Verschwiegenheitsvertrag</span>
                </div>
              )}
              {employee.job_desc_link ? (
                <a href={employee.job_desc_link} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 border border-dark-500 rounded-sm hover:border-white transition-colors">
                  <span className="text-white text-sm flex-1">Stellenbeschreibung</span>
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
                </a>
              ) : (
                <div className="flex items-center p-4 border border-dark-500 rounded-sm">
                  <span className="text-gray-500 text-sm">Stellenbeschreibung</span>
                </div>
              )}
              {employee.data_storage_link ? (
                <a href={employee.data_storage_link} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 border border-dark-500 rounded-sm hover:border-white transition-colors">
                  <span className="text-white text-sm flex-1">Speicherung Pers. Daten</span>
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
                </a>
              ) : (
                <div className="flex items-center p-4 border border-dark-500 rounded-sm">
                  <span className="text-gray-500 text-sm">Speicherung Pers. Daten</span>
                </div>
              )}
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
