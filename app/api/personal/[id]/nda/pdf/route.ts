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
    const sigOrt = employee.signature_ort || 'Pratteln';
    const sigDatum = employee.signature_datum
      ? new Date(employee.signature_datum).toLocaleDateString('de-DE')
      : new Date().toLocaleDateString('de-DE');

    // Helper to embed signature images
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

    const sigVereinImg = await embedSignature(employee.signature_verein);
    const sigVertragsnehmerImg = await embedSignature(employee.signature_vertragsnehmer);

    // Colors
    const darkGray = rgb(0.2, 0.2, 0.2);
    const mediumGray = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.6, 0.6, 0.6);
    const accentColor = rgb(0.15, 0.15, 0.15);

    const checkPage = (neededSpace: number) => {
      if (y - neededSpace < bottomMargin) {
        // Draw footer on current page
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

    const drawTextWrapped = (text: string, size: number, isBold = false, lineHeight?: number, textColor = darkGray) => {
      const f = isBold ? fontBold : font;
      const lh = lineHeight || size * 1.45;
      const words = text.split(' ');
      let line = '';

      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const testWidth = f.widthOfTextAtSize(testLine, size);
        if (testWidth > textWidth && line) {
          checkPage(lh);
          page.drawText(line, { x: margin, y, size, font: f, color: textColor });
          y -= lh;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        checkPage(lh);
        page.drawText(line, { x: margin, y, size, font: f, color: textColor });
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

    const drawThinLine = () => {
      checkPage(12);
      page.drawLine({
        start: { x: margin, y: y - 4 },
        end: { x: width - margin, y: y - 4 },
        thickness: 0.3,
        color: lightGray,
      });
      y -= 16;
    };

    // ==================== HEADER ====================
    // Logo / Brand area
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

    // Document title
    drawSpacer(10);
    drawLine('VERSCHWIEGENHEITSVEREINBARUNG', 20, true, accentColor);
    drawHLine();
    drawSpacer(8);

    // ==================== PARTIES ====================
    drawLine('ZWISCHEN', 9, true, mediumGray);
    drawSpacer(4);

    // Party 1 - Verein
    drawTextWrapped('dem "Verein Techno on the Block", einem Verein nach Schweizer Recht,', 10);
    drawSpacer(2);
    drawLine('vertreten durch seinen Vorstand:', 10, false, mediumGray);
    drawSpacer(2);
    drawLine('Ben Littmann & Alina Littmann', 11, true);
    drawLine('Pratteln, Vereinshausstrasse 10, 4133 Pratteln, Schweiz', 10);
    drawSpacer(2);
    drawLine('nachstehend "Verein"', 10, true, accentColor);
    drawSpacer(12);

    // Party 2 - Vertragsnehmer
    drawLine('UND', 9, true, mediumGray);
    drawSpacer(4);
    drawLine(fullName, 12, true);
    drawSpacer(2);
    drawLine('nachstehend "Vertragsnehmer"', 10, true, accentColor);
    drawSpacer(12);

    drawThinLine();
    drawSpacer(8);

    drawLine('wird folgende Verschwiegenheitsvereinbarung vereinbart:', 10, true);
    drawSpacer(16);

    // ==================== PRÄAMBEL ====================
    drawLine('PRÄAMBEL', 11, true, accentColor);
    drawSpacer(6);
    drawTextWrapped('Der Verein führt gemäß seinen Statuten unter seinem Namen die Projekte Techno on the Block, RVNZ Project, Outdoorbasel zur Organisation, Durchführung, Entwicklung künstlerischer Aktivitäten zur Stärkung der Jugendkultur durch.', 9);
    drawSpacer(4);
    drawTextWrapped('Zur Erreichung der Vereinszwecke arbeitet der Verein auf vertraglicher Basis mit Dritten (dem Vertragsnehmer) zusammen. Im Rahmen dieser Vertragsbeziehungen stellt der Verein dem Vertragsnehmer Informationen allgemeiner und vertraulicher Natur zur Verfügung.', 9);
    drawSpacer(18);

    // ==================== §1 ====================
    drawHLine();
    drawSpacer(4);
    drawLine('§ 1  VERTRAULICHKEIT VON INFORMATIONEN', 12, true, accentColor);
    drawSpacer(6);
    drawTextWrapped('Der Vertragsnehmer verpflichtet sich, jegliche Informationen (insbesondere Informationen über Künstler, Verträge, Finanzen und Geschäftsstrategien u.Ä.), die er im Rahmen seiner Tätigkeit für den Verein erhält oder anderweitig Kenntnis erlangt, vertraulich zu behandeln.', 9);
    drawSpacer(16);

    // ==================== §2 ====================
    drawLine('§ 2  NUTZUNG VON INFORMATIONEN', 12, true, accentColor);
    drawSpacer(6);
    drawTextWrapped('Der Vertragsnehmer darf die Informationen nur für die, im Rahmen seiner Tätigkeit für den Veranstalter vereinbarten Zwecke verwenden. Jegliche Weitergabe oder Nutzung der Informationen für eigene nicht vertraglich notwendige oder andere Zwecke ist untersagt.', 9);
    drawSpacer(16);

    // ==================== §3 ====================
    drawLine('§ 3  GEHEIMHALTUNGSPFLICHT', 12, true, accentColor);
    drawSpacer(6);
    drawTextWrapped('Der Vertragsnehmer verpflichtet sich über die Informationen gemäß Ziffer 1 Dritten gegenüber Stillschweigen zu bewahren.', 9);
    drawSpacer(4);
    drawTextWrapped('Ausgenommen von dieser Verpflichtung sind diejenigen Informationen, die der Vertragsnehmer zur Erfüllung eigener gesetzlicher Pflichten (AHV, Steueramt u.ä.) benötigt oder hierzu verpflichtet ist oder wird.', 9);
    drawSpacer(4);
    drawTextWrapped('Diese Geheimhaltungspflicht gilt über die Dauer des Vertragsverhältnisses hinaus und erstreckt sich insbesondere auf solche Informationen, die nach Vertragsende weiterhin als vertraulich anzusehen sind. Hierzu zählen grundsätzlich alle Informationen über Künstler, Verträge, Finanzen und Geschäftsstrategien u.ä..', 9);
    drawSpacer(16);

    // ==================== §4 ====================
    drawLine('§ 4  HAFTUNG', 12, true, accentColor);
    drawSpacer(6);
    drawTextWrapped('Bei Verletzung der Geheimhaltungspflicht ist der Vertragsnehmer dem Verein gegenüber zum Schadensersatz verpflichtet.', 9);
    drawSpacer(16);

    // ==================== §5 ====================
    drawLine('§ 5  PERSÖNLICHER GELTUNGSBEREICH', 12, true, accentColor);
    drawSpacer(6);
    drawTextWrapped('Dieser Vertrag gilt für den Vertragsnehmer, seine Organe, gesetzlichen Vertreter, seine Mitarbeiter (unabhängig von der Art des Beschäftigungsverhältnisses), Subunternehmer und/oder sonstigen juristischen oder natürlichen Personen, derer er sich im Rahmen der Erfüllung seines Vertrages gegenüber dem Verein bedient.', 9);
    drawSpacer(4);
    drawTextWrapped('Der Vertragsnehmer verpflichtet sich, den entsprechenden Personenkreis bezüglich der Regelungen dieser Vereinbarung nachweislich zu belehren. Der Nachweis ist dem Verein auf dessen Verlangen vorzulegen.', 9);
    drawSpacer(16);

    // ==================== §6 ====================
    drawLine('§ 6  SCHRIFTFORM', 12, true, accentColor);
    drawSpacer(6);
    drawTextWrapped('Änderungen oder Ergänzungen dieses Vertrags bedürfen der Schriftform. Eine Änderung dieser Schriftformerfordernis bedarf ebenfalls der Schriftform.', 9);
    drawSpacer(16);

    // ==================== §7 ====================
    drawLine('§ 7  SALVATORISCHE KLAUSEL', 12, true, accentColor);
    drawSpacer(6);
    drawTextWrapped('Sollten einzelne oder mehrere Bestimmungen dieser Vereinbarung unwirksam sein oder werden, so vereinbaren die Parteien schon jetzt die Herbeiführung einer Regelung, die der gesetzlichen Regelung unter Beachtung der beiderseitigen Interessen am Nächsten kommt.', 9);
    drawSpacer(4);
    drawTextWrapped('Die Wirksamkeit der übrigen Bestimmungen bleibt unberührt.', 9);
    drawSpacer(30);

    // ==================== SIGNATURES ====================
    // Ensure signatures fit on one page - force new page if not enough space
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

    // Signature boxes
    const boxWidth = 220;
    const boxHeight = 70;
    const gap = 40;

    if (sigVereinImg) {
      // Draw signature image for Verein
      const imgDims = sigVereinImg.scale(0.3);
      page.drawImage(sigVereinImg, {
        x: margin + 5,
        y: y - boxHeight + 5,
        width: Math.min(imgDims.width, boxWidth - 10),
        height: Math.min(imgDims.height, boxHeight - 20),
      });
    }

    if (sigVertragsnehmerImg) {
      // Draw signature image for Vertragsnehmer
      const imgDims = sigVertragsnehmerImg.scale(0.3);
      page.drawImage(sigVertragsnehmerImg, {
        x: margin + boxWidth + gap + 5,
        y: y - boxHeight + 5,
        width: Math.min(imgDims.width, boxWidth - 10),
        height: Math.min(imgDims.height, boxHeight - 20),
      });
    }

    // Left box - Verein
    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderWidth: 0.5,
      borderColor: lightGray,
    });

    // Right box - Vertragsnehmer
    page.drawRectangle({
      x: margin + boxWidth + gap,
      y: y - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderWidth: 0.5,
      borderColor: lightGray,
    });

    // Labels inside boxes (only if no signature)
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

    // Names directly below boxes (same page guaranteed)
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

    // Draw footer on last page
    drawFooter(page);

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="NDA_${employee.last_name}_${employee.first_name}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating NDA PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
