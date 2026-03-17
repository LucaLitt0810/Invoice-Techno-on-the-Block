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
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;

    // Header
    page.drawText(contract.contract_type === 'booking_confirmation' ? 'BOOKING CONFIRMATION' : 'BOOKING OFFER', {
      x: 50, y, size: 24, font: fontBold
    });
    y -= 30;
    page.drawText(`Contract No. ${contract.contract_number}`, { x: 50, y, size: 10, font });
    y -= 50;

    // Parties
    page.drawText('PROVIDER', { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('CLIENT', { x: 300, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 20;
    
    page.drawText(contract.company?.name || '', { x: 50, y, size: 13, font: fontBold });
    page.drawText(contract.customer?.company_name || '', { x: 300, y, size: 13, font: fontBold });
    y -= 15;
    
    page.drawText(contract.company?.street || '', { x: 50, y, size: 10, font });
    page.drawText(contract.customer?.street || '', { x: 300, y, size: 10, font });
    y -= 15;
    
    page.drawText(`${contract.company?.postal_code || ''} ${contract.company?.city || ''}`, { x: 50, y, size: 10, font });
    page.drawText(`${contract.customer?.postal_code || ''} ${contract.customer?.city || ''}`, { x: 300, y, size: 10, font });
    y -= 30;

    // Subject
    page.drawText('SUBJECT', { x: 50, y, size: 14, font: fontBold });
    y -= 25;
    page.drawText(contract.title, { x: 50, y, size: 14, font: fontBold });
    y -= 40;

    // Event Details
    page.drawText('EVENT DETAILS', { x: 50, y, size: 14, font: fontBold });
    y -= 25;
    page.drawText(`Event Date: ${contract.event_date ? new Date(contract.event_date).toLocaleDateString('de-DE') : '-'}`, { x: 50, y, size: 11, font });
    y -= 15;
    page.drawText(`Location: ${contract.event_location || 'TBD'}`, { x: 50, y, size: 11, font });
    y -= 15;
    page.drawText(`Valid Until: ${contract.valid_until ? new Date(contract.valid_until).toLocaleDateString('de-DE') : '-'}`, { x: 50, y, size: 11, font });
    y -= 40;

    // Payment Terms
    page.drawText('PAYMENT TERMS', { x: 50, y, size: 14, font: fontBold });
    y -= 25;
    
    const currency = contract.currency || 'EUR';
    const formatCurrency = (amount: number) => `${amount.toFixed(2)} ${currency}`;
    
    page.drawText(`Total Fee: ${formatCurrency(contract.fee)}`, { x: 50, y, size: 11, font });
    y -= 15;
    page.drawText(`Deposit: ${formatCurrency(contract.deposit || 0)}`, { x: 50, y, size: 11, font });
    y -= 15;
    page.drawText(`Final Payment: ${formatCurrency(contract.fee - (contract.deposit || 0))}`, { x: 50, y, size: 11, font });
    y -= 40;

    // Terms
    if (contract.cancellation_terms) {
      page.drawText('CANCELLATION TERMS', { x: 50, y, size: 14, font: fontBold });
      y -= 25;
      const lines = contract.cancellation_terms.split('\n');
      for (const line of lines.slice(0, 10)) {
        page.drawText(line, { x: 50, y, size: 10, font });
        y -= 12;
      }
      y -= 20;
    }

    // Signatures
    if (y < 150) {
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      y = newPage.getSize().height - 50;
    }
    
    page.drawText('SIGNATURES', { x: 50, y, size: 14, font: fontBold });
    y -= 60;
    page.drawLine({ start: { x: 50, y }, end: { x: 250, y }, thickness: 1, color: rgb(0, 0, 0) });
    page.drawLine({ start: { x: 300, y }, end: { x: 500, y }, thickness: 1, color: rgb(0, 0, 0) });
    y -= 15;
    page.drawText(contract.company?.name || '', { x: 50, y, size: 10, font });
    page.drawText(contract.customer?.company_name || '', { x: 300, y, size: 10, font });

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
