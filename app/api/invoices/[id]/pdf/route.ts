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
    const rightCol = 420;
    page1.drawText('INVOICE TO:', { x: rightCol, y, size: 9, font });
    y -= 15;
    page1.drawText(invoice.customer?.company_name || '', { x: rightCol, y, size: 12, font: fontBold });
    y -= 15;
    page1.drawText(invoice.customer?.street || '', { x: rightCol, y, size: 10, font });
    y -= 12;
    page1.drawText(`${invoice.customer?.postal_code || ''} ${invoice.customer?.city || ''}`, { x: rightCol, y, size: 10, font });
    y -= 12;
    page1.drawText(invoice.customer?.country || '', { x: rightCol, y, size: 10, font });
    if (invoice.customer?.contact_person) {
      y -= 12;
      page1.drawText(`Attn: ${invoice.customer.contact_person}`, { x: rightCol, y, size: 9, font });
    }
    
    // Title
    y = 680;
    page1.drawText('INVOICE', { x: 50, y, size: 32, font: fontBold });
    
    // Divider line
    y = 640;
    page1.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 2 });
    
    // Invoice Info Row (3 columns - no status)
    y = 600;
    const col1 = 50;
    const col2 = 220;
    const col3 = 390;
    
    page1.drawText('INVOICE NUMBER', { x: col1, y, size: 9, font });
    page1.drawText('INVOICE DATE', { x: col2, y, size: 9, font });
    page1.drawText('DUE DATE', { x: col3, y, size: 9, font });
    
    y -= 20;
    page1.drawText(invoice.invoice_number, { x: col1, y, size: 11, font: fontBold });
    page1.drawText(formatDate(invoice.invoice_date), { x: col2, y, size: 11, font: fontBold });
    page1.drawText(formatDate(invoice.due_date), { x: col3, y, size: 11, font: fontBold });
    
    // Divider - full width to match table
    y -= 20;
    page1.drawLine({ start: { x: 50, y }, end: { x: 530, y }, thickness: 2 });
    
    // Table Header with gray background
    y -= 30;
    const descX = 50;
    const qtyX = 320;
    const priceX = 400;
    const totalX = 480;
    const headerY = y;
    
    // Gray background for header
    page1.drawRectangle({
      x: 50,
      y: y - 5,
      width: 480,
      height: 25,
      color: rgb(0.96, 0.96, 0.96),
    });
    
    page1.drawText('DESCRIPTION', { x: descX, y, size: 9, font: fontBold });
    page1.drawText('QTY', { x: qtyX + 5, y, size: 9, font: fontBold });
    page1.drawText('PRICE', { x: priceX, y, size: 9, font: fontBold });
    page1.drawText('TOTAL', { x: totalX, y, size: 9, font: fontBold });
    
    // Line under header
    y -= 25;
    page1.drawLine({ start: { x: 50, y }, end: { x: 530, y }, thickness: 1 });
    
    // Table Rows with lines
    y -= 5;
    for (const item of invoice.items || []) {
      y -= 20;
      page1.drawText((item.description || '').substring(0, 40), { x: descX, y, size: 10, font });
      page1.drawText(String(item.quantity), { x: qtyX + 5, y, size: 10, font });
      page1.drawText(`${item.price.toFixed(2)} ${currency}`, { x: priceX, y, size: 10, font });
      page1.drawText(`${item.total.toFixed(2)} ${currency}`, { x: totalX, y, size: 10, font });
      // Line under each row
      y -= 5;
      page1.drawLine({ start: { x: 50, y }, end: { x: 530, y }, thickness: 0.5 });
    }
    
    // Totals section with full width lines
    y -= 30;
    const labelX = 380;
    const valueX = 460;
    
    // Line above subtotal (starts at Subtotal label)
    page1.drawLine({ start: { x: labelX, y }, end: { x: 530, y }, thickness: 1 });
    y -= 20;
    page1.drawText('Subtotal', { x: labelX, y, size: 10, font });
    page1.drawText(`${invoice.subtotal.toFixed(2)} ${currency}`, { x: valueX, y, size: 10, font });
    y -= 20;
    page1.drawText(`Tax (${invoice.tax_rate}%)`, { x: labelX, y, size: 10, font });
    page1.drawText(`${invoice.tax.toFixed(2)} ${currency}`, { x: valueX, y, size: 10, font });
    
    // Line above TOTAL (starts at Subtotal label)
    y -= 10;
    page1.drawLine({ start: { x: labelX, y }, end: { x: 530, y }, thickness: 1 });
    y -= 25;
    page1.drawText('TOTAL', { x: labelX, y, size: 12, font: fontBold });
    page1.drawText(`${invoice.total.toFixed(2)} ${currency}`, { x: valueX, y, size: 12, font: fontBold });
    
    // Line below TOTAL (full width)
    y -= 10;
    page1.drawLine({ start: { x: 50, y }, end: { x: 530, y }, thickness: 2 });
    
    // Footer
    y = 120;
    page1.drawText('Thank you for your business!', { x: 50, y, size: 10, font });
    y -= 15;
    page1.drawText(`Questions? Contact: ${invoice.company?.email}`, { x: 50, y, size: 9, font });
    y -= 15;
    page1.drawText('Payment information on next page', { x: 50, y, size: 8, font });
    
    // Page 2 - Payment Information
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    
    // Brand Header
    page2.drawText('Techno on the Block', { x: 50, y: 780, size: 14, font: fontBold });
    page2.drawText('Invoice Center', { x: 50, y: 765, size: 10, font });
    
    // Title
    let titleY = 680;
    page2.drawText('PAYMENT INFORMATION', { x: 170, y: titleY, size: 24, font: fontBold });
    titleY -= 25;
    page2.drawText(`Invoice ${invoice.invoice_number}`, { x: 250, y: titleY, size: 12, font });
    
    // Payment Box - centered with all content inside
    const boxX = 100;
    const boxWidth = 400;
    const boxTopY = 580;
    const lineHeight = 40;
    
    // Calculate box height based on content
    let numRows = 3; // Invoice Number, Amount Due, Reference
    if (invoice.company?.bank_name) numRows++;
    if (invoice.company?.iban) numRows++;
    if (invoice.company?.bic) numRows++;
    
    const boxHeight = (numRows * lineHeight) + 20; // +20 for padding
    
    // Draw box
    page2.drawRectangle({ 
      x: boxX, 
      y: boxTopY - boxHeight, 
      width: boxWidth, 
      height: boxHeight, 
      borderWidth: 2, 
      borderColor: rgb(0, 0, 0) 
    });
    
    // Content inside box
    const leftX = boxX + 25;
    const rightX = boxX + boxWidth - 25;
    let contentY = boxTopY - 30;
    
    // Row 1: Invoice Number
    page2.drawText('INVOICE NUMBER', { x: leftX, y: contentY, size: 10, font: fontBold });
    page2.drawText(invoice.invoice_number, { x: rightX - 80, y: contentY, size: 11, font });
    contentY -= lineHeight;
    
    // Row 2: Amount Due
    page2.drawLine({ start: { x: leftX, y: contentY + 25 }, end: { x: rightX, y: contentY + 25 }, thickness: 1 });
    page2.drawText('AMOUNT DUE', { x: leftX, y: contentY, size: 10, font: fontBold });
    page2.drawText(`${invoice.total.toFixed(2)} ${currency}`, { x: rightX - 100, y: contentY, size: 11, font });
    contentY -= lineHeight;
    
    // Row 3: Bank Name (if exists)
    if (invoice.company?.bank_name) {
      page2.drawLine({ start: { x: leftX, y: contentY + 25 }, end: { x: rightX, y: contentY + 25 }, thickness: 1 });
      page2.drawText('BANK NAME', { x: leftX, y: contentY, size: 10, font: fontBold });
      page2.drawText(invoice.company.bank_name, { x: rightX - 80, y: contentY, size: 11, font });
      contentY -= lineHeight;
    }
    
    // Row 4: IBAN (if exists)
    if (invoice.company?.iban) {
      page2.drawLine({ start: { x: leftX, y: contentY + 25 }, end: { x: rightX, y: contentY + 25 }, thickness: 1 });
      page2.drawText('IBAN', { x: leftX, y: contentY, size: 10, font: fontBold });
      page2.drawText(invoice.company.iban, { x: rightX - 160, y: contentY, size: 11, font });
      contentY -= lineHeight;
    }
    
    // Row 5: BIC (if exists)
    if (invoice.company?.bic) {
      page2.drawLine({ start: { x: leftX, y: contentY + 25 }, end: { x: rightX, y: contentY + 25 }, thickness: 1 });
      page2.drawText('BIC', { x: leftX, y: contentY, size: 10, font: fontBold });
      page2.drawText(invoice.company.bic, { x: rightX - 80, y: contentY, size: 11, font });
      contentY -= lineHeight;
    }
    
    // Row 6: Reference (always last, inside box)
    page2.drawLine({ start: { x: leftX, y: contentY + 25 }, end: { x: rightX, y: contentY + 25 }, thickness: 1 });
    page2.drawText('REFERENCE', { x: leftX, y: contentY, size: 10, font: fontBold });
    page2.drawText(invoice.invoice_number, { x: rightX - 80, y: contentY, size: 11, font });
    
    // Footer note - centered below box
    const footerY = boxTopY - boxHeight - 50;
    page2.drawText('Please use the invoice number as payment reference.', { x: 150, y: footerY, size: 10, font });
    page2.drawText('Thank you for your business!', { x: 210, y: footerY - 20, size: 10, font });

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
