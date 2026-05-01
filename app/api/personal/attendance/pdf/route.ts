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

    const width = 595.28;  // A4 Portrait
    const height = 841.89;
    const margin = 40;
    const usableWidth = width - margin * 2;

    const colWidths = [240, 80, 80, 110];
    const rowHeight = 30;
    const headerHeight = 30;

    const headers = ['Name', 'Anwesend', 'Abwesend', 'Bemerkung'];

    let page = pdfDoc.addPage([width, height]);

    // ===== PAGE HEADER (drawn on every page) =====
    const drawPageHeader = (p: typeof page) => {
      let py = height - margin;

      // Black header bar
      p.drawRectangle({
        x: margin,
        y: py - 42,
        width: usableWidth,
        height: 42,
        color: rgb(0.12, 0.12, 0.12),
      });

      p.drawText('TECHNO ON THE BLOCK', {
        x: margin + 10,
        y: py - 24,
        size: 15,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      p.drawText('Vereinshausstrasse 10, 4133 Pratteln', {
        x: margin + 10,
        y: py - 37,
        size: 7,
        font,
        color: rgb(0.7, 0.7, 0.7),
      });

      py -= 56;

      // Title
      p.drawText('ANWESENHEITSLISTE', {
        x: margin,
        y: py,
        size: 18,
        font: fontBold,
        color: rgb(0.12, 0.12, 0.12),
      });
      py -= 18;

      // Event + Date on one line
      p.drawText(`Event: ${eventName}`, {
        x: margin,
        y: py,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      p.drawText(`Datum: ${eventDate}`, {
        x: margin + 200,
        y: py,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });

      return py - 18;
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

      let x = margin + 8;
      for (let i = 0; i < headers.length; i++) {
        p.drawText(headers[i], {
          x,
          y: py - headerHeight + 9,
          size: 9,
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

      // Vertical lines
      let x = margin;
      for (let i = 0; i < colWidths.length; i++) {
        x += colWidths[i];
        p.drawLine({
          start: { x, y: py },
          end: { x, y: py - rowHeight },
          thickness: 0.3,
          color: rgb(0.85, 0.85, 0.85),
        });
      }

      // Name
      const fullName = `${emp.last_name}, ${emp.first_name}`;
      p.drawText(fullName, {
        x: margin + 8,
        y: py - rowHeight + 10,
        size: 9,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });

      // Centered checkbox for Anwesend
      const cbSize = 12;
      const cbX1 = margin + colWidths[0] + (colWidths[1] - cbSize) / 2;
      p.drawRectangle({
        x: cbX1,
        y: py - rowHeight + (rowHeight - cbSize) / 2,
        width: cbSize,
        height: cbSize,
        borderWidth: 0.8,
        borderColor: rgb(0.4, 0.4, 0.4),
      });

      // Centered checkbox for Abwesend
      const cbX2 = margin + colWidths[0] + colWidths[1] + (colWidths[2] - cbSize) / 2;
      p.drawRectangle({
        x: cbX2,
        y: py - rowHeight + (rowHeight - cbSize) / 2,
        width: cbSize,
        height: cbSize,
        borderWidth: 0.8,
        borderColor: rgb(0.4, 0.4, 0.4),
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
        'Content-Disposition': `attachment; filename="Anwesenheitsliste_${eventName.replace(/\s+/g, '_')}_${eventDate.replace(/\./g, '_')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating attendance PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
