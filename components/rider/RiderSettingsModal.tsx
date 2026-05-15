'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DJRiderTemplateSection, Customer } from '@/types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface RiderSettingsModalProps {
  riderId: string;
  orderId: string;
  sections: DJRiderTemplateSection[];
  disabledSectionIds: string[];
  onClose: () => void;
  onUpdate: () => void;
}

export default function RiderSettingsModal({
  riderId,
  orderId,
  sections,
  disabledSectionIds,
  onClose,
  onUpdate,
}: RiderSettingsModalProps) {
  const supabase = createClient() as any;
  const [activeTab, setActiveTab] = useState<'sections' | 'customers'>('sections');
  const [localDisabledIds, setLocalDisabledIds] = useState<string[]>(disabledSectionIds);
  const [saving, setSaving] = useState(false);

  // Customer access state
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

  const handleToggleSection = (sectionId: string) => {
    setLocalDisabledIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleSaveSections = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('dj_riders')
        .update({ disabled_section_ids: localDisabledIds })
        .eq('id', riderId);

      if (error) throw error;
      toast.success('Settings saved');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

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

  // Available customers (not yet granted)
  const grantedCustomerIds = new Set(customerAccess.map((a) => a.customer_id));
  const availableCustomers = customers.filter((c) => !grantedCustomerIds.has(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl bg-dark-800 border border-white/10 overflow-hidden">
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
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {activeTab === 'sections' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Select which sections should be visible in this rider.
              </p>
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
                        className="h-4 w-4 rounded border-gray-600 bg-dark-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-white">{section.name}</span>
                    </label>
                  );
                })}
              </div>
              <button
                onClick={handleSaveSections}
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Section Settings'}
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
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
                          <p className="text-sm text-white">
                            {access.customer?.company_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">{access.customer?.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveAccess(access.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
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
