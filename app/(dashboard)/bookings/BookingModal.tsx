'use client';

import { useState, useEffect } from 'react';
import { Booking, DJ, BOOKING_STATUS_OPTIONS, RecurrencePattern } from '@/types/bookings';
import { Customer } from '@/types';
import { formatDateInput, formatDateTimeInput } from '@/lib/utils/helpers';
import toast from 'react-hot-toast';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

interface BookingModalProps {
  booking: Booking | null;
  initialDate: Date | null;
  djs: DJ[];
  userRole: string;
  currentDJId?: string;
  prefillCustomerId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function BookingModal({ booking, initialDate, djs, userRole, currentDJId, prefillCustomerId, onClose, onSaved }: BookingModalProps) {
  const [formData, setFormData] = useState({
    dj_id: '',
    event_name: '',
    start_date: '',
    end_date: '',
    location: '',
    client_name: '',
    customer_id: '',
    fee: 0,
    provision: 0,
    status: 'request' as const,
    notes: '',
    is_recurring: false,
    recurrence_pattern: '' as RecurrencePattern | '',
    recurrence_end_date: '',
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  // Set DJ automatically for DJs when modal opens
  useEffect(() => {
    if (userRole === 'dj' && currentDJId && !booking) {
      setFormData(prev => ({ ...prev, dj_id: currentDJId }));
    }
  }, [userRole, currentDJId, booking]);

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('company_name', { ascending: true });
      if (error) {
        console.error('Error fetching customers:', error);
      } else {
        setCustomers(data || []);
      }
    };
    fetchCustomers();
  }, [supabase]);

