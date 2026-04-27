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

    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const width = 595.28;
    const height = 841.89;
    const margin = 72;
    const textWidth = width - margin * 2;
    const bottomMargin = 80;

    let page = pdfDoc.addPage([width, height]);
    let y = height - margin;

    const fullName = `${employee.first_name} ${employee.last_name}`;
    const sigOrt = employee.consent_signature_ort || 'Pratteln';
    const sigDatum = employee.consent_signature_datum
      ? new Date(employee.consent_signature_datum).toLocaleDateString('de-DE')
      : new Date().toLocaleDateString('de-DE');

    const darkGray = rgb(0.2, 0.2, 0.2);
    const mediumGray = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.6, 0.6, 0.6);
    const accentColor = rgb(0.15, 0.15, 0.15);

    const checkPage = (neededSpace: number) => {
      if (y - neededSpace < bottomMargin) {
        drawFooter(page);
        page = pdfDoc.addPage([width, height]);
        y = height - margin;
      }
    };

    const drawFooter = (p: typeof page) => {
      const fy = 40;
      p.drawLine({
        start: { x: margin, y: fy + 14 },
        end: { x: width - margin, y: fy + 14 },
        thickness: 0.5,
        color: lightGray,
      });
      p.drawText('Verein Techno on the Block | Vereinshausstrasse 10 | 4133 Pratteln | Schweiz', {
        x: margin,
        y: fy,
        size: 8,
        font,
        color: lightGray,
      });
    };

    const drawTextWrapped = (text: string, size: number, isBold = false, lineHeight?: number) => {
      const f = isBold ? fontBold : font;
      const lh = lineHeight || size * 1.45;
      const words = text.split(' ');
      let line = '';

      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const testWidth = f.widthOfTextAtSize(testLine, size);
        if (testWidth > textWidth && line) {
          checkPage(lh);
          page.drawText(line, { x: margin, y, size, font: f, color: darkGray });
          y -= lh;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        checkPage(lh);
        page.drawText(line, { x: margin, y, size, font: f, color: darkGray });
        y -= lh;
      }
    };

    const drawLine = (text: string, size: number, isBold = false, textColor = darkGray) => {
      checkPage(size * 1.6);
      const f = isBold ? fontBold : font;
      page.drawText(text, { x: margin, y, size, font: f, color: textColor });
      y -= size * 1.6;
    };

    const drawSpacer = (amount: number) => {
      checkPage(amount);
      y -= amount;
    };

    const drawHLine = () => {
      checkPage(16);
      page.drawLine({
        start: { x: margin, y: y - 6 },
        end: { x: width - margin, y: y - 6 },
        thickness: 1.5,
        color: accentColor,
      });
      y -= 20;
    };

    // Embed signatures
    const embedSignature = async (base64Data: string | null) => {
      if (!base64Data) return null;
      try {
        const base64 = base64Data.replace(/^data:image\/png;base64,/, '');
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        return await pdfDoc.embedPng(bytes);
      } catch {
        return null;
      }
    };

    const sigVereinImg = await embedSignature(employee.consent_signature_verein);
    const sigVertragsnehmerImg = await embedSignature(employee.consent_signature_vertragsnehmer);

    // ==================== HEADER ====================
    page.drawRectangle({
      x: margin - 12,
      y: y - 50,
      width: textWidth + 24,
      height: 56,
      color: accentColor,
    });

    page.drawText('TECHNO ON THE BLOCK', {
      x: margin,
      y: y - 28,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('Vereinshausstrasse 10, 4133 Pratteln, Schweiz', {
      x: margin,
      y: y - 44,
      size: 8,
      font,
      color: rgb(0.7, 0.7, 0.7),
    });

    y -= 74;
    drawSpacer(10);

    // ==================== TITLE ====================
    drawLine('EINVERSTÄNDNISERKLÄRUNG', 18, true, accentColor);
    drawLine('zur Speicherung persönlicher Daten', 14, true, accentColor);
    drawHLine();
    drawSpacer(8);

    // ==================== PARTIES ====================
    drawLine('ZWISCHEN', 9, true, mediumGray);
    drawSpacer(4);
    drawLine('Verein Techno on the Block', 11, true);
    drawLine('nachfolgend "Verein" genannt', 10, true, accentColor);
    drawSpacer(12);

    drawLine('UND', 9, true, mediumGray);
    drawSpacer(4);
    drawLine(`Name: ${fullName}`, 11, true);
    drawLine('nachfolgend "Vertragsnehmer" genannt', 10, true, accentColor);
    drawSpacer(16);

    drawHLine();
    drawSpacer(8);

    // ==================== TEXT ====================
    drawTextWrapped('Der Vertragsnehmer erklärt sich damit einverstanden, dass seine persönlichen und geschäftlichen Daten gemäß dem Schweizer Datenschutzgesetz durch den Verein gespeichert und verarbeitet werden.', 10);
    drawSpacer(8);
    drawTextWrapped('Er versteht, dass seine Daten durch den Verein vertraulich behandelt werden und nicht an Dritte weitergeleitet werden, es sei denn, er gibt seine ausdrückliche Zustimmung dazu oder der Verein ist oder wird hierzu aufgrund gesetzlicher Regelungen oder behördlicher Anordnung verpflichtet.', 10);
    drawSpacer(30);

    // ==================== SIGNATURES ====================
    const sigBlockHeight = 180;
    if (y - sigBlockHeight < bottomMargin) {
      drawFooter(page);
      page = pdfDoc.addPage([width, height]);
      y = height - margin;
    }

    drawHLine();
    drawSpacer(8);

    page.drawText(`${sigOrt}, ${sigDatum}`, { x: margin, y, size: 10, font, color: mediumGray });
    y -= 30;

    const boxWidth = 220;
    const boxHeight = 70;
    const gap = 40;

    if (sigVereinImg) {
      const imgDims = sigVereinImg.scale(0.3);
      page.drawImage(sigVereinImg, {
        x: margin + 5,
        y: y - boxHeight + 5,
        width: Math.min(imgDims.width, boxWidth - 10),
        height: Math.min(imgDims.height, boxHeight - 20),
      });
    }

    if (sigVertragsnehmerImg) {
      const imgDims = sigVertragsnehmerImg.scale(0.3);
      page.drawImage(sigVertragsnehmerImg, {
        x: margin + boxWidth + gap + 5,
        y: y - boxHeight + 5,
        width: Math.min(imgDims.width, boxWidth - 10),
        height: Math.min(imgDims.height, boxHeight - 20),
      });
    }

    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderWidth: 0.5,
      borderColor: lightGray,
    });

    page.drawRectangle({
      x: margin + boxWidth + gap,
      y: y - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderWidth: 0.5,
      borderColor: lightGray,
    });

    if (!sigVereinImg) {
      page.drawText('Unterschrift Verein', {
        x: margin + 10,
        y: y - boxHeight + 14,
        size: 8,
        font,
        color: mediumGray,
      });
    }
    if (!sigVertragsnehmerImg) {
      page.drawText('Unterschrift Vertragsnehmer', {
        x: margin + boxWidth + gap + 10,
        y: y - boxHeight + 14,
        size: 8,
        font,
        color: mediumGray,
      });
    }

    y -= boxHeight + 14;
    page.drawText('Ben Littmann & Alina Littmann', {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: accentColor,
    });
    page.drawText(fullName, {
      x: margin + boxWidth + gap,
      y,
      size: 10,
      font: fontBold,
      color: accentColor,
    });

    drawFooter(page);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Einverstaendnis_${employee.last_name}_${employee.first_name}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating consent PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
