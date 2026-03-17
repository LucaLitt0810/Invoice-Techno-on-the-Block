import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import puppeteer from 'puppeteer';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let browser;
  
  try {
    const supabase = createClient();
    
    // Get invoice with related data
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        company:companies(*),
        customer:customers(*),
        items:invoice_items(*)
      `)
      .eq('id', params.id)
      .single();

    if (error || !invoice) {
      console.error('Invoice fetch error:', error);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: invoice.currency || 'EUR',
      }).format(amount);
    };

    // Format date
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('de-DE');
    };

    // Check if company has payment info
    const hasPaymentInfo = invoice.company?.iban || invoice.company?.bank_name;

    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    @page { 
      margin: 40px; 
      size: A4;
    }
    @page payment {
      margin: 40px;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Helvetica', 'Arial', sans-serif; 
      font-size: 11pt; 
      line-height: 1.5; 
      color: #333;
      background: #fff;
    }
    .page {
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .payment-page {
      page: payment;
      page-break-before: always;
    }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company-info { max-width: 50%; }
    .customer-info { text-align: right; }
    .logo { max-height: 60px; margin-bottom: 10px; }
    .invoice-title { 
      font-size: 28pt; 
      font-weight: bold; 
      color: #000;
      margin-bottom: 30px;
      text-transform: uppercase;
      letter-spacing: 3px;
    }
    .invoice-details { 
      display: flex; 
      gap: 40px; 
      margin-bottom: 30px;
      padding: 15px 0;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    .detail-item { flex: 1; }
    .detail-label { font-size: 9pt; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .detail-value { font-weight: bold; font-size: 11pt; margin-top: 3px; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 30px 0; 
    }
    th { 
      text-align: left; 
      padding: 12px 10px; 
      border-bottom: 2px solid #000;
      font-size: 9pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      background: #f5f5f5;
    }
    td { 
      padding: 12px 10px; 
      border-bottom: 1px solid #ddd; 
    }
    tr:nth-child(even) { background: #fafafa; }
    .text-right { text-align: right; }
    .totals { 
      width: 300px; 
      margin-left: auto; 
      margin-top: 30px;
    }
    .totals-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 10px 0;
      border-bottom: 1px solid #ddd;
    }
    .totals-row.total { 
      font-weight: bold; 
      font-size: 14pt;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      margin-top: 10px;
      padding: 15px 0;
    }
    .notes { 
      margin-top: 30px; 
      padding: 15px; 
      background: #fafafa; 
      border-left: 3px solid #000; 
    }
    .footer { 
      margin-top: 60px; 
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 9pt;
      color: #666;
    }
    .payment-header {
      text-align: center;
      margin-bottom: 60px;
      padding-top: 40px;
    }
    .payment-title {
      font-size: 24pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 10px;
    }
    .payment-subtitle {
      font-size: 11pt;
      color: #666;
    }
    .payment-box {
      max-width: 500px;
      margin: 0 auto;
      padding: 40px;
      background: #f9f9f9;
      border: 2px solid #000;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      padding: 15px 0;
      border-bottom: 1px solid #ddd;
    }
    .payment-row:last-child {
      border-bottom: none;
    }
    .payment-label {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 9pt;
      letter-spacing: 1px;
      color: #666;
    }
    .payment-value {
      font-family: 'Courier New', monospace;
      font-size: 12pt;
    }
    .payment-note {
      margin-top: 40px;
      text-align: center;
      font-size: 10pt;
      color: #666;
    }
    .status-paid { color: #059669; font-weight: bold; }
    .status-overdue { color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <!-- Invoice Page -->
  <div class="page">
    <div class="header">
      <div class="company-info">
        ${invoice.company?.logo_url ? `<img src="${invoice.company.logo_url}" class="logo" alt="Logo">` : ''}
        <h2 style="font-size: 14pt; margin-bottom: 5px; font-weight: bold;">${invoice.company?.name || ''}</h2>
        <p>${invoice.company?.street || ''}</p>
        <p>${invoice.company?.postal_code || ''} ${invoice.company?.city || ''}</p>
        <p>${invoice.company?.country || ''}</p>
        <p style="margin-top: 10px;">${invoice.company?.email || ''}</p>
        ${invoice.company?.phone ? `<p>${invoice.company.phone}</p>` : ''}
        ${invoice.company?.vat_id ? `<p style="margin-top: 10px; font-size: 9pt;">VAT: ${invoice.company.vat_id}</p>` : ''}
      </div>
      <div class="customer-info">
        <h3 style="margin-bottom: 15px; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; color: #666;">Invoice To:</h3>
        <p style="font-weight: bold; font-size: 13pt; margin-bottom: 5px;">${invoice.customer?.company_name || ''}</p>
        <p>${invoice.customer?.street || ''}</p>
        <p>${invoice.customer?.postal_code || ''} ${invoice.customer?.city || ''}</p>
        <p>${invoice.customer?.country || ''}</p>

      </div>
    </div>

    <div class="invoice-title">INVOICE</div>

    <div class="invoice-details">
      <div class="detail-item">
        <div class="detail-label">Invoice Number</div>
        <div class="detail-value">${invoice.invoice_number}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Invoice Date</div>
        <div class="detail-value">${formatDate(invoice.invoice_date)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Due Date</div>
        <div class="detail-value">${formatDate(invoice.due_date)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Status</div>
        <div class="detail-value ${invoice.status === 'paid' ? 'status-paid' : invoice.status === 'overdue' ? 'status-overdue' : ''}">${invoice.status.toUpperCase()}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items && invoice.items.length > 0 ? invoice.items.map((item: any) => `
          <tr>
            <td>${item.description}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${item.unit || 'pcs'}</td>
            <td class="text-right">${formatCurrency(item.price)}</td>
            <td class="text-right">${formatCurrency(item.total)}</td>
          </tr>
        `).join('') : '<tr><td colspan="5" style="text-align: center;">No items</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(invoice.subtotal)}</span>
      </div>
      <div class="totals-row">
        <span>Tax (${invoice.tax_rate}%)</span>
        <span>${formatCurrency(invoice.tax)}</span>
      </div>
      <div class="totals-row total">
        <span>TOTAL</span>
        <span>${formatCurrency(invoice.total)}</span>
      </div>
    </div>

    ${invoice.notes ? `
      <div class="notes">
        <h4 style="font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Notes</h4>
        <p style="font-size: 10pt; color: #666; white-space: pre-line;">${invoice.notes}</p>
      </div>
    ` : ''}

    <div class="footer">
      <p style="font-weight: bold;">Thank you for your business!</p>
      ${invoice.company?.email ? `<p>Questions? Contact: ${invoice.company.email}</p>` : ''}
      ${hasPaymentInfo ? `<p style="margin-top: 10px; font-size: 8pt; color: #999;">Payment information on next page</p>` : ''}
    </div>
  </div>

  ${hasPaymentInfo ? `
  <!-- Payment Information Page -->
  <div class="payment-page">
    <div class="payment-header">
      <div class="payment-title">Payment Information</div>
      <div class="payment-subtitle">Invoice ${invoice.invoice_number}</div>
    </div>

    <div class="payment-box">
      <div class="payment-row">
        <span class="payment-label">Invoice Number</span>
        <span class="payment-value">${invoice.invoice_number}</span>
      </div>
      <div class="payment-row">
        <span class="payment-label">Amount Due</span>
        <span class="payment-value">${formatCurrency(invoice.total)}</span>
      </div>
      ${invoice.company?.bank_name ? `
      <div class="payment-row">
        <span class="payment-label">Bank Name</span>
        <span class="payment-value">${invoice.company.bank_name}</span>
      </div>
      ` : ''}
      ${invoice.company?.iban ? `
      <div class="payment-row">
        <span class="payment-label">IBAN</span>
        <span class="payment-value">${invoice.company.iban}</span>
      </div>
      ` : ''}
      ${invoice.company?.bic ? `
      <div class="payment-row">
        <span class="payment-label">BIC / SWIFT</span>
        <span class="payment-value">${invoice.company.bic}</span>
      </div>
      ` : ''}
      <div class="payment-row">
        <span class="payment-label">Reference</span>
        <span class="payment-value">${invoice.invoice_number}</span>
      </div>
    </div>

    <div class="payment-note">
      <p>Please use the invoice number as payment reference.</p>
      <p style="margin-top: 10px;">Thank you for your business!</p>
    </div>
  </div>
  ` : ''}
</body>
</html>
    `;

    // Launch browser and generate PDF
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });

    await browser.close();

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error: any) {
    if (browser) await browser.close();
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}
