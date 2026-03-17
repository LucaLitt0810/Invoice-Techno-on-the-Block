import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Convert array of objects to CSV
function convertToCSV(data: any[], headers: { key: string; label: string }[]) {
  const csvHeaders = headers.map((h) => h.label).join(',');
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header.key];
        // Escape values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      })
      .join(',');
  });
  return [csvHeaders, ...csvRows].join('\n');
}

// Generate DATEV format (simplified)
function generateDATEVFormat(invoices: any[]) {
  // DATEV expects specific column headers and format
  const headers = [
    'Umsatz (ohne Soll/Haben-Kennz.)',
    'Soll/Haben-Kennzeichen',
    'WKZ Umsatz',
    'Kurs',
    'Basis-Umsatz',
    'WKZ Basis-Umsatz',
    'Konto',
    'Gegenkonto (ohne BU-Schlüssel)',
    'BU-Schlüssel',
    'Belegdatum',
    'Belegfeld 1',
    'Belegfeld 2',
    'Skonto',
    'Buchungstext',
    'Postensperre',
    'Diverse Adressnummer',
    'Geschäftspartnerbank',
    'Sachverhalt',
    'Zinssperre',
    'Beleglink',
  ];

  const rows = invoices.map((inv) => {
    const date = new Date(inv.invoice_date);
    const formattedDate = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${date.getFullYear()}`;
    
    return [
      inv.total.toFixed(2).replace('.', ','), // Amount
      'S', // Soll (debit)
      'EUR',
      '',
      '',
      '',
      '1200', // Account receivable
      '8400', // Revenue account
      '',
      formattedDate,
      inv.invoice_number,
      '',
      '',
      `Invoice ${inv.invoice_number}`,
      '',
      '',
      '',
      '',
      '',
      '',
    ].join(';');
  });

  return [headers.join(';'), ...rows].join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'customers' | 'invoices' | 'payments';
    const format = searchParams.get('format') as 'csv' | 'datev';
    const companyId = searchParams.get('companyId');

    if (!type || !companyId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify company exists (shared data - any authenticated user can access)
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    let content = '';
    let filename = '';
    let contentType = 'text/csv; charset=utf-8';

    if (type === 'customers') {
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId);

      if (format === 'csv') {
        const headers = [
          { key: 'customer_number', label: 'Customer Number' },
          { key: 'company_name', label: 'Company Name' },
          { key: 'contact_person', label: 'Contact Person' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'street', label: 'Street' },
          { key: 'postal_code', label: 'Postal Code' },
          { key: 'city', label: 'City' },
          { key: 'country', label: 'Country' },
        ];
        content = convertToCSV(customers || [], headers);
        filename = `customers_${new Date().toISOString().split('T')[0]}.csv`;
      }
    } else if (type === 'invoices') {
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(company_name)
        `)
        .eq('company_id', companyId);

      if (format === 'csv') {
        const headers = [
          { key: 'invoice_number', label: 'Invoice Number' },
          { key: 'customer.company_name', label: 'Customer' },
          { key: 'invoice_date', label: 'Invoice Date' },
          { key: 'due_date', label: 'Due Date' },
          { key: 'status', label: 'Status' },
          { key: 'subtotal', label: 'Subtotal' },
          { key: 'tax', label: 'Tax' },
          { key: 'total', label: 'Total' },
          { key: 'currency', label: 'Currency' },
        ];
        content = convertToCSV(invoices || [], headers);
        filename = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (format === 'datev') {
        content = generateDATEVFormat(invoices || []);
        filename = `EXTF_${new Date().toISOString().split('T')[0]}.csv`;
        contentType = 'text/csv; charset=iso-8859-1';
      }
    } else if (type === 'payments') {
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices(invoice_number)
        `)
        .eq('invoice.company_id', companyId);

      if (format === 'csv') {
        const headers = [
          { key: 'invoice.invoice_number', label: 'Invoice Number' },
          { key: 'amount', label: 'Amount' },
          { key: 'payment_method', label: 'Payment Method' },
          { key: 'payment_date', label: 'Payment Date' },
        ];
        content = convertToCSV(payments || [], headers);
        filename = `payments_${new Date().toISOString().split('T')[0]}.csv`;
      }
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
