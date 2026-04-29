'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Employee, Department } from '@/types';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon, FolderIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, CalendarIcon, ArrowRightIcon, CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

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

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
      const getIdx = (name: string) => headers.indexOf(name);

      const rows = lines.slice(1).map((line) => {
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
        return cells;
      });

      const firstNameIdx = getIdx('first_name');
      const lastNameIdx = getIdx('last_name');
      const emailIdx = getIdx('email');
      const phoneIdx = getIdx('phone');
      const streetIdx = getIdx('street');
      const postalCodeIdx = getIdx('postal_code');
      const cityIdx = getIdx('city');
      const countryIdx = getIdx('country');
      const entryDateIdx = getIdx('entry_date');
      const deptIdx = getIdx('department');

      if (firstNameIdx === -1 || lastNameIdx === -1 || emailIdx === -1) {
        toast.error('CSV must have at least: first_name, last_name, email columns');
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
        const firstName = cells[firstNameIdx]?.replace(/^"|"$/g, '');
        const lastName = cells[lastNameIdx]?.replace(/^"|"$/g, '');
        const email = cells[emailIdx]?.replace(/^"|"$/g, '');
        if (!firstName || !lastName || !email) {
          skipped++;
          continue;
        }

        // Handle department
        let deptId: string | null = null;
        const deptName = deptIdx >= 0 ? cells[deptIdx]?.replace(/^"|"$/g, '') : null;
        if (deptName) {
          const key = deptName.toLowerCase();
          if (deptMap.has(key)) {
            deptId = deptMap.get(key)!;
          } else {
            // Create department
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

        const entryDateRaw = entryDateIdx >= 0 ? cells[entryDateIdx]?.replace(/^"|"$/g, '') : '';
        let entryDate = entryDateRaw;
        if (entryDate) {
          // Try to parse various date formats
          const d = new Date(entryDate);
          if (!isNaN(d.getTime())) {
            entryDate = d.toISOString().split('T')[0];
          } else {
            entryDate = new Date().toISOString().split('T')[0];
          }
        } else {
          entryDate = new Date().toISOString().split('T')[0];
        }

        const payload = {
          department_id: deptId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone: (phoneIdx >= 0 ? cells[phoneIdx]?.replace(/^"|"$/g, '') : '') || null,
          street: (streetIdx >= 0 ? cells[streetIdx]?.replace(/^"|"$/g, '') : '') || '',
          postal_code: (postalCodeIdx >= 0 ? cells[postalCodeIdx]?.replace(/^"|"$/g, '') : '') || '',
          city: (cityIdx >= 0 ? cells[cityIdx]?.replace(/^"|"$/g, '') : '') || '',
          country: (countryIdx >= 0 ? cells[countryIdx]?.replace(/^"|"$/g, '') : '') || 'DE',
          entry_date: entryDate,
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
    const matchesDept = activeDept === 'all' || emp.department_id === activeDept;
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
        <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
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
              Export your Google Sheet as CSV. Required columns: <strong>first_name, last_name, email</strong>.<br />
              Optional: phone, street, postal_code, city, country, entry_date, department
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => (
            <div key={emp.id} className="card bg-dark-800 border-dark-500 flex flex-col">
              {/* Card Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {emp.first_name} {emp.last_name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{emp.department?.name || 'No Department'}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                    title="Delete employee"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
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

              {/* Card Footer */}
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
          ))}
        </div>
      )}
    </div>
  );
}
