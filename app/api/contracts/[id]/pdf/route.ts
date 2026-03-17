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
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const currency = contract.currency || 'EUR';
    const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('de-DE') : '-';
    const formatCurrency = (amount: number) => `${amount.toFixed(2)} ${currency}`;
    
    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        'booking_offer': 'BOOKING OFFER',
        'booking_confirmation': 'BOOKING CONFIRMATION',
        'booking_rejection': 'BOOKING INFORMATION',
        'custom': 'CONTRACT',
      };
      return labels[type] || 'CONTRACT';
    };

    // Page 1
    const page1 = pdfDoc.addPage([595.28, 841.89]);
    let y = 800;
    
    // Brand Header
    page1.drawText('Techno on the Block', { x: 50, y, size: 14, font: fontBold });
    page1.drawText('Invoice Center', { x: 50, y: y - 15, size: 10, font });
    
    // Contract Type (right)
    page1.drawText(getTypeLabel(contract.contract_type), { x: 320, y, size: 24, font: fontBold });
    page1.drawText(`Contract No. ${contract.contract_number}`, { x: 320, y: y - 20, size: 10, font });
    
    // Divider
    y = 750;
    page1.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 2 });
    
    // Parties
    y -= 40;
    page1.drawText('PROVIDER', { x: 50, y, size: 9, font });
    page1.drawText('CLIENT', { x: 300, y, size: 9, font });
    
    y -= 20;
    page1.drawText(contract.company?.name || '', { x: 50, y, size: 13, font: fontBold });
    page1.drawText(contract.customer?.company_name || '', { x: 300, y, size: 13, font: fontBold });
    
    y -= 15;
    page1.drawText(contract.company?.street || '', { x: 50, y, size: 10, font });
    page1.drawText(contract.customer?.street || '', { x: 300, y, size: 10, font });
    
    y -= 12;
    page1.drawText(`${contract.company?.postal_code || ''} ${contract.company?.city || ''}`, { x: 50, y, size: 10, font });
    page1.drawText(`${contract.customer?.postal_code || ''} ${contract.customer?.city || ''}`, { x: 300, y, size: 10, font });
    
    y -= 12;
    page1.drawText(contract.company?.country || '', { x: 50, y, size: 10, font });
    page1.drawText(contract.customer?.country || '', { x: 300, y, size: 10, font });
    
    y -= 12;
    page1.drawText(contract.company?.email || '', { x: 50, y, size: 9, font });
    page1.drawText(contract.customer?.email || '', { x: 300, y, size: 9, font });
    
    // Subject
    y -= 50;
    page1.drawText('SUBJECT', { x: 50, y, size: 14, font: fontBold });
    y -= 25;
    page1.drawText(contract.title, { x: 50, y, size: 14, font: fontBold });
    
    if (contract.event_description) {
      y -= 20;
      const desc = contract.event_description.length > 100 ? contract.event_description.substring(0, 100) + '...' : contract.event_description;
      page1.drawText(desc, { x: 50, y, size: 10, font });
    }
    
    // Event Details
    y -= 50;
    page1.drawText('EVENT DETAILS', { x: 50, y, size: 14, font: fontBold });
    y -= 25;
    page1.drawText('Event Date:', { x: 50, y, size: 9, font });
    page1.drawText(formatDate(contract.event_date), { x: 130, y, size: 12, font: fontBold });
    page1.drawText('Location:', { x: 250, y, size: 9, font });
    page1.drawText(contract.event_location || 'TBD', { x: 320, y, size: 12, font: fontBold });
    page1.drawText('Valid Until:', { x: 420, y, size: 9, font });
    page1.drawText(formatDate(contract.valid_until), { x: 500, y, size: 12, font: fontBold });
    
    // Payment Terms
    y -= 50;
    page1.drawText('PAYMENT TERMS', { x: 50, y, size: 14, font: fontBold });
    
    // Payment Box
    y -= 30;
    page1.drawRectangle({ x: 50, y: y - 90, width: 495, height: 100, borderWidth: 2, borderColor: rgb(0, 0, 0) });
    
    y -= 20;
    page1.drawText('Total Fee', { x: 70, y, size: 11, font });
    page1.drawText(formatCurrency(contract.fee), { x: 450, y, size: 14, font: fontBold });
    
    y -= 25;
    page1.drawText(`Deposit (${formatDate(contract.deposit_due)})`, { x: 70, y, size: 10, font });
    page1.drawText(formatCurrency(contract.deposit || 0), { x: 450, y, size: 11, font });
    
    y -= 25;
    page1.drawText(`Final Payment (${formatDate(contract.final_payment_due)})`, { x: 70, y, size: 10, font });
    page1.drawText(formatCurrency(contract.fee - (contract.deposit || 0)), { x: 450, y, size: 11, font });
    
    // Terms
    y = 280;
    if (contract.cancellation_terms) {
      page1.drawText('CANCELLATION TERMS', { x: 50, y, size: 12, font: fontBold });
      y -= 20;
      const lines = contract.cancellation_terms.split('\n').slice(0, 5);
      for (const line of lines) {
        page1.drawText(line.substring(0, 90), { x: 50, y, size: 9, font });
        y -= 12;
      }
    }
    
    // Footer
    page1.drawText('This contract was generated electronically.', { x: 50, y: 50, size: 8, font });
    page1.drawText(`Contract created on ${formatDate(contract.created_at)}`, { x: 380, y: 50, size: 8, font });
    
    // Page 2 - Signatures
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    y = 750;
    
    page2.drawText('SIGNATURES', { x: 50, y, size: 16, font: fontBold });
    y -= 80;
    
    // Provider signature
    page2.drawText('PROVIDER', { x: 50, y, size: 9, font });
    y -= 60;
    page2.drawLine({ start: { x: 50, y }, end: { x: 250, y }, thickness: 1 });
    y -= 15;
    page2.drawText(contract.company?.name || '', { x: 50, y, size: 11, font: fontBold });
    y -= 12;
    page2.drawText('Date: ________________', { x: 50, y, size: 9, font });
    
    // Client signature
    y = 670;
    page2.drawText('CLIENT', { x: 300, y, size: 9, font });
    y -= 60;
    page2.drawLine({ start: { x: 300, y }, end: { x: 500, y }, thickness: 1 });
    y -= 15;
    page2.drawText(contract.customer?.company_name || '', { x: 300, y, size: 11, font: fontBold });
    y -= 12;
    page2.drawText('Date: ________________', { x: 300, y, size: 9, font });

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
