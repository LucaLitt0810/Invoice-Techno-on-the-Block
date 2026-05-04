import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { rejection_reason } = await request.json();
    
    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`*, company:companies(*), customer:customers(*)`)
      .eq('id', params.id)
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Update contract status to rejected
    await supabase.from('contracts').update({ 
      status: 'rejected',
      rejection_reason: rejection_reason || null,
      rejected_at: new Date().toISOString()
    }).eq('id', params.id);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('de-DE') : '-';
    
    // Page 1 - Rejection Letter
    const page = pdfDoc.addPage([595.28, 841.89]);
    let y = 800;
    
    // Brand Header (left)
    page.drawText('Techno on the Block', { x: 50, y, size: 14, font: fontBold });
    page.drawText('Workspace', { x: 50, y: y - 15, size: 10, font });
    
    // Title (right) - BOOKING REJECTION
    const titleText = 'BOOKING REJECTION';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, 22);
    page.drawText(titleText, { x: 545 - titleWidth, y, size: 22, font: fontBold });
    
    const contractNumText = `Contract No. ${contract.contract_number}`;
    const numWidth = font.widthOfTextAtSize(contractNumText, 10);
    page.drawText(contractNumText, { x: 545 - numWidth, y: y - 20, size: 10, font });
    
    // Divider
    y = 750;
    page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 2 });
    
    // Company Logo (if exists)
    if (contract.company?.logo_url) {
      try {
        const logoUrl = contract.company.logo_url.startsWith('http') 
          ? contract.company.logo_url 
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${contract.company.logo_url}`;
        
        const logoResponse = await fetch(logoUrl);
        if (logoResponse.ok) {
          const logoBytes = await logoResponse.arrayBuffer();
          const logoImage = await pdfDoc.embedPng(logoBytes).catch(() => pdfDoc.embedJpg(logoBytes));
          
          const logoWidth = 70;
          const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
          y -= 30;
          page.drawImage(logoImage, { x: 50, y: y - logoHeight + 10, width: logoWidth, height: logoHeight });
          y -= logoHeight + 5;
        }
      } catch (e) {
        y -= 30;
      }
    } else {
      y -= 30;
    }
    
    // Sender (Company)
    y -= 15;
    page.drawText(contract.company?.street || '', { x: 50, y, size: 10, font });
    y -= 12;
    page.drawText(`${contract.company?.postal_code || ''} ${contract.company?.city || ''}`, { x: 50, y, size: 10, font });
    y -= 12;
    page.drawText(contract.company?.country || '', { x: 50, y, size: 10, font });
    y -= 25;
    page.drawText(`Email: ${contract.company?.email || ''}`, { x: 50, y, size: 9, font });
    
    // Date
    y -= 40;
    page.drawText(formatDate(new Date().toISOString()), { x: 50, y, size: 10, font });
    
    // Recipient (Customer)
    y -= 40;
    page.drawText(contract.customer?.company_name || '', { x: 50, y, size: 11, font: fontBold });
    y -= 15;
    if (contract.customer?.contact_person) {
      page.drawText(`Attn: ${contract.customer.contact_person}`, { x: 50, y, size: 10, font });
      y -= 12;
    }
    page.drawText(contract.customer?.street || '', { x: 50, y, size: 10, font });
    y -= 12;
    page.drawText(`${contract.customer?.postal_code || ''} ${contract.customer?.city || ''}`, { x: 50, y, size: 10, font });
    y -= 12;
    page.drawText(contract.customer?.country || '', { x: 50, y, size: 10, font });
    
    // Subject
    y -= 50;
    page.drawText('RE: Booking Request', { x: 50, y, size: 11, font: fontBold });
    y -= 25;
    page.drawText(`Contract No.: ${contract.contract_number}`, { x: 50, y, size: 10, font });
    y -= 12;
    page.drawText(`Event: ${contract.title}`, { x: 50, y, size: 10, font });
    y -= 12;
    page.drawText(`Date: ${formatDate(contract.event_date)}`, { x: 50, y, size: 10, font });
    
    // Salutation
    y -= 50;
    page.drawText('Dear Sir or Madam,', { x: 50, y, size: 10, font });
    
    // Body
    y -= 30;
    const openingText = `Thank you for your interest in booking our services for your event "${contract.title}" on ${formatDate(contract.event_date)}.`;
    page.drawText(openingText, { x: 50, y, size: 10, font });
    
    y -= 25;
    page.drawText('After careful consideration, we regret to inform you that we must decline your booking request.', { x: 50, y, size: 10, font });
    
    // Rejection Reason (if provided)
    if (rejection_reason) {
      y -= 30;
      page.drawText('Reason:', { x: 50, y, size: 10, font: fontBold });
      y -= 20;
      
      const words = rejection_reason.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line + word + ' ';
        if (testLine.length > 85 && line !== '') {
          page.drawText(line.trim(), { x: 70, y, size: 10, font });
          y -= 14;
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      if (line.trim()) {
        page.drawText(line.trim(), { x: 70, y, size: 10, font });
      }
    }
    
    // Closing
    y -= 40;
    page.drawText('We appreciate your interest in our services and hope to have the opportunity', { x: 50, y, size: 10, font });
    y -= 14;
    page.drawText('to work with you on future projects.', { x: 50, y, size: 10, font });
    
    y -= 30;
    page.drawText('Should you have any questions, please do not hesitate to contact us.', { x: 50, y, size: 10, font });
    
    // Signature
    y -= 50;
    page.drawText('Best regards,', { x: 50, y, size: 10, font });
    y -= 40;
    page.drawText(contract.company?.name || '', { x: 50, y, size: 11, font: fontBold });
    
    // Footer
    y = 100;
    page.drawLine({ start: { x: 50, y }, end: { x: 530, y }, thickness: 0.3 });
    y -= 15;
    page.drawText(`${contract.company?.name} | ${contract.company?.street} | ${contract.company?.postal_code} ${contract.company?.city}`, { x: 50, y, size: 8, font });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rejection-${contract.contract_number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating rejection letter:', error);
    return NextResponse.json({ error: 'Failed to generate rejection letter', details: error.message }, { status: 500 });
  }
}
