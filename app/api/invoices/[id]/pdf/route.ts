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
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    let y = height - 40;
    const currency = invoice.currency || 'EUR';
    const primaryColor = rgb(0.23, 0.51, 0.96); // Blue #3b82f6
    const darkColor = rgb(0.1, 0.1, 0.1);
    const grayColor = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.95, 0.95, 0.95);

    // Header Background
    page.drawRectangle({
      x: 0,
      y: height - 120,
      width: width,
      height: 120,
      color: lightGray,
    });

    // Logo / Brand
    page.drawText('Techno on the Block', { 
      x: 50, 
      y: height - 55, 
      size: 18, 
      font: fontBold,
      color: primaryColor 
    });
    page.drawText('Invoice Center', { 
      x: 50, 
      y: height - 75, 
      size: 11, 
      font,
      color: darkColor 
    });

    // INVOICE Title (right side)
    page.drawText('INVOICE', { 
      x: 420, 
      y: height - 60, 
      size: 32, 
      font: fontBold,
      color: darkColor 
    });

    // Invoice Number and Date
    y = height - 140;
    page.drawText(`Invoice Number:`, { x: 350, y, size: 9, font, color: grayColor });
    page.drawText(`${invoice.invoice_number}`, { x: 450, y, size: 11, font: fontBold });
    y -= 18;
    page.drawText(`Date:`, { x: 350, y, size: 9, font, color: grayColor });
    page.drawText(`${new Date(invoice.invoice_date).toLocaleDateString('de-DE')}`, { x: 450, y, size: 11, font });
    y -= 18;
    page.drawText(`Due Date:`, { x: 350, y, size: 9, font, color: grayColor });
    page.drawText(`${new Date(invoice.due_date).toLocaleDateString('de-DE')}`, { x: 450, y, size: 11, font });

    // Parties Section
    y -= 40;
    
    // From Box
    page.drawRectangle({
      x: 45,
      y: y - 5,
      width: 240,
      height: 110,
      borderColor: primaryColor,
      borderWidth: 2,
      color: rgb(1, 1, 1),
    });
    page.drawText('FROM', { x: 55, y: y + 85, size: 8, font, color: primaryColor });
    page.drawText(invoice.company?.name || '', { x: 55, y: y + 65, size: 12, font: fontBold, color: darkColor });
    page.drawText(invoice.company?.street || '', { x: 55, y: y + 48, size: 10, font });
    page.drawText(`${invoice.company?.postal_code || ''} ${invoice.company?.city || ''}`, { x: 55, y: y + 33, size: 10, font });
    if (invoice.company?.email) {
      page.drawText(invoice.company.email, { x: 55, y: y + 18, size: 9, font, color: grayColor });
    }

    // To Box
    page.drawRectangle({
      x: 305,
      y: y - 5,
      width: 240,
      height: 110,
      borderColor: grayColor,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    page.drawText('BILL TO', { x: 315, y: y + 85, size: 8, font, color: grayColor });
    page.drawText(invoice.customer?.company_name || '', { x: 315, y: y + 65, size: 12, font: fontBold, color: darkColor });
    page.drawText(invoice.customer?.street || '', { x: 315, y: y + 48, size: 10, font });
    page.drawText(`${invoice.customer?.postal_code || ''} ${invoice.customer?.city || ''}`, { x: 315, y: y + 33, size: 10, font });
    if (invoice.customer?.email) {
      page.drawText(invoice.customer.email, { x: 315, y: y + 18, size: 9, font, color: grayColor });
    }

    // Items Table
    y -= 140;
    
    // Table Header Background
    page.drawRectangle({
      x: 50,
      y: y - 5,
      width: 495,
      height: 25,
      color: primaryColor,
    });
    
    // Table Headers
    page.drawText('Description', { x: 60, y: y + 2, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Qty', { x: 350, y: y + 2, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Price', { x: 420, y: y + 2, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Total', { x: 490, y: y + 2, size: 10, font: fontBold, color: rgb(1, 1, 1) });
    
    y -= 25;
    
    // Table Rows with alternating background
    let rowIndex = 0;
    for (const item of invoice.items || []) {
      if (rowIndex % 2 === 0) {
        page.drawRectangle({
          x: 50,
          y: y - 5,
          width: 495,
          height: 22,
          color: lightGray,
        });
      }
      
      page.drawText(item.description?.substring(0, 35) || '', { x: 60, y: y, size: 10, font });
      page.drawText(String(item.quantity), { x: 355, y: y, size: 10, font });
      page.drawText(`${item.price.toFixed(2)}`, { x: 420, y: y, size: 10, font });
      page.drawText(`${item.total.toFixed(2)}`, { x: 485, y: y, size: 10, font: fontBold });
      y -= 22;
      rowIndex++;
    }

    // Bottom line of table
    y += 5;
    page.drawLine({ 
      start: { x: 50, y }, 
      end: { x: 545, y }, 
      thickness: 2, 
      color: primaryColor 
    });

    // Totals Section (right aligned)
    y -= 40;
    
    const totalsX = 350;
    const valueX = 500;
    
    page.drawText('Subtotal:', { x: totalsX, y, size: 10, font, color: grayColor });
    page.drawText(`${invoice.subtotal.toFixed(2)} ${currency}`, { x: valueX, y, size: 10, font });
    y -= 20;
    
    page.drawText(`Tax (${invoice.tax_rate}%):`, { x: totalsX, y, size: 10, font, color: grayColor });
    page.drawText(`${invoice.tax.toFixed(2)} ${currency}`, { x: valueX, y, size: 10, font });
    y -= 25;
    
    // Total with highlight
    page.drawRectangle({
      x: 340,
      y: y - 5,
      width: 210,
      height: 28,
      color: primaryColor,
    });
    page.drawText('TOTAL:', { x: 350, y, size: 12, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText(`${invoice.total.toFixed(2)} ${currency}`, { x: 430, y, size: 12, font: fontBold, color: rgb(1, 1, 1) });

    // Payment Instructions Section
    y -= 60;
    
    page.drawRectangle({
      x: 50,
      y: y - 80,
      width: 300,
      height: 90,
      borderColor: primaryColor,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    
    page.drawText('PAYMENT INFORMATION', { 
      x: 60, 
      y: y, 
      size: 10, 
      font: fontBold, 
      color: primaryColor 
    });
    y -= 22;
    
    if (invoice.company?.bank_name) {
      page.drawText('Bank:', { x: 60, y, size: 9, font, color: grayColor });
      page.drawText(invoice.company.bank_name, { x: 120, y, size: 10, font: fontBold });
      y -= 16;
    }
    if (invoice.company?.iban) {
      page.drawText('IBAN:', { x: 60, y, size: 9, font, color: grayColor });
      page.drawText(invoice.company.iban, { x: 120, y, size: 10, font: fontBold });
      y -= 16;
    }
    if (invoice.company?.bic) {
      page.drawText('BIC:', { x: 60, y, size: 9, font, color: grayColor });
      page.drawText(invoice.company.bic, { x: 120, y, size: 10, font: fontBold });
      y -= 16;
    }
    
    y -= 10;
    page.drawText(`Reference: ${invoice.invoice_number}`, { 
      x: 60, 
      y, 
      size: 9, 
      font: fontOblique,
      color: grayColor 
    });

    // Status Badge
    const statusColors: Record<string, any> = {
      paid: rgb(0.2, 0.8, 0.2),
      sent: rgb(0.23, 0.51, 0.96),
      created: rgb(0.6, 0.6, 0.6),
      overdue: rgb(0.9, 0.2, 0.2),
    };
    const statusColor = statusColors[invoice.status] || grayColor;
    
    page.drawRectangle({
      x: 380,
      y: y - 5,
      width: 100,
      height: 25,
      color: statusColor,
    });
    page.drawText(invoice.status.toUpperCase(), { 
      x: 395, 
      y: y + 2, 
      size: 10, 
      font: fontBold, 
      color: rgb(1, 1, 1) 
    });

    // Footer
    page.drawLine({ 
      start: { x: 50, y: 60 }, 
      end: { x: 545, y: 60 }, 
      thickness: 1, 
      color: lightGray 
    });
    page.drawText('Thank you for your business!', { 
      x: 50, 
      y: 40, 
      size: 9, 
      font: fontOblique,
      color: grayColor 
    });

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
