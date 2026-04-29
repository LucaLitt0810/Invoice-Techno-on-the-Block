'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Material, MaterialAssignment, Employee } from '@/types';
import { PlusIcon, ArrowLeftIcon, TrashIcon, DocumentArrowDownIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function MaterialPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assignments, setAssignments] = useState<MaterialAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'assignments'>('materials');
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const supabase = createClient();

  const [matName, setMatName] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matQty, setMatQty] = useState(1);
  const [matUnit, setMatUnit] = useState('Stueck');
  const [assignMaterialId, setAssignMaterialId] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignQty, setAssignQty] = useState(1);
  const [assignNotes, setAssignNotes] = useState('');
  const [pdfEvent, setPdfEvent] = useState('');
  const [pdfDate, setPdfDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [{ data: mats }, { data: assigns }, { data: emps }] = await Promise.all([
        supabase.from('materials').select('*').order('name'),
        supabase.from('material_assignments').select('*, material:materials(*), employee:employees(*)').order('created_at', { ascending: false }),
        supabase.from('employees').select('*').order('last_name'),
      ]);
      setMaterials(mats || []);
      setAssignments(assigns || []);
      setEmployees(emps || []);
    } catch (error) {
      console.error(error);
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim()) return;
    try {
      const { data, error } = await (supabase.from('materials') as any)
        .insert({ name: matName.trim(), description: matDesc.trim() || null, quantity: matQty, unit: matUnit.trim() })
        .select().single();
      if (error) throw error;
      setMaterials((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setMatName(''); setMatDesc(''); setMatQty(1); setMatUnit('Stueck');
      setShowMaterialForm(false);
      toast.success('Material hinzugefuegt');
    } catch (error: any) {
      toast.error(error.message || 'Fehler');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Material wirklich loeschen?')) return;
    try {
      const { error } = await (supabase.from('materials') as any).delete().eq('id', id);
      if (error) throw error;
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      toast.success('Geloescht');
    } catch (error: any) {
      toast.error(error.message || 'Fehler');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignMaterialId || !assignEmployeeId) return;
    try {
      const { data, error } = await (supabase.from('material_assignments') as any)
        .insert({ material_id: assignMaterialId, employee_id: assignEmployeeId, quantity: assignQty, notes: assignNotes.trim() || null })
        .select('*, material:materials(*), employee:employees(*)').single();
      if (error) throw error;
      setAssignments((prev) => [data, ...prev]);
      setAssignMaterialId(''); setAssignEmployeeId(''); setAssignQty(1); setAssignNotes('');
      setShowAssignForm(false);
      toast.success('Ausgabe erfasst');
    } catch (error: any) {
      toast.error(error.message || 'Fehler');
    }
  };

  const handleReturn = async (id: string) => {
    try {
      const { error } = await (supabase.from('material_assignments') as any)
        .update({ returned_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setAssignments((prev) => prev.map((a) => a.id === id ? { ...a, returned_at: new Date().toISOString() } : a));
      toast.success('Rueckgabe erfasst');
    } catch (error: any) {
      toast.error(error.message || 'Fehler');
    }
  };

  const downloadMaterialList = () => {
    const event = pdfEvent || 'Event';
    const date = pdfDate ? new Date(pdfDate).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE');
    window.open(`/api/personal/material-list/pdf?event=${encodeURIComponent(event)}&date=${encodeURIComponent(date)}`, '_blank');
  };

  const openAssignments = assignments.filter((a) => !a.returned_at);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d0ff59] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/personal" className="rounded-lg bg-[#1a1a1a] p-2 text-gray-400 hover:text-white">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Materialverwaltung</h1>
            <p className="text-sm text-gray-400">Materialien erfassen, ausgeben und verfolgen</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAssignForm(true)}
            className="flex items-center gap-2 rounded-lg bg-[#d0ff59] px-4 py-2 text-sm font-medium text-black hover:opacity-90">
            <PlusIcon className="h-4 w-4" /> Ausgabe erfassen
          </button>
          <button onClick={() => setShowMaterialForm(true)}
            className="flex items-center gap-2 rounded-lg border border-[#d0ff59] px-4 py-2 text-sm font-medium text-[#d0ff59] hover:bg-[#d0ff59]/10">
            <PlusIcon className="h-4 w-4" /> Material
          </button>
        </div>
      </div>

      {/* PDF Generator */}
      <div className="rounded-xl bg-[#1a1a1a] p-4">
        <h3 className="mb-3 text-sm font-medium text-white">Materialliste generieren</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Event Name</label>
            <input type="text" value={pdfEvent} onChange={(e) => setPdfEvent(e.target.value)}
              placeholder="z.B. Outdoor Basel"
              className="w-48 rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#d0ff59] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Datum</label>
            <input type="date" value={pdfDate} onChange={(e) => setPdfDate(e.target.value)}
              className="w-40 rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#d0ff59] focus:outline-none" />
          </div>
          <button onClick={downloadMaterialList}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:opacity-90">
            <DocumentArrowDownIcon className="h-4 w-4" /> PDF herunterladen
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[#1a1a1a] p-1">
        <button onClick={() => setActiveTab('materials')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'materials' ? 'bg-[#d0ff59] text-black' : 'text-gray-400 hover:text-white'}`}>
          Materialien ({materials.length})
        </button>
        <button onClick={() => setActiveTab('assignments')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'assignments' ? 'bg-[#d0ff59] text-black' : 'text-gray-400 hover:text-white'}`}>
          Ausgaben ({openAssignments.length} offen)
        </button>
      </div>

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div className="rounded-xl border border-white/5">
          {materials.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Keine Materialien vorhanden</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs text-gray-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Beschreibung</th>
                  <th className="px-4 py-3">Bestand</th>
                  <th className="px-4 py-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id} className="border-b border-white/5 text-sm text-white hover:bg-white/5">
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-gray-400">{m.description || '-'}</td>
                    <td className="px-4 py-3">{m.quantity} {m.unit}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteMaterial(m.id)} className="text-gray-500 hover:text-red-400">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="rounded-xl border border-white/5">
          {assignments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Keine Ausgaben erfasst</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs text-gray-400">
                  <th className="px-4 py-3">Mitarbeiter</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Menge</th>
                  <th className="px-4 py-3">Ausgabe</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 text-sm text-white hover:bg-white/5">
                    <td className="px-4 py-3">{a.employee?.last_name}, {a.employee?.first_name}</td>
                    <td className="px-4 py-3">{a.material?.name}</td>
                    <td className="px-4 py-3">{a.quantity} {a.material?.unit}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(a.issued_at).toLocaleDateString('de-DE')}</td>
                    <td className="px-4 py-3">
                      {a.returned_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                          <CheckCircleIcon className="h-3 w-3" /> Zurueck
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
                          Offen
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!a.returned_at && (
                        <button onClick={() => handleReturn(a.id)}
                          className="rounded-lg bg-green-500/10 px-2 py-1 text-xs text-green-400 hover:bg-green-500/20">
                          Rueckgabe
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Material Modal */}
      {showMaterialForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-[#1a1a1a] p-6">
            <h3 className="mb-4 text-lg font-medium text-white">Material hinzufuegen</h3>
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Name</label>
                <input type="text" value={matName} onChange={(e) => setMatName(e.target.value)} required
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#d0ff59] focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Beschreibung</label>
                <input type="text" value={matDesc} onChange={(e) => setMatDesc(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#d0ff59] focus:outline-none" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm text-gray-400">Bestand</label>
                  <input type="number" min={0} value={matQty} onChange={(e) => setMatQty(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#d0ff59] focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm text-gray-400">Einheit</label>
                  <input type="text" value={matUnit} onChange={(e) => setMatUnit(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#d0ff59] focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowMaterialForm(false)}
                  className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white">Abbrechen</button>
                <button type="submit"
                  className="rounded-lg bg-[#d0ff59] px-4 py-2 text-sm font-medium text-black hover:opacity-90">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Material Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-[#1a1a1a] p-6">
            <h3 className="mb-4 text-lg font-medium text-white">Material ausgeben</h3>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Material</label>
                <select value={assignMaterialId} onChange={(e) => setAssignMaterialId(e.target.value)} required
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#d0ff59] focus:outline-none">
                  <option value="">Bitte waehlen</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.quantity} {m.unit})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Mitarbeiter</label>
                <select value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)} required
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#d0ff59] focus:outline-none">
                  <option value="">Bitte waehlen</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.last_name}, {e.first_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Menge</label>
                <input type="number" min={1} value={assignQty} onChange={(e) => setAssignQty(parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#d0ff59] focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Notizen</label>
                <input type="text" value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#d0ff59] focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAssignForm(false)}
                  className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white">Abbrechen</button>
                <button type="submit"
                  className="rounded-lg bg-[#d0ff59] px-4 py-2 text-sm font-medium text-black hover:opacity-90">Ausgeben</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
