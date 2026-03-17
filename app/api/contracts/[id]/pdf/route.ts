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
    
    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`*, company:companies(*), customer:customers(*)`)
      .eq('id', params.id)
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    let y = height - 40;
    const currency = contract.currency || 'EUR';
    const primaryColor = rgb(0.23, 0.51, 0.96);
    const darkColor = rgb(0.1, 0.1, 0.1);
    const grayColor = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.95, 0.95, 0.95);

    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        'booking_offer': 'BOOKING OFFER',
        'booking_confirmation': 'BOOKING CONFIRMATION',
        'booking_rejection': 'BOOKING INFORMATION',
        'custom': 'CONTRACT',
      };
      return labels[type] || 'CONTRACT';
    };

    // Header Background
    page.drawRectangle({
      x: 0, y: height - 130, width: width, height: 130,
      color: lightGray,
    });

    // Brand
    page.drawText('Techno on the Block', { 
      x: 50, y: height - 60, size: 18, font: fontBold, color: primaryColor 
    });
    page.drawText('Invoice Center', { x: 50, y: height - 80, size: 11, font, color: darkColor });

    // Contract Type
    page.drawText(getTypeLabel(contract.contract_type), { 
      x: 320, y: height - 70, size: 26, font: fontBold, color: darkColor 
    });
    page.drawText(`Contract No. ${contract.contract_number}`, { 
      x: 320, y: height - 95, size: 10, font, color: grayColor 
    });

    // Parties Section
    y = height - 160;
    
    // Provider Box
    page.drawRectangle({
      x: 45, y: y - 5, width: 240, height: 110,
      borderColor: primaryColor, borderWidth: 2, color: rgb(1, 1, 1),
    });
    page.drawText('PROVIDER', { x: 55, y: y + 85, size: 8, font, color: primaryColor });
    page.drawText(contract.company?.name || '', { x: 55, y: y + 65, size: 12, font: fontBold });
    page.drawText(contract.company?.street || '', { x: 55, y: y + 48, size: 10, font });
    page.drawText(`${contract.company?.postal_code || ''} ${contract.company?.city || ''}`, { x: 55, y: y + 33, size: 10, font });
    page.drawText(contract.company?.email || '', { x: 55, y: y + 18, size: 9, font, color: grayColor });

    // Client Box
    page.drawRectangle({
      x: 305, y: y - 5, width: 240, height: 110,
      borderColor: grayColor, borderWidth: 1, color: rgb(1, 1, 1),
    });
    page.drawText('CLIENT', { x: 315, y: y + 85, size: 8, font, color: grayColor });
    page.drawText(contract.customer?.company_name || '', { x: 315, y: y + 65, size: 12, font: fontBold });
    page.drawText(contract.customer?.street || '', { x: 315, y: y + 48, size: 10, font });
    page.drawText(`${contract.customer?.postal_code || ''} ${contract.customer?.city || ''}`, { x: 315, y: y + 33, size: 10, font });
    page.drawText(contract.customer?.email || '', { x: 315, y: y + 18, size: 9, font, color: grayColor });

    // Subject Section
    y -= 140;
    page.drawRectangle({
      x: 50, y: y - 60, width: 495, height: 65,
      color: lightGray,
    });
    page.drawText('SUBJECT', { x: 60, y: y, size: 10, font: fontBold, color: primaryColor });
    page.drawText(contract.title, { x: 60, y: y - 25, size: 13, font: fontBold });
    
    if (contract.event_description) {
      const desc = contract.event_description.substring(0, 70);
      page.drawText(desc, { x: 60, y: y - 45, size: 9, font, color: grayColor });
    }

    // Event Details
    y -= 90;
    page.drawText('EVENT DETAILS', { x: 50, y, size: 12, font: fontBold, color: primaryColor });
    y -= 25;
    
    const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('de-DE') : '-';
    
    page.drawText('Event Date:', { x: 50, y, size: 9, font, color: grayColor });
    page.drawText(formatDate(contract.event_date), { x: 130, y, size: 11, font: fontBold });
    page.drawText('Location:', { x: 250, y, size: 9, font, color: grayColor });
    page.drawText(contract.event_location || 'TBD', { x: 320, y, size: 11, font: fontBold });
    page.drawText('Valid Until:', { x: 400, y, size: 9, font, color: grayColor });
    page.drawText(formatDate(contract.valid_until), { x: 480, y, size: 11, font: fontBold });

    // Payment Terms
    y -= 50;
    page.drawText('PAYMENT TERMS', { x: 50, y, size: 12, font: fontBold, color: primaryColor });
    
    // Payment Box
    y -= 30;
    page.drawRectangle({ x: 50, y: y - 5, width: 495, height: 80, color: lightGray });
    
    const formatCurrency = (amount: number) => `${amount.toFixed(2)} ${currency}`;
    
    y -= 5;
    page.drawText('Total Fee:', { x: 70, y, size: 10, font, color: grayColor });
    page.drawText(formatCurrency(contract.fee), { x: 180, y, size: 14, font: fontBold });
    
    y -= 25;
    page.drawText('Deposit:', { x: 70, y, size: 10, font, color: grayColor });
    page.drawText(formatCurrency(contract.deposit || 0), { x: 180, y, size: 11, font });
    page.drawText(`Due: ${formatDate(contract.deposit_due)}`, { x: 280, y, size: 9, font, color: grayColor });
    
    y -= 20;
    page.drawText('Final Payment:', { x: 70, y, size: 10, font, color: grayColor });
    page.drawText(formatCurrency(contract.fee - (contract.deposit || 0)), { x: 180, y, size: 11, font });
    page.drawText(`Due: ${formatDate(contract.final_payment_due)}`, { x: 280, y, size: 9, font, color: grayColor });

    // Terms & Conditions
    y -= 60;
    if (contract.cancellation_terms && y > 200) {
      page.drawText('CANCELLATION TERMS', { x: 50, y, size: 12, font: fontBold, color: primaryColor });
      y -= 20;
      const lines = contract.cancellation_terms.split('\n').slice(0, 4);
      for (const line of lines) {
        page.drawText(line.substring(0, 80), { x: 50, y, size: 9, font });
        y -= 14;
      }
    }

    // Signatures on new page if needed
    if (y < 200) {
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      y = newPage.getSize().height - 80;
      
      newPage.drawText('SIGNATURES', { x: 50, y, size: 14, font: fontBold, color: primaryColor });
      y -= 40;
      
      newPage.drawLine({ start: { x: 50, y }, end: { x: 250, y }, thickness: 1, color: darkColor });
      newPage.drawLine({ start: { x: 320, y }, end: { x: 520, y }, thickness: 1, color: darkColor });
      y -= 15;
      newPage.drawText(contract.company?.name || 'Provider', { x: 50, y, size: 10, font: fontBold });
      newPage.drawText(contract.customer?.company_name || 'Client', { x: 320, y, size: 10, font: fontBold });
      y -= 12;
      newPage.drawText('Date: _______________', { x: 50, y, size: 9, font, color: grayColor });
      newPage.drawText('Date: _______________', { x: 320, y, size: 9, font, color: grayColor });
      
      // Footer
      newPage.drawText('This contract was generated electronically.', { 
        x: 50, y: 50, size: 8, font: fontOblique, color: grayColor 
      });
    } else {
      y -= 40;
      page.drawText('SIGNATURES', { x: 50, y, size: 14, font: fontBold, color: primaryColor });
      y -= 40;
      page.drawLine({ start: { x: 50, y }, end: { x: 250, y }, thickness: 1, color: darkColor });
      page.drawLine({ start: { x: 320, y }, end: { x: 520, y }, thickness: 1, color: darkColor });
      y -= 15;
      page.drawText(contract.company?.name || 'Provider', { x: 50, y, size: 10, font: fontBold });
      page.drawText(contract.customer?.company_name || 'Client', { x: 320, y, size: 10, font: fontBold });
      y -= 12;
      page.drawText('Date: _______________', { x: 50, y, size: 9, font, color: grayColor });
      page.drawText('Date: _______________', { x: 320, y, size: 9, font, color: grayColor });
      
      page.drawText('This contract was generated electronically.', { 
        x: 50, y: 50, size: 8, font: fontOblique, color: grayColor 
      });
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Contract-${contract.contract_number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF', details: error.message }, { status: 500 });
  }
}
