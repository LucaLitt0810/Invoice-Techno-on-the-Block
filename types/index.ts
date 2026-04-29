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
  created_at: string;
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

  created_at: string;
  updated_at: string;
  customer?: Customer;
  company?: Company;
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
  customer_id: string | null;
  created_at: string;
  updated_at: string;
  user?: { email: string; raw_user_meta_data?: { full_name?: string } };
  customer?: Customer;
};
