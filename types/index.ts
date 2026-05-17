export type Company = {
  id: string;
  user_id: string;
  name: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  email: string;
  phone: string | null;
  tax_number: string | null;
  vat_id: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  logo_url: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  company_id?: string | null;
  company_name: string;
  contact_person: string | null;
  email: string;
  phone: string | null;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  customer_number: string;
  bank_name?: string | null;
  iban?: string | null;
  bic?: string | null;
  auth_user_id?: string | null;
  onboarding_complete?: boolean;
  created_at: string;
};

export type EmailTeamMember = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type OrderStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export const ORDER_STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'yellow' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
] as const;

export type Order = {
  id: string;
  user_id: string;
  user_email: string | null;
  customer_id: string | null;
  customer?: Customer;
  dj_id: string | null;
  dj?: { id: string; name: string };
  title: string;
  description: string | null;
  status: OrderStatus;
  total_budget: number | null;
  dj_rider_filled: boolean;
  created_at: string;
  updated_at: string;
};

export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export const OFFER_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'accepted', label: 'Accepted', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
] as const;

export type Offer = {
  id: string;
  order_id: string;
  title: string;
  description: string | null;
  amount: number;
  status: OfferStatus;
  valid_until: string | null;
  file_data: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  company_id?: string | null;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  created_at: string;
};

export const PRODUCT_UNITS = [
  { value: 'piece', label: 'Piece (Stück)' },
  { value: 'minutes', label: 'Minutes (Minuten)' },
  { value: 'hour', label: 'Hour (Stunde)' },
  { value: 'day', label: 'Day (Tag)' },
  { value: 'week', label: 'Week (Woche)' },
  { value: 'month', label: 'Month (Monat)' },
  { value: 'year', label: 'Year (Jahr)' },
  { value: 'km', label: 'Kilometer (km)' },
  { value: 'm', label: 'Meter (m)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'service', label: 'Service' },
] as const;

export type InvoiceStatus = 'created' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export const CURRENCIES = [
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'CHF', label: 'CHF (Fr)', symbol: 'Fr' },
] as const;

export type Invoice = {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  service_date: string | null;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  tax_rate: number;
  total: number;
  currency: string;
  notes: string | null;
  terms: string | null;
  ahv_waiver: boolean | null;
  dj_id: string | null;

  created_at: string;
  updated_at: string;
  customer?: Customer;
  company?: Company;
  dj?: { id: string; name: string } | null;
  items?: InvoiceItem[];
  payments?: Payment[];
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
  unit: string | null;
  service_date: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;

  created_at: string;
};

export type TaxType = 'vat_19' | 'vat_7' | 'reverse_charge' | 'no_vat';

export const TAX_OPTIONS: { value: TaxType; label: string; rate: number }[] = [
  { value: 'vat_19', label: '19% VAT', rate: 19 },
  { value: 'vat_7', label: '7% VAT', rate: 7 },
  { value: 'reverse_charge', label: 'Reverse Charge (0%)', rate: 0 },
  { value: 'no_vat', label: 'No VAT (Small Business)', rate: 0 },
];

export type InvoiceFormData = {
  customer_id: string;
  invoice_date: string;
  service_date: string;
  due_date: string;
  tax_type: TaxType;
  currency: 'EUR' | 'CHF';
  notes: string;
  terms: string;
  items: {
    description: string;
    quantity: number;
    price: number;
  }[];
};

export type DashboardStats = {
  revenueThisMonth: number;
  revenueThisYear: number;
  openInvoices: number;
  openInvoicesAmount: number;
  overdueInvoices: number;
  overdueInvoicesAmount: number;
  paidInvoicesThisMonth: number;
  monthlyRevenue: { month: string; revenue: number }[];
};

export type ExportFormat = 'csv' | 'datev';

export type EmailTemplate = {
  subject: string;
  body: string;
};

export type Department = {
  id: string;
  name: string;
  created_at: string;
};

export type EmployeeEntryType = 'positive' | 'negative' | 'warning' | 'training' | 'termination' | 'entry' | 'contract';

export const ENTRY_TYPE_OPTIONS = [
  { value: 'positive' as EmployeeEntryType, label: 'Positiver Eintrag', color: 'green' },
  { value: 'negative' as EmployeeEntryType, label: 'Negativer Eintrag', color: 'red' },
  { value: 'warning' as EmployeeEntryType, label: 'Abmahnung', color: 'orange' },
  { value: 'training' as EmployeeEntryType, label: 'Schulung', color: 'blue' },
  { value: 'termination' as EmployeeEntryType, label: 'Kündigung', color: 'purple' },
  { value: 'contract' as EmployeeEntryType, label: 'Vertrag', color: 'indigo' },
];

export type Employee = {
  id: string;
  department_id: string | null;
  secondary_department_ids: string[] | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  entry_date: string;
  nda_link: string | null;
  nda_pdf: string | null;
  job_desc_link: string | null;
  job_desc_pdf: string | null;
  data_storage_link: string | null;
  data_storage_pdf: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  signature_verein: string | null;
  signature_vertragsnehmer: string | null;
  signature_ort: string | null;
  signature_datum: string | null;
  consent_signature_verein: string | null;
  consent_signature_vertragsnehmer: string | null;
  consent_signature_ort: string | null;
  consent_signature_datum: string | null;
  created_at: string;
  updated_at: string;
  department?: Department;
};

