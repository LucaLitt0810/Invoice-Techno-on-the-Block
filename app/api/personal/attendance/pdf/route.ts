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

    // Columns that sum exactly to usableWidth
    const colWidths = [260, 80, 80, usableWidth - 260 - 80 - 80];
    const rowHeight = 28;
    const headerHeight = 26;

    const headers = ['Name', 'Anwesend', 'Abwesend', 'Bemerkung'];

    let page = pdfDoc.addPage([width, height]);

    // Helper: draw page header, returns the y position where table should start
    const drawPageHeader = (p: typeof page): number => {
      const top = height - margin;

      // Black header bar: from top-42 to top
      p.drawRectangle({
        x: margin,
        y: top - 42,
        width: usableWidth,
        height: 42,
        color: rgb(0.12, 0.12, 0.12),
      });

      p.drawText('TECHNO ON THE BLOCK', {
        x: margin + 10,
        y: top - 24,
        size: 15,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      p.drawText('Vereinshausstrasse 10, 4133 Pratteln', {
        x: margin + 10,
        y: top - 36,
        size: 7,
        font,
        color: rgb(0.7, 0.7, 0.7),
      });

      // Title: 26px below the black bar
      const titleY = top - 42 - 26;
      p.drawText('ANWESENHEITSLISTE', {
        x: margin,
        y: titleY,
        size: 18,
        font: fontBold,
        color: rgb(0.12, 0.12, 0.12),
      });

      // Event + Date: 18px below title
      const infoY = titleY - 18;
      p.drawText(`Event: ${eventName}`, {
        x: margin,
        y: infoY,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      p.drawText(`Datum: ${eventDate}`, {
        x: margin + 220,
        y: infoY,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Return y where table header should start (16px below info line)
      return infoY - 16;
    };

    // Helper: draw table header row
    const drawTableHeader = (p: typeof page, y: number): number => {
      p.drawRectangle({
        x: margin,
        y: y - headerHeight,
        width: usableWidth,
        height: headerHeight,
        color: rgb(0.18, 0.18, 0.18),
      });

      let x = margin + 8;
      for (let i = 0; i < headers.length; i++) {
        p.drawText(headers[i], {
          x,
          y: y - headerHeight + 8,
          size: 9,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        x += colWidths[i];
      }
      return y - headerHeight;
    };

    // Helper: draw one data row
    const drawRow = (p: typeof page, y: number, emp: any, index: number): number => {
      const bg = index % 2 === 0 ? rgb(0.97, 0.97, 0.97) : rgb(1, 1, 1);
      p.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: usableWidth,
        height: rowHeight,
        color: bg,
      });

      // Vertical lines between columns only (not after last)
      let x = margin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        x += colWidths[i];
        p.drawLine({
          start: { x, y },
          end: { x, y: y - rowHeight },
          thickness: 0.3,
          color: rgb(0.85, 0.85, 0.85),
        });
      }

      // Name
      const fullName = `${emp.last_name}, ${emp.first_name}`;
      p.drawText(fullName, {
        x: margin + 8,
        y: y - rowHeight + 9,
        size: 9,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });

      // Centered checkbox for Anwesend
      const cbSize = 12;
      const cbX1 = margin + colWidths[0] + (colWidths[1] - cbSize) / 2;
      const cbY = y - rowHeight + (rowHeight - cbSize) / 2;
      p.drawRectangle({
        x: cbX1,
        y: cbY,
        width: cbSize,
        height: cbSize,
        borderWidth: 0.8,
        borderColor: rgb(0.4, 0.4, 0.4),
      });

      // Centered checkbox for Abwesend
      const cbX2 = margin + colWidths[0] + colWidths[1] + (colWidths[2] - cbSize) / 2;
      p.drawRectangle({
        x: cbX2,
        y: cbY,
        width: cbSize,
        height: cbSize,
        borderWidth: 0.8,
        borderColor: rgb(0.4, 0.4, 0.4),
      });

      return y - rowHeight;
    };

    // ===== BUILD PAGES =====
    let y = drawPageHeader(page);
    y = drawTableHeader(page, y);

    for (let i = 0; i < (employees || []).length; i++) {
      const emp = employees![i];
      // Check if row fits
      if (y - rowHeight < margin + 20) {
        // Footer on current page
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

    // Bottom border line
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });

    // Footer on last page
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
