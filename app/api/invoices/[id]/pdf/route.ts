import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`*, company:companies(*), customer:customers(*), items:invoice_items(*)`)
      .eq('id', params.id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: invoice.currency || 'EUR' }).format(amount);
    const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('de-DE') : '-';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
@page { margin: 40px; size: A4; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #333; }
.header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
.invoice-title { font-size: 24pt; font-weight: bold; text-transform: uppercase; }
.invoice-number { color: #666; margin-top: 5px; }
.parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
.party { width: 45%; }
.party-label { font-size: 9pt; text-transform: uppercase; color: #666; margin-bottom: 10px; }
.party-name { font-weight: bold; font-size: 13pt; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; }
th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
th { background: #f5f5f5; font-weight: bold; }
.totals { margin-top: 20px; text-align: right; }
.totals-row { display: flex; justify-content: flex-end; padding: 5px 0; }
.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 9pt; color: #666; text-align: center; }
</style></head><body>
<div class="header">
  <div class="invoice-title">INVOICE</div>
  <div class="invoice-number">${invoice.invoice_number} | ${formatDate(invoice.invoice_date)}</div>
</div>
<div class="parties">
  <div class="party">
    <div class="party-label">From</div>
    <div class="party-name">${invoice.company?.name}</div>
    <p>${invoice.company?.street}</p>
    <p>${invoice.company?.postal_code} ${invoice.company?.city}</p>
    <p>${invoice.company?.email}</p>
  </div>
  <div class="party">
    <div class="party-label">To</div>
    <div class="party-name">${invoice.customer?.company_name}</div>
    <p>${invoice.customer?.street}</p>
    <p>${invoice.customer?.postal_code} ${invoice.customer?.city}</p>
    <p>${invoice.customer?.email}</p>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
  <tbody>
    ${invoice.items?.map((item: any) => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.total)}</td></tr>`).join('') || ''}
  </tbody>
</table>
<div class="totals">
  <div class="totals-row"><span>Subtotal: ${formatCurrency(invoice.subtotal)}</span></div>
  <div class="totals-row"><span>Tax (${invoice.tax_rate}%): ${formatCurrency(invoice.tax)}</span></div>
  <div class="totals-row" style="font-weight: bold; font-size: 14pt;"><span>Total: ${formatCurrency(invoice.total)}</span></div>
</div>
<div class="footer">
  <p>Due Date: ${formatDate(invoice.due_date)} | Status: ${invoice.status.toUpperCase()}</p>
  ${invoice.notes ? `<p>Notes: ${invoice.notes}</p>` : ''}
</div>
</body></html>`;

    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
    await browser.close();

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF', details: error.message }, { status: 500 });
  }
}