export type EmployeeEntry = {
  id: string;
  employee_id: string;
  type: EmployeeEntryType;
  title: string;
  description: string | null;
  entry_date: string;
  created_by: string | null;
  created_at: string;
  user?: { email: string };
};

export type Material = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  created_at: string;
};

export type MaterialAssignment = {
  id: string;
  material_id: string;
  employee_id: string;
  quantity: number;
  issued_at: string;
  returned_at: string | null;
  issue_signature: string | null;
  return_signature: string | null;
  notes: string | null;
  created_at: string;
  material?: Material;
  employee?: Employee;
};

export type MeetingStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export const MEETING_STATUS_OPTIONS = [
  { value: 'planned' as MeetingStatus, label: 'Geplant', color: 'blue' },
  { value: 'in_progress' as MeetingStatus, label: 'Laufend', color: 'yellow' },
  { value: 'completed' as MeetingStatus, label: 'Abgeschlossen', color: 'green' },
  { value: 'cancelled' as MeetingStatus, label: 'Abgesagt', color: 'red' },
];

export type Meeting = {
  id: string;
  title: string;
  meeting_date: string;
  location: string | null;
  attendees: string | null;
  agenda: string | null;
  notes: string | null;
  decisions: string | null;
  action_items: string | null;
  protocol: string | null;
  status: MeetingStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  user?: { email: string };
};

export type AgencyStatus = 'contacted' | 'negotiation' | 'closed';

export const AGENCY_STATUS_OPTIONS = [
  { value: 'contacted' as AgencyStatus, label: 'Angeschrieben', color: 'blue' },
  { value: 'negotiation' as AgencyStatus, label: 'Verhandlungsphase', color: 'yellow' },
  { value: 'closed' as AgencyStatus, label: 'Abgeschlossen', color: 'green' },
];

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  created_at: string;
};

export type Receipt = {
  id: string;
  file_data: string | null;
  file_name: string | null;
  extracted_date: string | null;
  extracted_amount: number | null;
  extracted_vendor: string | null;
  manual_date: string | null;
  manual_amount: number | null;
  manual_vendor: string | null;
  notes: string | null;
  status: 'unprocessed' | 'reviewed' | 'assigned';
  transaction_id: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  date: string;
  amount: number;
  description: string | null;
  category_id: string | null;
  receipt_id: string | null;
  invoice_id: string | null;
  status: 'open' | 'assigned' | 'completed';
  created_at: string;
  category?: Category;
  receipt?: Receipt;
  invoice?: Invoice;
};

export type { Contract } from './contracts';

export type AgencyLead = {
  id: string;
  user_id: string;
  user_email: string | null;
  company_name: string;
  contact_person: string | null;
  email: string;
  phone: string | null;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  status: AgencyStatus;
  notes: string | null;
  website: string | null;
  instagram: string | null;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
  user?: { email: string; raw_user_meta_data?: { full_name?: string } };
  customer?: Customer;
};

// ============================================================
// DJ-Rider / Advancing-System Types
// ============================================================

export type DJRiderTemplate = {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type DJRiderTemplateSection = {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type DJRiderTemplateField = {
  id: string;
  section_id: string;
  label: string;
  field_type: 'text' | 'textarea' | 'number' | 'time' | 'datetime' | 'date' | 'url' | 'select' | 'boolean';
  placeholder: string | null;
  required: boolean;
  sort_order: number;
  options: Record<string, unknown> | null;
  created_at: string;
};

export type DJRiderStatus = 'draft' | 'active' | 'archived';

export type DJRider = {
  id: string;
  order_id: string;
  template_id: string;
  status: DJRiderStatus;
  disabled_section_ids: string[];
  field_assignments: Record<string, string>;
  created_at: string;
  updated_at: string;
  template?: DJRiderTemplate;
  order?: Order;
};

export type DJRiderValue = {
  id: string;
  rider_id: string;
  field_id: string;
  value: string | null;
  confirmed_by_agency: boolean;
  confirmed_by_customer: boolean;
  last_modified_by: string | null;
  last_modified_at: string;
  created_at: string;
  field?: DJRiderTemplateField;
};

export type DJRiderChangelogStatus = 'pending' | 'confirmed' | 'modified_after_confirmation';

export type DJRiderChangelog = {
  id: string;
  rider_id: string;
  field_id: string | null;
  changed_by: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  updated_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  status: DJRiderChangelogStatus;
  field?: DJRiderTemplateField;
  changed_by_user?: { email: string; user_metadata?: { full_name?: string } };
  confirmed_by_user?: { email: string; user_metadata?: { full_name?: string } };
};

export type DJRiderMessage = {
  id: string;
  rider_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  user?: { email: string; user_metadata?: { full_name?: string } };
};

export type OrderCustomerAccess = {
  id: string;
  order_id: string;
  customer_id: string;
  can_view_rider: boolean;
  created_at: string;
  customer?: Customer;
  order?: Order;
};

// Erweiterte Customer-Typen (DB-Migration 039)
export type CustomerWithAuth = Customer & {
  auth_user_id: string | null;
  onboarding_complete: boolean;
};
