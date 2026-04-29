'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Employee, Department } from '@/types';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon, FolderIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, CalendarIcon, ArrowRightIcon, CloudArrowUpIcon, XMarkIcon, ClipboardDocumentListIcon, WrenchScrewdriverIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

export default function PersonalPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDept, setActiveDept] = useState<string>('all');
  const [newDeptName, setNewDeptName] = useState('');
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attEvent, setAttEvent] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: depts, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (deptError) throw deptError;
      setDepartments(depts || []);

      const { data: emps, error: empError } = await supabase
        .from('employees')
        .select('*, department:departments(*)')
        .order('last_name');

      if (empError) throw empError;
      setEmployees(emps || []);
    } catch (error) {
      console.error('Error fetching personnel:', error);
      toast.error('Failed to load personnel');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({ name: newDeptName.trim() })
        .select()
        .single();

      if (error) throw error;
      setDepartments((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewDeptName('');
      setShowDeptForm(false);
      toast.success('Department added');
    } catch (error: any) {
      console.error('Error adding department:', error);
      toast.error(error.message || 'Failed to add department');
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!confirm(`Delete department "${name}"?`)) return;

    try {
      const { error } = await (supabase.from('departments') as any).delete().eq('id', id);
      if (error) throw error;

      setDepartments((prev) => prev.filter((d) => d.id !== id));
      setEmployees((prev) => prev.map((e) => (e.department_id === id ? { ...e, department_id: null, department: undefined } : e)));
      if (activeDept === id) setActiveDept('all');
      toast.success('Department deleted');
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error('CSV file is empty or missing header');
        return;
      }

      // Parse CSV with quote handling
      const parseRow = (line: string): string[] => {
        const cells: string[] = [];
        let cell = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(cell.trim());
            cell = '';
          } else {
            cell += char;
          }
        }
        cells.push(cell.trim());
        return cells.map((c) => c.replace(/^"|"$/g, ''));
      };

      const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim());
      const getIdx = (...names: string[]) => {
        for (const name of names) {
          const idx = headers.indexOf(name);
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const rows = lines.slice(1).map(parseRow);

      // Support both English and German column names + your Google Sheet format
      const firstNameIdx = getIdx('first_name', 'vorname');
      const lastNameIdx = getIdx('last_name', 'nachname');
      const emailIdx = getIdx('email', 'email adresse');
      const phoneIdx = getIdx('phone', 'telefon nummer');
      const addressIdx = getIdx('melde adresse', 'address', 'adresse');
      const deptIdx = getIdx('department', 'welche abteilung', 'abteilung');
      const bankNameIdx = getIdx('bank name', 'bank_name');
      const ibanIdx = getIdx('iban');
      const bicIdx = getIdx('bic');

      if (firstNameIdx === -1 || lastNameIdx === -1 || emailIdx === -1) {
        toast.error('CSV must have at least: first_name / Vorname, last_name / Nachname, email / Email Adresse columns');
        return;
      }

      // Build department map
      const deptMap = new Map<string, string>();
      for (const d of departments) {
        deptMap.set(d.name.toLowerCase(), d.id);
      }

      let imported = 0;
      let skipped = 0;

      for (const cells of rows) {
        const firstName = cells[firstNameIdx]?.trim();
        const lastName = cells[lastNameIdx]?.trim();
        const email = cells[emailIdx]?.trim();
        if (!firstName || !lastName || !email) {
          skipped++;
          continue;
        }

        // Handle department
        let deptId: string | null = null;
        const deptName = deptIdx >= 0 ? cells[deptIdx]?.trim() : null;
        if (deptName) {
          const key = deptName.toLowerCase();
          if (deptMap.has(key)) {
            deptId = deptMap.get(key)!;
          } else {
            const { data: newDept } = await supabase
              .from('departments')
              .insert({ name: deptName })
              .select()
              .single();
            if (newDept) {
              deptId = newDept.id;
              deptMap.set(key, deptId);
              setDepartments((prev) => [...prev, newDept].sort((a, b) => a.name.localeCompare(b.name)));
            }
          }
        }

        // Parse address: "Street, PLZ City" or "Street, PLZ City, Country"
        let street = '';
        let postalCode = '';
        let city = '';
        let country = 'DE';

        const addressRaw = addressIdx >= 0 ? cells[addressIdx]?.trim() : '';
        if (addressRaw) {
          const parts = addressRaw.split(',').map((p) => p.trim());
          if (parts.length >= 2) {
            street = parts[0];
            // Last part might be country if it looks like a country code
            const lastPart = parts[parts.length - 1];
            if (/^(DE|CH|AT|FR|US|UK|IT|ES|NL|BE|LU|PL|CZ|HU|SI|SK|HR|RS|BA|MK|ME|AL|BG|RO|MD|UA|BY|EE|LV|LT|FI|SE|NO|DK|IS|IE|PT|GR|CY|MT|LI|MC|AD|SM|VA|JE|GG|IM|AX|FO|GL|AQ|BV|HM|SJ)$/.test(lastPart.toUpperCase())) {
              country = lastPart.toUpperCase();
              parts.pop();
            }
            // Second-to-last or remaining middle part: PLZ + City
            if (parts.length >= 2) {
              const plzCity = parts[parts.length - 1];
              const plzMatch = plzCity.match(/^(\d{4,5})\s+(.+)$/);
              if (plzMatch) {
                postalCode = plzMatch[1];
                city = plzMatch[2];
              } else {
                city = plzCity;
              }
            }
          } else {
            street = addressRaw;
          }
        }

        const payload = {
          department_id: deptId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: (phoneIdx >= 0 ? cells[phoneIdx]?.trim() : '') || null,
          street: street || '',
          postal_code: postalCode || '',
          city: city || '',
          country: country || 'DE',
          entry_date: new Date().toISOString().split('T')[0],
          bank_name: (bankNameIdx >= 0 ? cells[bankNameIdx]?.trim() : '') || null,
          iban: (ibanIdx >= 0 ? cells[ibanIdx]?.trim() : '') || null,
          bic: (bicIdx >= 0 ? cells[bicIdx]?.trim() : '') || null,
        };

        const { error } = await (supabase.from('employees') as any).insert(payload);
        if (error) {
          console.error('Import row error:', error, payload);
          skipped++;
        } else {
          imported++;
        }
      }

      toast.success(`Imported ${imported} employees, skipped ${skipped}`);
      fetchData();
      setShowImport(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import CSV');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Delete this employee?')) return;

    try {
      const { error } = await (supabase.from('employees') as any).delete().eq('id', id);
      if (error) throw error;
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      toast.success('Employee deleted');
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = activeDept === 'all' ||
      emp.department_id === activeDept ||
      (emp.secondary_department_ids || []).includes(activeDept);
    return matchesSearch && matchesDept;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Personal</h2>
          <p className="mt-1 text-sm text-gray-400">Manage employees, departments, and HR records.</p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 gap-3 flex-wrap">
          <button
            onClick={() => setShowAttendanceForm(true)}
            className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <ClipboardDocumentListIcon className="-ml-1 mr-2 h-5 w-5" />
            Anwesenheitsliste
          </button>
          <Link
            href="/personal/material"
            className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <WrenchScrewdriverIcon className="-ml-1 mr-2 h-5 w-5" />
            Materialliste
          </Link>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <CloudArrowUpIcon className="-ml-1 mr-2 h-5 w-5" />
            Import CSV
          </button>
          <Link
            href="/personal/new"
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Employee
          </Link>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="card bg-dark-800 border border-white/20">
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Import Employees from CSV</h3>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-400">
              Export your Google Sheet as CSV. Required columns: <strong>Vorname, Nachname, Email Adresse</strong>.<br />
              Optional: Telefon Nummer, Melde Adresse (Straße, PLZ Stadt), Welche Abteilung, Bank Name, IBAN, BIC
            </p>
            <div className="flex gap-3">
              <input
                type="file"
                accept=".csv"
                id="csv-import"
                className="hidden"
                onChange={handleImportCSV}
                disabled={importing}
              />
              <label
                htmlFor="csv-import"
                className={`flex-1 flex items-center justify-center px-4 py-3 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider cursor-pointer ${importing ? 'opacity-50' : ''}`}
              >
                <CloudArrowUpIcon className="mr-2 h-5 w-5" />
                {importing ? 'Importing...' : 'Select CSV File'}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Attendance List Modal */}
      {showAttendanceForm && (
        <div className="card bg-dark-800 border border-white/20">
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Anwesenheitsliste generieren</h3>
              <button onClick={() => setShowAttendanceForm(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Event Name</label>
                <input type="text" value={attEvent} onChange={(e) => setAttEvent(e.target.value)}
                  placeholder="z.B. Outdoor Basel"
                  className="input w-64" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Datum</label>
                <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)}
                  className="input w-40" />
              </div>
              <button
                onClick={() => {
                  const event = attEvent || 'Event';
                  const date = attDate ? new Date(attDate).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE');
                  window.open(`/api/personal/attendance/pdf?event=${encodeURIComponent(event)}&date=${encodeURIComponent(date)}`, '_blank');
                  setShowAttendanceForm(false);
                }}
                className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
              >
                <DocumentArrowDownIcon className="mr-2 h-5 w-5" />
                PDF herunterladen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
        </div>
        <input
          type="text"
          className="input block w-full pl-10"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Department Navigation */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setActiveDept('all')}
          className={`px-4 py-2 text-sm font-medium uppercase tracking-wider border transition-colors ${
            activeDept === 'all'
              ? 'border-white bg-white text-black'
              : 'border-dark-500 text-gray-400 hover:text-white hover:border-white'
          }`}
        >
          All
        </button>
        {departments.map((d) => (
          <div key={d.id} className="flex items-center">
            <button
              onClick={() => setActiveDept(d.id)}
              className={`px-4 py-2 text-sm font-medium uppercase tracking-wider border transition-colors ${
                activeDept === d.id
                  ? 'border-white bg-white text-black'
                  : 'border-dark-500 text-gray-400 hover:text-white hover:border-white'
              }`}
            >
              {d.name}
            </button>
            <button
              onClick={() => handleDeleteDepartment(d.id, d.name)}
              className="ml-1 text-gray-600 hover:text-red-400 transition-colors"
              title={`Delete ${d.name}`}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => setShowDeptForm(!showDeptForm)}
          className="inline-flex items-center px-3 py-2 border border-dark-500 text-gray-400 hover:text-white hover:border-white transition-colors text-sm font-medium uppercase tracking-wider"
        >
          <FolderIcon className="mr-1.5 h-4 w-4" />
          {showDeptForm ? 'Cancel' : 'Add Department'}
        </button>
      </div>

      {showDeptForm && (
        <form onSubmit={handleAddDepartment} className="flex items-center gap-3">
          <input
            type="text"
            className="input w-64"
            placeholder="Department name..."
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            Save
          </button>
        </form>
      )}

      {/* Employee Cards Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {searchQuery || activeDept !== 'all' ? 'No employees match your criteria.' : 'No employees yet. Create your first employee!'}
        </div>
      ) : activeDept !== 'all' || searchQuery ? (
        /* Filtered or search results — flat grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => (
            <EmployeeCard key={emp.id} emp={emp} onDelete={handleDeleteEmployee} departments={departments} />
          ))}
        </div>
      ) : (
        /* Grouped by department */
        <div className="space-y-10">
          {(() => {
            // Sort by department name, then by last name
            const sorted = [...filteredEmployees].sort((a, b) => {
              const deptA = a.department?.name || 'ZZZ';
              const deptB = b.department?.name || 'ZZZ';
              if (deptA !== deptB) return deptA.localeCompare(deptB);
              return a.last_name.localeCompare(b.last_name);
            });

            // Group
            const groups: Record<string, Employee[]> = {};
            for (const emp of sorted) {
              const deptName = emp.department?.name || 'Keine Abteilung';
              if (!groups[deptName]) groups[deptName] = [];
              groups[deptName].push(emp);
            }

            return Object.entries(groups).map(([deptName, emps]) => (
              <div key={deptName}>
                <h3 className="mb-4 text-lg font-bold uppercase tracking-wider text-[#d0ff59]">
                  {deptName}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {emps.map((emp) => (
                    <EmployeeCard key={emp.id} emp={emp} onDelete={handleDeleteEmployee} departments={departments} />
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

function EmployeeCard({ emp, onDelete, departments }: { emp: Employee; onDelete: (id: string) => void; departments: Department[] }) {
  return (
    <div className="card bg-dark-800 border-dark-500 flex flex-col">
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">
              {emp.first_name} {emp.last_name}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {emp.department?.name || 'Keine Abteilung'}
              {(emp.secondary_department_ids || []).length > 0 && (
                <span className="text-gray-500">
                  {' + '}{(emp.secondary_department_ids || [])
                    .map((id) => departments.find((d) => d.id === id)?.name)
                    .filter(Boolean)
                    .join(', ')}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => onDelete(emp.id)}
            className="text-gray-600 hover:text-red-400 transition-colors"
            title="Delete employee"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-6 py-2 space-y-3 flex-1">
        <div className="flex items-center text-sm text-gray-300">
          <EnvelopeIcon className="h-4 w-4 text-gray-500 mr-3 flex-shrink-0" />
          <span className="truncate">{emp.email}</span>
        </div>
        {emp.phone && (
          <div className="flex items-center text-sm text-gray-300">
            <PhoneIcon className="h-4 w-4 text-gray-500 mr-3 flex-shrink-0" />
            <span>{emp.phone}</span>
          </div>
        )}
        <div className="flex items-start text-sm text-gray-300">
          <MapPinIcon className="h-4 w-4 text-gray-500 mr-3 flex-shrink-0 mt-0.5" />
          <span>{emp.street}, {emp.postal_code} {emp.city}</span>
        </div>
        <div className="flex items-center text-sm text-gray-300">
          <CalendarIcon className="h-4 w-4 text-gray-500 mr-3 flex-shrink-0" />
          <span>Since {new Date(emp.entry_date).toLocaleDateString('de-DE')}</span>
        </div>
      </div>

      <div className="p-6 pt-4">
        <Link
          href={`/personal/${emp.id}`}
          className="flex items-center justify-center w-full px-4 py-3 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
        >
          View Profile
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
