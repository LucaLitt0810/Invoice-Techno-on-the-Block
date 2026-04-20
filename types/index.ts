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
