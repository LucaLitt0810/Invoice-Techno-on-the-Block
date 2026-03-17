export type ContractType = 'booking_offer' | 'booking_confirmation' | 'booking_rejection' | 'custom';
export type ContractStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface Contract {
  id: string;
  company_id: string;
  customer_id: string;
  contract_number: string;
  contract_type: ContractType;
  title: string;
  event_date: string | null;
  event_location: string | null;
  event_description: string | null;
  fee: number;
  deposit: number;
  currency: string;
  deposit_due: string | null;
  final_payment_due: string | null;
  cancellation_terms: string | null;
  technical_requirements: string | null;
  status: ContractStatus;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company?: {
    name: string;
    street: string;
    postal_code: string;
    city: string;
    email: string;
    phone: string | null;
  };
  customer?: {
    company_name: string;
    contact_person: string | null;
    street: string;
    postal_code: string;
    city: string;
    email: string;
  };
}

export const CONTRACT_TYPES = [
  { value: 'booking_offer', label: 'Booking Offer (Angebot)', color: 'blue' },
  { value: 'booking_confirmation', label: 'Booking Confirmation (Bestätigung)', color: 'green' },
  { value: 'booking_rejection', label: 'Booking Rejection (Absage)', color: 'red' },
  { value: 'custom', label: 'Custom Contract (Individuell)', color: 'gray' },
] as const;

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
};

// Default templates for DJ bookings
export const DJ_BOOKING_TEMPLATES = {
  offer: {
    title: 'DJ Booking Offer',
    cancellation_terms: 'Cancellation by client: Up to 30 days before event: 50% of fee due. Less than 30 days: 100% of fee due.',
    technical_requirements: '• Professional DJ setup with 2x CDJ-3000 and DJM-900NXS2\n• Minimum 2x15" speakers (active)\n• Power supply: 230V, min. 16A\n• DJ booth/table (min. 2m width)\n• Load-in access 2 hours before event',
    notes: 'We are pleased to offer our DJ services for your event. This offer is valid for 14 days.',
  },
  confirmation: {
    title: 'DJ Booking Confirmation',
    cancellation_terms: 'Both parties have agreed to the terms. Cancellation policy as stated in the original offer.',
    technical_requirements: '• Professional DJ setup with 2x CDJ-3000 and DJM-900NXS2\n• Minimum 2x15" speakers (active)\n• Power supply: 230V, min. 16A\n• DJ booth/table (min. 2m width)\n• Load-in access 2 hours before event',
    notes: 'Thank you for booking our DJ services. We look forward to making your event unforgettable!',
  },
  rejection: {
    title: 'DJ Booking - Alternative Date/Information',
    cancellation_terms: '',
    technical_requirements: '',
    notes: 'Unfortunately, we are already booked for your requested date. However, we would like to offer the following alternatives or refer you to one of our partner DJs.',
  },
};
