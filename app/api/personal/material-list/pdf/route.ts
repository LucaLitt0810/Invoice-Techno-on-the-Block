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
    const margin = 36;
    const usableWidth = width - margin * 2;

    // Column widths that sum to usableWidth
    const colWidths = [150, 200, 130, 130, usableWidth - 150 - 200 - 130 - 130];
    const rowHeight = 28;
    const headerHeight = 26;

    const headers = ['Name', 'Gegenstaende', 'Unterschrift Ausgabe', 'Unterschrift Abgabe', 'Notizen'];

    const matList = (materials || []).map((m: any) => `${m.name} (${m.quantity} ${m.unit})`).join('  |  ');

    let page = pdfDoc.addPage([width, height]);

    // ===== PAGE HEADER (drawn on every page) =====
    const drawPageHeader = (p: typeof page) => {
      let py = height - margin;

      // Black header bar
      p.drawRectangle({
        x: margin,
        y: py - 40,
        width: usableWidth,
        height: 40,
        color: rgb(0.12, 0.12, 0.12),
      });

      p.drawText('TECHNO ON THE BLOCK', {
        x: margin + 12,
        y: py - 22,
        size: 14,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      p.drawText('Vereinshausstrasse 10, 4133 Pratteln', {
        x: margin + 12,
        y: py - 34,
        size: 7,
        font,
        color: rgb(0.7, 0.7, 0.7),
      });

      py -= 56;

      // Title
      p.drawText('MATERIALLISTE', {
        x: margin,
        y: py,
        size: 18,
        font: fontBold,
        color: rgb(0.12, 0.12, 0.12),
      });
      py -= 20;

      // Event + Date
      p.drawText(`Event: ${eventName}  |  Datum: ${eventDate}`, {
        x: margin,
        y: py,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      py -= 16;

      // Materials legend
      if (matList) {
        p.drawText('Materialien:', {
          x: margin,
          y: py,
          size: 7,
          font: fontBold,
          color: rgb(0.3, 0.3, 0.3),
        });
        py -= 10;
        p.drawText(matList.substring(0, 200), {
          x: margin,
          y: py,
          size: 6,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        if (matList.length > 200) {
          py -= 9;
          p.drawText(matList.substring(200, 400), {
            x: margin,
            y: py,
            size: 6,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
        }
        py -= 14;
      } else {
        py -= 10;
      }

      return py;
    };

    // ===== TABLE HEADER =====
    const drawTableHeader = (p: typeof page, py: number) => {
      p.drawRectangle({
        x: margin,
        y: py - headerHeight,
        width: usableWidth,
        height: headerHeight,
        color: rgb(0.18, 0.18, 0.18),
      });

      let x = margin + 6;
      for (let i = 0; i < headers.length; i++) {
        p.drawText(headers[i], {
          x,
          y: py - headerHeight + 8,
          size: 8,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        x += colWidths[i];
      }
      return py - headerHeight;
    };

    // ===== TABLE ROW =====
    const drawRow = (p: typeof page, py: number, emp: any, index: number) => {
      const bg = index % 2 === 0 ? rgb(0.97, 0.97, 0.97) : rgb(1, 1, 1);
      p.drawRectangle({
        x: margin,
        y: py - rowHeight,
        width: usableWidth,
        height: rowHeight,
        color: bg,
      });

      // Vertical lines (between columns only, not after last)
      let x = margin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        x += colWidths[i];
        p.drawLine({
          start: { x, y: py },
          end: { x, y: py - rowHeight },
          thickness: 0.3,
          color: rgb(0.8, 0.8, 0.8),
        });
      }

      // Name
      const fullName = `${emp.last_name}, ${emp.first_name}`;
      p.drawText(fullName, {
        x: margin + 6,
        y: py - rowHeight + 10,
        size: 9,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });

      // Assigned materials for this employee
      const empAssignments = (assignments || []).filter((a: any) => a.employee_id === emp.id && !a.returned_at);
      const matText = empAssignments.length > 0
        ? empAssignments.map((a: any) => `${a.material?.name} (${a.quantity})`).join(', ')
        : '';

      if (matText) {
        const maxMatWidth = colWidths[1] - 12;
        const words = matText.split(' ');
        let line = '';
        let lineY = py - rowHeight + 10;
        for (const word of words) {
          const test = line + (line ? ' ' : '') + word;
          if (font.widthOfTextAtSize(test, 7) > maxMatWidth && line) {
            p.drawText(line, { x: margin + colWidths[0] + 6, y: lineY, size: 7, font, color: rgb(0.3, 0.3, 0.3) });
            lineY -= 9;
            line = word;
          } else {
            line = test;
          }
        }
        if (line) {
          p.drawText(line, { x: margin + colWidths[0] + 6, y: lineY, size: 7, font, color: rgb(0.3, 0.3, 0.3) });
        }
      }

      // Signature lines (near bottom of cell)
      const sigY = py - rowHeight + 7;
      const sigPad = 16;
      p.drawLine({
        start: { x: margin + colWidths[0] + colWidths[1] + sigPad, y: sigY },
        end: { x: margin + colWidths[0] + colWidths[1] + colWidths[2] - sigPad, y: sigY },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
      p.drawLine({
        start: { x: margin + colWidths[0] + colWidths[1] + colWidths[2] + sigPad, y: sigY },
        end: { x: margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] - sigPad, y: sigY },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });

      return py - rowHeight;
    };

    // ===== BUILD PAGES =====
    let y = drawPageHeader(page);
    y = drawTableHeader(page, y);

    for (let i = 0; i < (employees || []).length; i++) {
      const emp = employees![i];
      if (y - rowHeight < margin + 20) {
        // Footer
        page.drawText(`Seite ${pdfDoc.getPageCount()}`, {
          x: width / 2 - 15,
          y: 14,
          size: 7,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        // New page
        page = pdfDoc.addPage([width, height]);
        y = drawPageHeader(page);
        y = drawTableHeader(page, y);
      }
      y = drawRow(page, y, emp, i);
    }

    // Bottom border + footer on last page
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });

    page.drawText(`Seite ${pdfDoc.getPageCount()}`, {
      x: width / 2 - 15,
      y: 14,
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
