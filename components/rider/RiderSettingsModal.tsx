'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DJRiderTemplateSection, DJRiderTemplateField, Customer } from '@/types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface RiderSettingsModalProps {
  riderId: string;
  orderId: string;
  sections: DJRiderTemplateSection[];
  fields: DJRiderTemplateField[];
  disabledSectionIds: string[];
  fieldAssignments: Record<string, string>;
  onClose: () => void;
  onUpdate: () => void;
}

export default function RiderSettingsModal({
  riderId,
  orderId,
  sections,
  fields,
  disabledSectionIds,
  fieldAssignments,
  onClose,
  onUpdate,
}: RiderSettingsModalProps) {
  const supabase = createClient() as any;
  const [activeTab, setActiveTab] = useState<'sections' | 'fields' | 'customers'>('sections');

  // Sections
  const [localDisabledIds, setLocalDisabledIds] = useState<string[]>(disabledSectionIds);
  const [savingSections, setSavingSections] = useState(false);

  // Fields
  const [localAssignments, setLocalAssignments] = useState<Record<string, string>>(fieldAssignments);
  const [savingFields, setSavingFields] = useState(false);

  // Customers
  const [customerAccess, setCustomerAccess] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  useEffect(() => {
    fetchCustomerAccess();
    fetchCustomers();
  }, []);

  const fetchCustomerAccess = async () => {
    const { data } = await supabase
      .from('order_customer_access')
      .select('*, customer:customers(*)')
      .eq('order_id', orderId);
    setCustomerAccess(data || []);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('company_name');
    setCustomers(data || []);
  };

  // Sections handlers
  const handleToggleSection = (sectionId: string) => {
    setLocalDisabledIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleSaveSections = async () => {
    setSavingSections(true);
    try {
      const { error } = await supabase
        .from('dj_riders')
        .update({ disabled_section_ids: localDisabledIds })
        .eq('id', riderId);
      if (error) throw error;
      toast.success('Sections saved');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSavingSections(false);
    }
  };

  // Fields handlers
  const handleAssignmentChange = (fieldId: string, role: string) => {
    setLocalAssignments((prev) => ({
      ...prev,
      [fieldId]: role,
    }));
  };

  const handleSaveFields = async () => {
    setSavingFields(true);
    try {
      const { error } = await supabase
        .from('dj_riders')
        .update({ field_assignments: localAssignments })
        .eq('id', riderId);
      if (error) throw error;
      toast.success('Field permissions saved');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSavingFields(false);
    }
  };

  // Customer handlers
  const handleAddCustomerAccess = async () => {
    if (!selectedCustomerId) return;
    try {
      const { error } = await supabase.from('order_customer_access').upsert(
        {
          order_id: orderId,
          customer_id: selectedCustomerId,
          can_view_rider: true,
        },
        { onConflict: 'order_id,customer_id' }
      );
      if (error) throw error;
      toast.success('Customer access granted');
      setSelectedCustomerId('');
      fetchCustomerAccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to grant access');
    }
  };

  const handleRemoveAccess = async (accessId: string) => {
    try {
      const { error } = await supabase.from('order_customer_access').delete().eq('id', accessId);
      if (error) throw error;
      toast.success('Access removed');
      fetchCustomerAccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove access');
    }
  };

  const grantedCustomerIds = new Set(customerAccess.map((a) => a.customer_id));
  const availableCustomers = customers.filter((c) => !grantedCustomerIds.has(c.id));

  const fieldsBySection = sections.reduce<Record<string, DJRiderTemplateField[]>>((acc, section) => {
    acc[section.id] = fields
      .filter((f) => f.section_id === section.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-dark-800 border border-white/10 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">Rider Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-500">
          {[
            { key: 'sections', label: 'Sections' },
            { key: 'fields', label: 'Field Permissions' },
            { key: 'customers', label: 'Customer Access' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === tab.key
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'sections' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Select which sections should be visible in this rider.</p>
              <div className="space-y-2">
                {sections.map((section) => {
                  const isEnabled = !localDisabledIds.includes(section.id);
                  return (
                    <label
                      key={section.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-dark-900 border border-dark-500 cursor-pointer hover:border-white/20 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggleSection(section.id)}
                        className="h-4 w-4 rounded border-gray-600 bg-dark-900 text-blue-600"
                      />
                      <span className="text-sm text-white">{section.name}</span>
                    </label>
                  );
                })}
              </div>
              <button
                onClick={handleSaveSections}
                disabled={savingSections}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {savingSections ? 'Saving...' : 'Save Sections'}
              </button>
            </div>
          )}

          {activeTab === 'fields' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-400">
                Define who can edit each field. "Both" allows agency and customer.
              </p>
              {sections.map((section) => {
                const sectionFields = fieldsBySection[section.id] || [];
                if (sectionFields.length === 0) return null;
                return (
                  <div key={section.id}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {section.name}
                    </h4>
                    <div className="space-y-2">
                      {sectionFields.map((field) => {
                        const current = localAssignments[field.id] || 'both';
                        return (
                          <div
                            key={field.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-dark-900 border border-dark-500"
                          >
                            <span className="text-sm text-white">{field.label}</span>
                            <div className="flex gap-1">
                              {[
                                { key: 'agency', label: 'Agency' },
                                { key: 'customer', label: 'Customer' },
                                { key: 'both', label: 'Both' },
                              ].map((opt) => (
                                <button
                                  key={opt.key}
                                  onClick={() => handleAssignmentChange(field.id, opt.key)}
                                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                    current === opt.key
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-dark-800 text-gray-400 hover:text-white'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <button
                onClick={handleSaveFields}
                disabled={savingFields}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {savingFields ? 'Saving...' : 'Save Field Permissions'}
              </button>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Grant customer access to this rider</p>
                <div className="flex gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="flex-1 bg-dark-900 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select customer...</option>
                    {availableCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name} ({c.email})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddCustomerAccess}
                    disabled={!selectedCustomerId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
                  >
                    Grant
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-2">Active access</p>
                {customerAccess.length === 0 ? (
                  <p className="text-sm text-gray-600">No customers have access yet.</p>
                ) : (
                  <div className="space-y-2">
                    {customerAccess.map((access: any) => (
                      <div
                        key={access.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-dark-900 border border-dark-500"
                      >
                        <div>
                          <p className="text-sm text-white">{access.customer?.company_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{access.customer?.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveAccess(access.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