  useEffect(() => {
    if (booking) {
      setFormData({
        dj_id: booking.dj_id,
        event_name: booking.event_name,
        start_date: formatDateTimeInput(new Date(booking.start_date)),
        end_date: formatDateTimeInput(new Date(booking.end_date)),
        location: booking.location || '',
        client_name: booking.client_name || '',
        customer_id: booking.customer_id || '',
        fee: booking.fee,
        provision: booking.provision || 0,
        status: booking.status,
        notes: booking.notes || '',
        is_recurring: booking.is_recurring,
        recurrence_pattern: booking.recurrence_pattern || '',
        recurrence_end_date: booking.recurrence_end_date 
          ? formatDateInput(new Date(booking.recurrence_end_date)) 
          : '',
      });
    } else if (initialDate) {
      const start = new Date(initialDate);
      const end = new Date(start.getTime() + 4 * 60 * 60 * 1000); // Default 4 hours
      setFormData(prev => ({
        ...prev,
        dj_id: userRole === 'dj' && currentDJId ? currentDJId : '',
        start_date: formatDateTimeInput(start),
        end_date: formatDateTimeInput(end),
        customer_id: prefillCustomerId || '',
      }));
    }
  }, [booking, initialDate, userRole, currentDJId, prefillCustomerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dj_id || !formData.event_name || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    
    try {
      const url = booking ? `/api/bookings/${booking.id}` : '/api/bookings';
      const method = booking ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fee: parseFloat(formData.fee.toString()) || 0,
          recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
          recurrence_end_date: formData.is_recurring ? formData.recurrence_end_date : null,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save booking');
      }
      
      toast.success(booking ? 'Booking updated successfully' : 'Booking created successfully');
      onSaved();
    } catch (error: any) {
      console.error('Error saving booking:', error);
      toast.error(error.message || 'Failed to save booking');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!booking) return;
    if (!confirm('Are you sure you want to delete this booking?')) return;
    
    setDeleting(true);
    
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete booking');
      
      toast.success('Booking deleted successfully');
      onSaved();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-dark-800 border border-dark-500 max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-medium text-white uppercase tracking-wider">
              {booking ? 'Edit Booking' : userRole === 'dj' ? 'New Booking for Me' : 'New Booking'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* DJ Selection - Hidden for DJs, they can only book themselves */}
            {userRole === 'dj' ? (
              <div>
                <label className="label">DJ</label>
                <input
                  type="text"
                  className="input bg-dark-800 border-dark-500 text-gray-400 w-full cursor-not-allowed"
                  value={djs.find(d => d.id === currentDJId)?.name || 'Myself'}
                  disabled
                  readOnly
                />
                <input type="hidden" value={formData.dj_id} />
              </div>
            ) : (
              <div>
                <label className="label">DJ *</label>
                <select
                  className="input bg-dark-800 border-dark-500 text-white w-full"
                  value={formData.dj_id}
                  onChange={(e) => setFormData({ ...formData, dj_id: e.target.value })}
                  required
                >
                  <option value="">Select DJ...</option>
                  {djs.map((dj) => (
                    <option key={dj.id} value={dj.id}>
                      {dj.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Event Name */}
            <div>
              <label className="label">Event Name *</label>
              <input
                type="text"
                className="input bg-dark-800 border-dark-500 text-white w-full"
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                placeholder="e.g., Wedding Party"
                required
              />
            </div>

            {/* Date/Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="label">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  className="input bg-dark-800 border-dark-500 text-white w-full"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">End Date & Time *</label>
                <input
                  type="datetime-local"
                  className="input bg-dark-800 border-dark-500 text-white w-full"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Location & Customer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="label">Location</label>
                <input
                  type="text"
                  className="input bg-dark-800 border-dark-500 text-white w-full"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Venue address"
                />
              </div>
              <div>
                <label className="label">Customer</label>
                <select
                  className="input bg-dark-800 border-dark-500 text-white w-full"
                  value={formData.customer_id}
                  onChange={(e) => {
                    const customerId = e.target.value;
                    const selectedCustomer = customers.find(c => c.id === customerId);
                    setFormData({
                      ...formData,
                      customer_id: customerId,
                      client_name: selectedCustomer ? selectedCustomer.company_name : formData.client_name,
                    });
                  }}
                >
                  <option value="">Select Customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Client Name */}
            <div>
              <label className="label">Client Name</label>
              <input
                type="text"
                className="input bg-dark-800 border-dark-500 text-white w-full"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Client name"
              />
            </div>

            {/* Fee, Provision & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="label">Fee (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input bg-dark-800 border-dark-500 text-white w-full"
                  value={formData.fee === 0 ? '' : formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="label">Provision (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="input bg-dark-800 border-dark-500 text-white w-full"
                  value={formData.provision === 0 ? '' : formData.provision}
                  onChange={(e) => setFormData({ ...formData, provision: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Status *</label>
                <select
                  className="input bg-dark-800 border-dark-500 text-white w-full"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  required
                >
                  {BOOKING_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recurring Event - Only for new bookings */}
            {!booking && (
              <div className="border border-dark-500 rounded p-4 space-y-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    className="h-4 w-4 bg-dark-800 border-dark-500 rounded"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  />
                  <label htmlFor="is_recurring" className="ml-2 text-sm text-white font-medium">
                    Recurring Event
                  </label>
                </div>
                
                {formData.is_recurring && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pl-6">
                    <div>
                      <label className="label">Repeat Pattern *</label>
                      <select
                        className="input bg-dark-800 border-dark-500 text-white w-full"
                        value={formData.recurrence_pattern}
                        onChange={(e) => setFormData({ ...formData, recurrence_pattern: e.target.value as RecurrencePattern })}
                        required={formData.is_recurring}
                      >
                        <option value="">Select pattern...</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">End Date *</label>
                      <input
                        type="date"
                        className="input bg-dark-800 border-dark-500 text-white w-full"
                        value={formData.recurrence_end_date}
                        onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                        required={formData.is_recurring}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input bg-dark-800 border-dark-500 text-white w-full"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4">
              {booking ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
                >
                  <TrashIcon className="-ml-1 mr-2 h-5 w-5" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center px-4 py-2 border border-white/30 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-colors text-sm font-medium uppercase tracking-wider disabled:opacity-50"
                >
                  {saving ? 'Saving...' : booking ? 'Update Booking' : 'Create Booking'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
