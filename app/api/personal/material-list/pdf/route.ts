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

    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .order('last_name');

    if (empError) throw empError;

    const { data: materials, error: matError } = await supabase
      .from('materials')
      .select('*')
      .order('name');

    if (matError) throw matError;

    const { data: assignments, error: assignError } = await supabase
      .from('material_assignments')
      .select('*, material:materials(*), employee:employees(*)');

    if (assignError) throw assignError;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const width = 841.89; // Landscape A4
    const height = 595.28;
    const margin = 40;

    let page = pdfDoc.addPage([width, height]);

    // Header
    page.drawRectangle({
      x: margin,
      y: height - margin - 45,
      width: width - margin * 2,
      height: 40,
      color: rgb(0.12, 0.12, 0.12),
    });

    page.drawText('TECHNO ON THE BLOCK', {
      x: margin + 12,
      y: height - margin - 22,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('Vereinshausstrasse 10, 4133 Pratteln', {
      x: margin + 12,
      y: height - margin - 35,
      size: 7,
      font,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Title
    page.drawText('MATERIALLISTE', {
      x: margin,
      y: height - margin - 70,
      size: 18,
      font: fontBold,
      color: rgb(0.12, 0.12, 0.12),
    });

    page.drawText(`Event: ${eventName}  |  Datum: ${eventDate}`, {
      x: margin,
      y: height - margin - 88,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Materials legend
    let matY = height - margin - 105;
    page.drawText('Verfügbare Materialien:', {
      x: margin,
      y: matY,
      size: 8,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    matY -= 14;

    const matList = (materials || []).map((m: any) => `${m.name} (${m.quantity} ${m.unit})`).join('  |  ');
    page.drawText(matList.substring(0, 180), {
      x: margin,
      y: matY,
      size: 7,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    if (matList.length > 180) {
      matY -= 11;
      page.drawText(matList.substring(180, 360), {
        x: margin,
        y: matY,
        size: 7,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // Table
    const tableTop = matY - 18;
    const colWidths = [150, 180, 120, 120, 120];
    const rowHeight = 36;
    const headerHeight = 30;

    const headers = ['Name', 'Gegenstände', 'Unterschrift Ausgabe', 'Unterschrift Abgabe', 'Notizen'];

    const drawHeader = (p: typeof page, yPos: number) => {
      p.drawRectangle({
        x: margin,
        y: yPos - headerHeight,
        width: width - margin * 2,
        height: headerHeight,
        color: rgb(0.18, 0.18, 0.18),
      });

      let x = margin + 8;
      for (let i = 0; i < headers.length; i++) {
        p.drawText(headers[i], {
          x,
          y: yPos - headerHeight + 10,
          size: 8,
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

      // Name
      const fullName = `${emp.last_name}, ${emp.first_name}`;
      p.drawText(fullName, {
        x: margin + 8,
        y: yPos - rowHeight + 12,
        size: 9,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });

      // Assigned materials for this employee
      const empAssignments = (assignments || []).filter((a: any) => a.employee_id === emp.id && !a.returned_at);
      const matText = empAssignments.length > 0
        ? empAssignments.map((a: any) => `${a.material?.name} (${a.quantity})`).join(', ')
        : '';

      // Wrap text for materials column
      const maxMatWidth = colWidths[1] - 16;
      const words = matText.split(' ');
      let line = '';
      let lineY = yPos - rowHeight + 12;
      for (const word of words) {
        const test = line + (line ? ' ' : '') + word;
        if (font.widthOfTextAtSize(test, 8) > maxMatWidth && line) {
          p.drawText(line, { x: margin + colWidths[0] + 8, y: lineY, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
          lineY -= 10;
          line = word;
        } else {
          line = test;
        }
      }
      if (line) {
        p.drawText(line, { x: margin + colWidths[0] + 8, y: lineY, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
      }

      // Signature lines
      const sigY = yPos - rowHeight + 12;
      p.drawLine({
        start: { x: margin + colWidths[0] + colWidths[1] + 10, y: sigY - 2 },
        end: { x: margin + colWidths[0] + colWidths[1] + colWidths[2] - 10, y: sigY - 2 },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
      p.drawLine({
        start: { x: margin + colWidths[0] + colWidths[1] + colWidths[2] + 10, y: sigY - 2 },
        end: { x: margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] - 10, y: sigY - 2 },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
    };

    let y = tableTop;
    drawHeader(page, y);
    y -= headerHeight;

    for (let i = 0; i < (employees || []).length; i++) {
      const emp = employees![i];
      if (y - rowHeight < margin + 20) {
        page.drawText(`Seite ${pdfDoc.getPageCount()}`, {
          x: width / 2 - 15,
          y: 15,
          size: 7,
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

    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    page.drawText(`Seite ${pdfDoc.getPageCount()}`, {
      x: width / 2 - 15,
      y: 15,
      size: 7,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Materialliste_${eventName.replace(/\s+/g, '_')}_${eventDate.replace(/\./g, '_')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating material list PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
