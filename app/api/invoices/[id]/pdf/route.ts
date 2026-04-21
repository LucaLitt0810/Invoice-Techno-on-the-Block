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
    const formatNumber = (num: number) => num.toFixed(2).replace('.', ',');
    
    // Page 1 - Main Invoice
    const page1 = pdfDoc.addPage([595.28, 841.89]);
    let y = 800;
    
    // Company Logo (if exists)
    if (invoice.company?.logo_url) {
      try {
        const logoUrl = invoice.company.logo_url.startsWith('http') 
          ? invoice.company.logo_url 
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${invoice.company.logo_url}`;
        
        const logoResponse = await fetch(logoUrl);
        if (logoResponse.ok) {
          const logoBytes = await logoResponse.arrayBuffer();
          const logoImage = await pdfDoc.embedPng(logoBytes).catch(() => pdfDoc.embedJpg(logoBytes));
          
          const logoWidth = 70;
          const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
          page1.drawImage(logoImage, { x: 50, y: y - logoHeight + 10, width: logoWidth, height: logoHeight });
          y -= logoHeight + 15;
        }
      } catch (e) {
        // Logo failed to load, continue without it
      }
    }
    
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
    y -= 20;
    
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
    y = 560;
    page1.drawText('INVOICE', { x: 50, y, size: 32, font: fontBold });
    
    // Divider line - closer to labels
    y = 505;
    page1.drawLine({ start: { x: 50, y }, end: { x: 530, y }, thickness: 1 });
    
    // Invoice Info Row (3 columns, evenly spaced, centered)
    y = 490;
    const col1Center = 130;
    const col2Center = 290;
    const col3Center = 450;
    
    const centerText = (text: string, cx: number, size: number, f: typeof font) => {
      const tw = f.widthOfTextAtSize(text, size);
      return cx - tw / 2;
    };
    
    page1.drawText('INVOICE NUMBER', { x: centerText('INVOICE NUMBER', col1Center, 9, font), y, size: 9, font });
    page1.drawText('INVOICE DATE', { x: centerText('INVOICE DATE', col2Center, 9, font), y, size: 9, font });
    page1.drawText('DUE DATE', { x: centerText('DUE DATE', col3Center, 9, font), y, size: 9, font });
    
    y -= 12;
    page1.drawText(invoice.invoice_number, { x: centerText(invoice.invoice_number, col1Center, 11, fontBold), y, size: 11, font: fontBold });
    page1.drawText(formatDate(invoice.invoice_date), { x: centerText(formatDate(invoice.invoice_date), col2Center, 11, fontBold), y, size: 11, font: fontBold });
    page1.drawText(formatDate(invoice.due_date), { x: centerText(formatDate(invoice.due_date), col3Center, 11, fontBold), y, size: 11, font: fontBold });
    
    // Divider - closer to values
    y -= 10;
    page1.drawLine({ start: { x: 50, y }, end: { x: 530, y }, thickness: 1 });
    
    // Table Header with gray background
    y -= 35;
    const descX = 55;
    const dateX = 290;
    const qtyX = 370;
    const unitX = 415;
    const priceX = 475;
    
    // Gray background for header
    page1.drawRectangle({
      x: 50,
      y: y - 5,
      width: 480,
      height: 22,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    page1.drawText('DESCRIPTION', { x: descX, y, size: 9, font: fontBold });
    page1.drawText('DATE', { x: dateX, y, size: 9, font: fontBold });
    page1.drawText('QTY', { x: qtyX, y, size: 9, font: fontBold });
    page1.drawText('UNIT', { x: unitX, y, size: 9, font: fontBold });
    page1.drawText('PRICE', { x: priceX, y, size: 9, font: fontBold });
    
    // Line under header - directly below gray background
    y -= 5;
    page1.drawLine({ start: { x: 50, y }, end: { x: 530, y }, thickness: 1 });
    
    // Table Rows with lines
    y -= 18;
    for (const item of invoice.items || []) {
      const itemDate = item.service_date || invoice.service_date;
      page1.drawText((item.description || '').substring(0, 40), { x: descX, y, size: 10, font });
      page1.drawText(itemDate ? formatDate(itemDate) : '-', { x: dateX, y, size: 10, font });
      page1.drawText(String(item.quantity), { x: qtyX + 15, y, size: 10, font });
      page1.drawText(item.unit || 'piece', { x: unitX, y, size: 10, font });
      page1.drawText(`${formatNumber(item.price)} ${currency}`, { x: priceX - 10, y, size: 10, font });
      // Line under each row
      y -= 14;
      page1.drawLine({ start: { x: 50, y }, end: { x: 530, y }, thickness: 0.3 });
      y -= 14;
    }
    
    // Totals section
    y -= 20;
    const labelX = 380;
    const valueX = 470;
    
    // Line above subtotal (starts at Subtotal label)
    page1.drawLine({ start: { x: labelX, y }, end: { x: 530, y }, thickness: 0.5 });
    y -= 18;
    page1.drawText('Subtotal', { x: labelX, y, size: 10, font });
    page1.drawText(`${formatNumber(invoice.subtotal)} ${currency}`, { x: valueX - 10, y, size: 10, font });
    y -= 18;
    page1.drawText(`Tax (${invoice.tax_rate}%)`, { x: labelX, y, size: 10, font });
    page1.drawText(`${formatNumber(invoice.tax)} ${currency}`, { x: valueX - 10, y, size: 10, font });
    
    // Line above TOTAL
    y -= 12;
    page1.drawLine({ start: { x: labelX, y }, end: { x: 530, y }, thickness: 1 });
    y -= 22;
    page1.drawText('TOTAL', { x: labelX, y, size: 12, font: fontBold });
    page1.drawText(`${formatNumber(invoice.total)} ${currency}`, { x: valueX - 10, y, size: 12, font: fontBold });
    
    // Line below TOTAL
    y -= 12;
    page1.drawLine({ start: { x: labelX, y }, end: { x: 530, y }, thickness: 1 });

    // AHV Waiver notice
    if (invoice.ahv_waiver) {
      y -= 30;
      page1.drawText('AHV verzicht / Self-employment notice:', { x: 50, y, size: 9, font: fontBold });
      y -= 14;
      page1.drawText('Social insurance contributions (AHV, IV, EO) are settled by the contractor.', { x: 50, y, size: 9, font });
    }
    
    // Notes section (if exists)
    if (invoice.notes) {
      y = 130;
      page1.drawText('NOTES:', { x: 50, y, size: 10, font: fontBold });
      y -= 15;
      // Wrap notes text to fit page width
      const maxWidth = 480;
      const words = invoice.notes.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line + word + ' ';
        const lineWidth = font.widthOfTextAtSize(testLine, 9);
        if (lineWidth > maxWidth && line !== '') {
          page1.drawText(line.trim(), { x: 50, y, size: 9, font });
          y -= 12;
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      if (line.trim()) {
        page1.drawText(line.trim(), { x: 50, y, size: 9, font });
      }
    }
    
    // Footer line
    y = 100;
    page1.drawLine({ start: { x: 50, y }, end: { x: 530, y }, thickness: 0.3 });
    y -= 15;
    page1.drawText('Thank you for your business!', { x: 50, y, size: 10, font });
    y -= 15;
    page1.drawText(`Questions? Contact: ${invoice.company?.email}`, { x: 50, y, size: 9, font });
    y -= 12;
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
    const invoiceNumWidth = font.widthOfTextAtSize(invoice.invoice_number, 11);
    page2.drawText(invoice.invoice_number, { x: rightX - invoiceNumWidth, y: contentY, size: 11, font });
    contentY -= lineHeight;
    
    // Row 2: Amount Due
    page2.drawLine({ start: { x: leftX, y: contentY + 25 }, end: { x: rightX, y: contentY + 25 }, thickness: 1 });
    page2.drawText('AMOUNT DUE', { x: leftX, y: contentY, size: 10, font: fontBold });
    const amountText = `${formatNumber(invoice.total)} ${currency}`;
    const amountWidth = font.widthOfTextAtSize(amountText, 11);
    page2.drawText(amountText, { x: rightX - amountWidth, y: contentY, size: 11, font });
    contentY -= lineHeight;
    
    // Row 3: Bank Name (if exists)
    if (invoice.company?.bank_name) {
      page2.drawLine({ start: { x: leftX, y: contentY + 25 }, end: { x: rightX, y: contentY + 25 }, thickness: 1 });
      page2.drawText('BANK NAME', { x: leftX, y: contentY, size: 10, font: fontBold });
      const bankNameWidth = font.widthOfTextAtSize(invoice.company.bank_name, 11);
      page2.drawText(invoice.company.bank_name, { x: rightX - bankNameWidth, y: contentY, size: 11, font });
      contentY -= lineHeight;
    }
    
    // Row 4: IBAN (if exists)
    if (invoice.company?.iban) {
      page2.drawLine({ start: { x: leftX, y: contentY + 25 }, end: { x: rightX, y: contentY + 25 }, thickness: 1 });
      page2.drawText('IBAN', { x: leftX, y: contentY, size: 10, font: fontBold });
      const ibanWidth = font.widthOfTextAtSize(invoice.company.iban, 11);
      page2.drawText(invoice.company.iban, { x: rightX - ibanWidth, y: contentY, size: 11, font });
      contentY -= lineHeight;
    }
    
    // Row 5: BIC (if exists)
    if (invoice.company?.bic) {
      page2.drawLine({ start: { x: leftX, y: contentY + 25 }, end: { x: rightX, y: contentY + 25 }, thickness: 1 });
      page2.drawText('BIC', { x: leftX, y: contentY, size: 10, font: fontBold });
      const bicWidth = font.widthOfTextAtSize(invoice.company.bic, 11);
      page2.drawText(invoice.company.bic, { x: rightX - bicWidth, y: contentY, size: 11, font });
      contentY -= lineHeight;
    }
    
    // Row 6: Reference (always last, inside box)
    page2.drawLine({ start: { x: leftX, y: contentY + 25 }, end: { x: rightX, y: contentY + 25 }, thickness: 1 });
    page2.drawText('REFERENCE', { x: leftX, y: contentY, size: 10, font: fontBold });
    const refWidth = font.widthOfTextAtSize(invoice.invoice_number, 11);
    page2.drawText(invoice.invoice_number, { x: rightX - refWidth, y: contentY, size: 11, font });
    
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
