import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const eventName = searchParams.get('event') || 'Event';
    const eventDate = searchParams.get('date') || new Date().toLocaleDateString('de-DE');

    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .order('last_name');

    if (error) throw error;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const width = 595.28;
    const height = 841.89;
    const margin = 50;
    const tableTop = height - margin - 80;
    const colWidths = [220, 70, 70, 155];
    const rowHeight = 32;
    const headerHeight = 36;

    let page = pdfDoc.addPage([width, height]);

    // Header box
    page.drawRectangle({
      x: margin,
      y: height - margin - 60,
      width: width - margin * 2,
      height: 50,
      color: rgb(0.12, 0.12, 0.12),
    });

    page.drawText('TECHNO ON THE BLOCK', {
      x: margin + 12,
      y: height - margin - 30,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('Vereinshausstrasse 10, 4133 Pratteln', {
      x: margin + 12,
      y: height - margin - 46,
      size: 8,
      font,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Title
    page.drawText('ANWESENHEITSLISTE', {
      x: margin,
      y: tableTop + 10,
      size: 18,
      font: fontBold,
      color: rgb(0.12, 0.12, 0.12),
    });

    // Event info
    page.drawText(`Event: ${eventName}`, {
      x: margin,
      y: tableTop - 10,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(`Datum: ${eventDate}`, {
      x: 250,
      y: tableTop - 10,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    let y = tableTop - 40;

    // Draw table header
    const drawHeader = (p: typeof page, yPos: number) => {
      p.drawRectangle({
        x: margin,
        y: yPos - headerHeight,
        width: width - margin * 2,
        height: headerHeight,
        color: rgb(0.18, 0.18, 0.18),
      });

      const headers = ['Name', 'Anwesend', 'Abwesend', 'Bemerkung'];
      let x = margin + 8;
      for (let i = 0; i < headers.length; i++) {
        p.drawText(headers[i], {
          x,
          y: yPos - headerHeight + 12,
          size: 9,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        x += colWidths[i];
      }
    };

    const drawRow = (p: typeof page, yPos: number, emp: any, index: number) => {
      const bg = index % 2 === 0 ? rgb(0.97, 0.97, 0.97) : rgb(1, 1, 1);
      p.drawRectangle({
        x: margin,
        y: yPos - rowHeight,
        width: width - margin * 2,
        height: rowHeight,
        color: bg,
      });

      // Vertical lines
      let x = margin;
      for (let i = 0; i < colWidths.length; i++) {
        x += colWidths[i];
        p.drawLine({
          start: { x, y: yPos },
          end: { x, y: yPos - rowHeight },
          thickness: 0.3,
          color: rgb(0.85, 0.85, 0.85),
        });
      }

      // Data
      const fullName = `${emp.last_name}, ${emp.first_name}`;
      p.drawText(fullName, {
        x: margin + 8,
        y: yPos - rowHeight + 11,
        size: 9,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });

      // Checkbox for Anwesend
      p.drawRectangle({
        x: margin + colWidths[0] + 22,
        y: yPos - rowHeight + 8,
        width: 14,
        height: 14,
        borderWidth: 0.8,
        borderColor: rgb(0.5, 0.5, 0.5),
      });

      // Checkbox for Abwesend
      p.drawRectangle({
        x: margin + colWidths[0] + colWidths[1] + 22,
        y: yPos - rowHeight + 8,
        width: 14,
        height: 14,
        borderWidth: 0.8,
        borderColor: rgb(0.5, 0.5, 0.5),
      });
    };

    drawHeader(page, y);
    y -= headerHeight;

    for (let i = 0; i < (employees || []).length; i++) {
      const emp = employees![i];
      if (y - rowHeight < margin + 30) {
        // Footer on current page
        page.drawText(`Seite ${pdfDoc.getPageCount()}`, {
          x: width / 2 - 15,
          y: 20,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        page = pdfDoc.addPage([width, height]);
        y = height - margin - 20;
        drawHeader(page, y);
        y -= headerHeight;
      }
      drawRow(page, y, emp, i);
      y -= rowHeight;
    }

    // Bottom border line
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Footer on last page
    page.drawText(`Seite ${pdfDoc.getPageCount()}`, {
      x: width / 2 - 15,
      y: 20,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Anwesenheitsliste_${eventName.replace(/\s+/g, '_')}_${eventDate.replace(/\./g, '_')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating attendance PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
