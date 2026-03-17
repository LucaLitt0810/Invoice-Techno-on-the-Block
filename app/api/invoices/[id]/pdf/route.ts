import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';

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

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const currency = invoice.currency || 'EUR';
    const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('de-DE') : '-';
    
    // Page 1 - Main Invoice
    const page1 = pdfDoc.addPage([595.28, 841.89]);
    let y = 800;
    
    // Header - Company Info (left)
    page1.drawText(invoice.company?.name || '', { x: 50, y, size: 12, font: fontBold });
    y -= 15;
    page1.drawText(invoice.company?.street || '', { x: 50, y, size: 10, font });
    y -= 12;
    page1.drawText(`${invoice.company?.postal_code || ''} ${invoice.company?.city || ''}`, { x: 50, y, size: 10, font });
    y -= 12;
    page1.drawText(invoice.company?.country || '', { x: 50, y, size: 10, font });
    y -= 12;
    page1.drawText(invoice.company?.email || '', { x: 50, y, size: 9, font });
    
    // INVOICE TO (right)
    y = 800;
    page1.drawText('INVOICE TO:', { x: 400, y, size: 9, font });
    y -= 15;
    page1.drawText(invoice.customer?.company_name || '', { x: 400, y, size: 12, font: fontBold });
    y -= 15;
    page1.drawText(invoice.customer?.street || '', { x: 400, y, size: 10, font });
    y -= 12;
    page1.drawText(`${invoice.customer?.postal_code || ''} ${invoice.customer?.city || ''}`, { x: 400, y, size: 10, font });
    y -= 12;
    page1.drawText(invoice.customer?.country || '', { x: 400, y, size: 10, font });
    if (invoice.customer?.contact_person) {
      y -= 12;
      page1.drawText(`Attn: ${invoice.customer.contact_person}`, { x: 400, y, size: 9, font });
    }
    
    // Title
    y = 680;
    page1.drawText('INVOICE', { x: 50, y, size: 32, font: fontBold });
    
    // Divider line
    y = 650;
    page1.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 2 });
    
    // Invoice Info Row
    y = 620;
    page1.drawText('INVOICE NUMBER', { x: 50, y, size: 9, font });
    page1.drawText('INVOICE DATE', { x: 180, y, size: 9, font });
    page1.drawText('DUE DATE', { x: 310, y, size: 9, font });
    page1.drawText('STATUS', { x: 440, y, size: 9, font });
    
    y -= 18;
    page1.drawText(invoice.invoice_number, { x: 50, y, size: 11, font: fontBold });
    page1.drawText(formatDate(invoice.invoice_date), { x: 180, y, size: 11, font: fontBold });
    page1.drawText(formatDate(invoice.due_date), { x: 310, y, size: 11, font: fontBold });
    page1.drawText(invoice.status.toUpperCase(), { x: 440, y, size: 11, font: fontBold });
    
    // Divider
    y -= 15;
    page1.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 2 });
    
    // Table Header
    y -= 30;
    page1.drawText('DESCRIPTION', { x: 50, y, size: 9, font: fontBold });
    page1.drawText('QTY', { x: 350, y, size: 9, font: fontBold });
    page1.drawText('PRICE', { x: 430, y, size: 9, font: fontBold });
    page1.drawText('TOTAL', { x: 510, y, size: 9, font: fontBold });
    
    // Table Rows
    y -= 20;
    for (const item of invoice.items || []) {
      page1.drawText((item.description || '').substring(0, 40), { x: 50, y, size: 10, font });
      page1.drawText(String(item.quantity), { x: 355, y, size: 10, font });
      page1.drawText(`${item.price.toFixed(2)} ${currency}`, { x: 430, y, size: 10, font });
      page1.drawText(`${item.total.toFixed(2)} ${currency}`, { x: 510, y, size: 10, font });
      y -= 18;
    }
    
    // Divider
    y -= 10;
    page1.drawLine({ start: { x: 350, y }, end: { x: 545, y }, thickness: 1 });
    
    // Totals
    y -= 25;
    page1.drawText('Subtotal', { x: 400, y, size: 10, font });
    page1.drawText(`${invoice.subtotal.toFixed(2)} ${currency}`, { x: 510, y, size: 10, font });
    y -= 18;
    page1.drawText(`Tax (${invoice.tax_rate}%)`, { x: 400, y, size: 10, font });
    page1.drawText(`${invoice.tax.toFixed(2)} ${currency}`, { x: 510, y, size: 10, font });
    
    y -= 15;
    page1.drawLine({ start: { x: 350, y }, end: { x: 545, y }, thickness: 2 });
    y -= 20;
    page1.drawText('TOTAL', { x: 400, y, size: 12, font: fontBold });
    page1.drawText(`${invoice.total.toFixed(2)} ${currency}`, { x: 510, y, size: 12, font: fontBold });
    
    // Footer
    y = 100;
    page1.drawText('Thank you for your business!', { x: 50, y, size: 10, font });
    y -= 15;
    page1.drawText(`Questions? Contact: ${invoice.company?.email}`, { x: 50, y, size: 9, font });
    y -= 15;
    page1.drawText('Payment information on next page', { x: 50, y, size: 8, font });
    
    // Page 2 - Payment Information
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    y = 750;
    
    // Centered Title
    page2.drawText('PAYMENT INFORMATION', { x: 170, y, size: 24, font: fontBold });
    y -= 25;
    page2.drawText(`Invoice ${invoice.invoice_number}`, { x: 250, y, size: 12, font });
    
    // Payment Box
    y -= 60;
    page2.drawRectangle({ x: 100, y: y - 200, width: 400, height: 220, borderWidth: 2, borderColor: { r: 0, g: 0, b: 0 } });
    
    y -= 30;
    page2.drawText('INVOICE NUMBER', { x: 130, y, size: 10, font: fontBold });
    page2.drawText(invoice.invoice_number, { x: 380, y, size: 11, font });
    
    y -= 35;
    page2.drawLine({ start: { x: 130, y: y + 10 }, end: { x: 470, y: y + 10 }, thickness: 1 });
    page2.drawText('AMOUNT DUE', { x: 130, y, size: 10, font: fontBold });
    page2.drawText(`${invoice.total.toFixed(2)} ${currency}`, { x: 380, y, size: 11, font });
    
    if (invoice.company?.bank_name) {
      y -= 35;
      page2.drawLine({ start: { x: 130, y: y + 10 }, end: { x: 470, y: y + 10 }, thickness: 1 });
      page2.drawText('BANK NAME', { x: 130, y, size: 10, font: fontBold });
      page2.drawText(invoice.company.bank_name, { x: 380, y, size: 11, font });
    }
    
    if (invoice.company?.iban) {
      y -= 35;
      page2.drawLine({ start: { x: 130, y: y + 10 }, end: { x: 470, y: y + 10 }, thickness: 1 });
      page2.drawText('IBAN', { x: 130, y, size: 10, font: fontBold });
      page2.drawText(invoice.company.iban, { x: 380, y, size: 11, font });
    }
    
    if (invoice.company?.bic) {
      y -= 35;
      page2.drawLine({ start: { x: 130, y: y + 10 }, end: { x: 470, y: y + 10 }, thickness: 1 });
      page2.drawText('BIC', { x: 130, y, size: 10, font: fontBold });
      page2.drawText(invoice.company.bic, { x: 380, y, size: 11, font });
    }
    
    y -= 35;
    page2.drawLine({ start: { x: 130, y: y + 10 }, end: { x: 470, y: y + 10 }, thickness: 1 });
    page2.drawText('REFERENCE', { x: 130, y, size: 10, font: fontBold });
    page2.drawText(invoice.invoice_number, { x: 380, y, size: 11, font });
    
    // Footer note
    y = 200;
    page2.drawText('Please use the invoice number as payment reference.', { x: 150, y, size: 10, font });
    y -= 20;
    page2.drawText('Thank you for your business!', { x: 210, y, size: 10, font });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
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
