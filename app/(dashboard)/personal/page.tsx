'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Employee, Department } from '@/types';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon, FolderIcon } from '@heroicons/react/24/outline';

export default function PersonalPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDept, setActiveDept] = useState<string>('all');
  const [newDeptName, setNewDeptName] = useState('');
  const [showDeptForm, setShowDeptForm] = useState(false);
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
    if (!confirm(`Delete department "${name}"? Employees in this department will be unassigned.`)) return;

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const { error } = await (supabase.from('employees') as any).delete().eq('id', id);
      if (error) throw error;

      setEmployees((prev) => prev.filter((e) => e.id !== id));
      toast.success('Employee deleted successfully');
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
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Personal</h2>
          <p className="mt-1 text-sm text-gray-400">Manage employees, departments, and HR records.</p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/personal/new"
            className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Employee
          </Link>
        </div>
      </div>

      {/* Departments */}
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

      {/* Search */}
      <div className="relative">
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

      {/* Employees Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-dark-500">
              <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
              <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Department</th>
              <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
              <th className="table-cell text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Entry Date</th>
              <th className="table-cell text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-cell text-center text-gray-500 py-8">
                  {searchQuery || activeDept !== 'all' ? 'No employees match your criteria.' : 'No employees yet. Create your first employee!'}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-dark-500 hover:bg-dark-800/50">
                  <td className="table-cell">
                    <Link href={`/personal/${emp.id}`} className="text-white font-medium hover:underline">
                      {emp.first_name} {emp.last_name}
                    </Link>
                  </td>
                  <td className="table-cell text-gray-400">{emp.department?.name || '-'}</td>
                  <td className="table-cell text-gray-400">{emp.email}</td>
                  <td className="table-cell text-gray-400">
                    {new Date(emp.entry_date).toLocaleDateString('de-DE')}
                  </td>
                  <td className="table-cell text-right">
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete employee"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
