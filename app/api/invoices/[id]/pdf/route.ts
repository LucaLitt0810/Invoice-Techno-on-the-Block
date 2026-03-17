import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;
    const currency = invoice.currency || 'EUR';

    // Header
    page.drawText('INVOICE', { x: 50, y, size: 28, font: fontBold });
    y -= 25;
    page.drawText(`${invoice.invoice_number} | ${new Date(invoice.invoice_date).toLocaleDateString('de-DE')}`, { x: 50, y, size: 11, font });
    y -= 50;

    // Parties
    page.drawText('FROM', { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('TO', { x: 300, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 18;
    page.drawText(invoice.company?.name || '', { x: 50, y, size: 12, font: fontBold });
    page.drawText(invoice.customer?.company_name || '', { x: 300, y, size: 12, font: fontBold });
    y -= 14;
    page.drawText(invoice.company?.street || '', { x: 50, y, size: 10, font });
    page.drawText(invoice.customer?.street || '', { x: 300, y, size: 10, font });
    y -= 14;
    page.drawText(`${invoice.company?.postal_code || ''} ${invoice.company?.city || ''}`, { x: 50, y, size: 10, font });
    page.drawText(`${invoice.customer?.postal_code || ''} ${invoice.customer?.city || ''}`, { x: 300, y, size: 10, font });
    y -= 50;

    // Items header
    page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;
    page.drawText('Description', { x: 50, y, size: 10, font: fontBold });
    page.drawText('Qty', { x: 350, y, size: 10, font: fontBold });
    page.drawText('Price', { x: 420, y, size: 10, font: fontBold });
    page.drawText('Total', { x: 490, y, size: 10, font: fontBold });
    y -= 10;
    page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;

    // Items
    for (const item of invoice.items || []) {
      page.drawText(item.description || '', { x: 50, y, size: 10, font });
      page.drawText(String(item.quantity), { x: 350, y, size: 10, font });
      page.drawText(`${item.price.toFixed(2)}`, { x: 420, y, size: 10, font });
      page.drawText(`${item.total.toFixed(2)}`, { x: 490, y, size: 10, font });
      y -= 18;
    }

    y -= 20;
    page.drawLine({ start: { x: 350, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;

    // Totals
    page.drawText(`Subtotal:`, { x: 380, y, size: 10, font });
    page.drawText(`${invoice.subtotal.toFixed(2)} ${currency}`, { x: 480, y, size: 10, font });
    y -= 16;
    page.drawText(`Tax (${invoice.tax_rate}%):`, { x: 380, y, size: 10, font });
    page.drawText(`${invoice.tax.toFixed(2)} ${currency}`, { x: 480, y, size: 10, font });
    y -= 20;
    page.drawText(`TOTAL:`, { x: 380, y, size: 12, font: fontBold });
    page.drawText(`${invoice.total.toFixed(2)} ${currency}`, { x: 480, y, size: 12, font: fontBold });
    y -= 30;

    // Status and Due Date
    page.drawText(`Status: ${invoice.status.toUpperCase()}`, { x: 50, y, size: 11, font });
    page.drawText(`Due Date: ${new Date(invoice.due_date).toLocaleDateString('de-DE')}`, { x: 50, y: y - 15, size: 11, font });

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
