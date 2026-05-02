import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, text, from, replyTo, attachments } = body;

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html or text' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: from || process.env.EMAIL_FROM || 'Techno on the Block <no-reply@technoontheblock.ch>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
      attachments,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id }, { status: 200 });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
