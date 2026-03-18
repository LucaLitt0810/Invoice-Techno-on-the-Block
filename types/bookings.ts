export type BookingStatus = 'request' | 'negotiation' | 'confirmed' | 'paid' | 'cancelled';
export type UnavailabilityType = 'vacation' | 'sick' | 'personal' | 'other';
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface DJ {
  id: string;
  dj_code: string;
  name: string;
  email: string | null;
  phone: string | null;
  genre: string | null;
  bio: string | null;
  user_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  dj_id: string;
  dj?: DJ;
  event_name: string;
  start_date: string;
  end_date: string;
  location: string | null;
  client_name: string | null;
  fee: number;
  provision: number;
  status: BookingStatus;
  notes: string | null;
  user_id: string | null;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  recurrence_end_date: string | null;
  parent_booking_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DJUnavailability {
  id: string;
  dj_id: string;
  dj?: DJ;
  start_date: string;
  end_date: string;
  reason: string | null;
  type: UnavailabilityType;
  created_at: string;
  updated_at: string;
}

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  request: '#eab308',    // yellow-500
  negotiation: '#f97316', // orange-500
  confirmed: '#22c55e',   // green-500
  paid: '#3b82f6',        // blue-500
  cancelled: '#ef4444',   // red-500
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  request: 'Request',
  negotiation: 'Negotiation',
  confirmed: 'Confirmed',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export const BOOKING_STATUS_OPTIONS = [
  { value: 'request', label: 'Request', color: 'yellow' },
  { value: 'negotiation', label: 'Negotiation', color: 'orange' },
  { value: 'confirmed', label: 'Confirmed', color: 'green' },
  { value: 'paid', label: 'Paid', color: 'blue' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
] as const;
