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

    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const margin = 60;
    const textWidth = width - margin * 2;

    let y = height - margin;

    const fullName = `${employee.first_name} ${employee.last_name}`;
    const today = new Date().toLocaleDateString('de-DE');

    // Helper: draw text with word wrap
    const drawTextWrapped = (text: string, size: number, isBold = false, lineHeight?: number) => {
      const f = isBold ? fontBold : font;
      const lh = lineHeight || size * 1.35;
      const words = text.split(' ');
      let line = '';

      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const testWidth = f.widthOfTextAtSize(testLine, size);
        if (testWidth > textWidth && line) {
          page.drawText(line, { x: margin, y, size, font: f });
          y -= lh;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, { x: margin, y, size, font: f });
        y -= lh;
      }
    };

    const drawLine = (text: string, size: number, isBold = false) => {
      const f = isBold ? fontBold : font;
      page.drawText(text, { x: margin, y, size, font: f });
      y -= size * 1.5;
    };

    const drawSpacer = (amount: number) => {
      y -= amount;
    };

    const drawHR = () => {
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5 });
      y -= 14;
    };

    // TITLE
    drawLine('VERSCHWIEGENHEITSVEREINBARUNG', 14, true);
    drawSpacer(10);

    // HEADER
    drawLine('Zwischen dem "Verein Techno on the Block",', 10);
    drawLine('einem Verein nach Schweizer Recht,', 10);
    drawSpacer(6);
    drawLine('vertreten durch seinen Vorstand:', 10);
    drawLine('Ben Littmann & Alina Littmann,', 10);
    drawLine('Pratteln, Vereinshausstrasse 10, 4133 Pratteln, Schweiz', 10);
    drawLine('nachstehend "Verein"', 10, true);
    drawSpacer(6);

    // EMPLOYEE NAME
    page.drawText(fullName, { x: margin, y, size: 10, font: fontBold });
    y -= 12;
    drawLine('nachstehend "Vertragsnehmer"', 10, true);
    drawSpacer(6);

    drawLine('wird folgende', 10);
    drawLine('Verschwiegenheitsvereinbarung', 11, true);
    drawLine('vereinbart:', 10);
    drawSpacer(14);

    // PRÄAMBEL
    drawLine('Präambel', 11, true);
    drawTextWrapped('Der Verein führt gemäß seinen Statuten unter seinem Namen die Projekte Techno on the Block, RVNZ Project, Outdoorbasel zur Organisation, Durchführung, Entwicklung künstlerischer Aktivitäten zur Stärkung der Jugendkultur durch.', 9);
    drawTextWrapped('Zur Erreichung der Vereinszwecke arbeitet der Verein auf vertraglicher Basis mit Dritten (dem Vertragsnehmer) zusammen. Im Rahmen dieser Vertragsbeziehungen stellt der Verein dem Vertragsnehmer Informationen allgemeiner und vertraulicher Natur zur Verfügung.', 9);
    drawSpacer(14);

    // §1
    drawLine('1. Vertraulichkeit von Informationen', 11, true);
    drawTextWrapped('Der Vertragsnehmer verpflichtet sich, jegliche Informationen (insbesondere Informationen über Künstler, Verträge, Finanzen und Geschäftsstrategien u.Ä.), die er im Rahmen seiner Tätigkeit für den Verein erhält oder anderweitig Kenntnis erlangt, vertraulich zu behandeln.', 9);
    drawSpacer(14);

    // §2
    drawLine('2. Nutzung von Informationen', 11, true);
    drawTextWrapped('Der Vertragsnehmer darf die Informationen nur für die, im Rahmen seiner Tätigkeit für den Veranstalter vereinbarten Zwecke verwenden. Jegliche Weitergabe oder Nutzung der Informationen für eigene nicht vertraglich notwendige oder andere Zwecke ist untersagt.', 9);
    drawSpacer(14);

    // §3
    drawLine('3. Geheimhaltungspflicht', 11, true);
    drawTextWrapped('Der Vertragsnehmer verpflichtet sich über die Informationen gemäß Ziffer 1 Dritten gegenüber Stillschweigen zu bewahren.', 9);
    drawSpacer(6);
    drawTextWrapped('Ausgenommen von dieser Verpflichtung sind diejenigen Informationen, die der Vertragsnehmer zur Erfüllung eigener gesetzlicher Pflichten (AHV, Steueramt u.ä.) benötigt oder hierzu verpflichtet ist oder wird.', 9);
    drawTextWrapped('Diese Geheimhaltungspflicht gilt über die Dauer des Vertragsverhältnisses hinaus und erstreckt sich insbesondere auf solche Informationen, die nach Vertragsende weiterhin als vertraulich anzusehen sind. Hierzu zählen grundsätzlich alle Informationen über Künstler, Verträge, Finanzen und Geschäftsstrategien u.ä..', 9);
    drawSpacer(14);

    // §4
    drawLine('4. Haftung', 11, true);
    drawTextWrapped('Bei Verletzung der Geheimhaltungspflicht ist der Vertragsnehmer dem Verein gegenüber zum Schadensersatz verpflichtet.', 9);
    drawSpacer(14);

    // §5
    drawLine('5. Persönlicher Geltungsbereich', 11, true);
    drawTextWrapped('Dieser Vertrag gilt für den Vertragsnehmer, seine Organe, gesetzlichen Vertreter, seine Mitarbeiter (unabhängig von der Art des Beschäftigungsverhältnisses), Subunternehmer und/oder sonstigen juristischen oder natürlichen Personen, derer er sich im Rahmen der Erfüllung seines Vertrages gegenüber dem Verein bedient.', 9);
    drawTextWrapped('Der Vertragsnehmer verpflichtet sich, den entsprechenden Personenkreis bezüglich der Regelungen dieser Vereinbarung nachweislich zu belehren. Der Nachweis ist dem Verein auf dessen Verlangen vorzulegen.', 9);
    drawSpacer(14);

    // §6
    drawLine('6. Schriftform', 11, true);
    drawTextWrapped('Änderungen oder Ergänzungen dieses Vertrags bedürfen der Schriftform. Eine Änderung dieser Schriftformerfordernis bedarf ebenfalls der Schriftform.', 9);
    drawSpacer(14);

    // §7
    drawLine('7. Salvatorische Klausel', 11, true);
    drawTextWrapped('Sollten einzelne oder mehrere Bestimmungen dieser Vereinbarung unwirksam sein oder werden, so vereinbaren die Parteien schon jetzt die Herbeiführung einer Regelung, die der gesetzlichen Regelung unter Beachtung der beiderseitigen Interessen am Nächsten kommt.', 9);
    drawTextWrapped('Die Wirksamkeit der übrigen Bestimmungen bleibt unberührt.', 9);
    drawSpacer(30);

    // Signatures
    drawHR();
    drawSpacer(4);
    drawLine(`Pratteln, ${today}`, 10);
    drawSpacer(20);

    const sigY = y;
    page.drawLine({ start: { x: margin, y: sigY }, end: { x: margin + 210, y: sigY }, thickness: 0.5 });
    page.drawLine({ start: { x: margin + 270, y: sigY }, end: { x: margin + 480, y: sigY }, thickness: 0.5 });
    y -= 14;

    page.drawText('Unterschrift Verein', { x: margin, y, size: 9, font });
    page.drawText('Unterschrift Vertragsnehmer', { x: margin + 270, y, size: 9, font });
    y -= 14;

    page.drawText('Ben Littmann & Alina Littmann', { x: margin, y, size: 9, font: fontBold });
    page.drawText(fullName, { x: margin + 270, y, size: 9, font: fontBold });

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
