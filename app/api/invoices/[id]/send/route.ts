import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get invoice with related data
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        company:companies(*),
        customer:customers(*)
      `)
      .eq('id', params.id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: invoice.currency || 'EUR',
      }).format(amount);
    };

    // Format date
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('de-DE');
    };

    // Build invoice items list
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('created_at', { ascending: true });

    const itemsRows = (items || []).map((item: any) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e8e8e8;" class="dm-border">
          <p class="dm-text-primary" style="margin:0;font-size:14px;color:#111111;font-weight:500;">${item.description}</p>
          <p style="margin:2px 0 0 0;font-size:11px;color:#888888;">${item.quantity} x ${formatCurrency(item.price)}</p>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e8e8e8;text-align:right;" class="dm-border">
          <p class="dm-text-primary" style="margin:0;font-size:14px;color:#111111;font-weight:600;">${formatCurrency(item.total)}</p>
        </td>
      </tr>
    `).join('');

    // Generate payment URL if not paid
    const paymentUrl = invoice.status !== 'paid'
      ? `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}`
      : undefined;

    const companyName = invoice.company?.name || 'Techno on the Block';
    const customerName = invoice.customer?.company_name || 'Customer';
    const invoiceNumber = invoice.invoice_number;
    const amount = formatCurrency(invoice.total);
    const dueDate = formatDate(invoice.due_date);
    const invoiceDate = formatDate(invoice.invoice_date);

    const subject = `Invoice ${invoiceNumber} from ${companyName}`;

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    body { word-wrap: break-word; overflow-wrap: break-word; -webkit-text-size-adjust: 100%; }
    @media only screen and (max-width: 600px) {
      .hide-mobile { display: none !important; }
      .show-mobile { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
      .mob-center { text-align: center !important; }
      .mob-pad { padding: 24px 20px !important; }
      .mob-wrap { word-wrap: break-word !important; overflow-wrap: break-word !important; }
    }
    @media (prefers-color-scheme: dark) {
      .dm-bg-body { background-color: #111111 !important; }
      .dm-bg-card { background-color: #1a1a1a !important; }
      .dm-text-primary { color: #f5f5f5 !important; }
      .dm-text-secondary { color: #bbbbbb !important; }
      .dm-text-muted { color: #777777 !important; }
      .dm-border { border-color: #2a2a2a !important; }
    }
  </style>
</head>
<body class="dm-bg-body" style="margin:0;padding:0;background-color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);" class="dm-bg-card">

          <!-- TOP BAR -->
          <tr>
            <td style="background:linear-gradient(90deg,#2563eb 0%,#1d4ed8 100%);padding:16px 24px;text-align:center;">
              <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:4px;text-transform:uppercase;">TECHNO ON THE BLOCK</p>
              <p style="margin:4px 0 0 0;font-size:9px;color:rgba(255,255,255,0.8);letter-spacing:3px;text-transform:uppercase;">Invoice</p>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td class="mob-wrap mob-pad" style="padding:32px 28px;word-wrap:break-word;overflow-wrap:break-word;">
              <p class="dm-text-primary" style="margin:0 0 20px 0;font-size:15px;color:#111111;line-height:1.55;">Hello ${customerName},</p>
              <p class="dm-text-secondary" style="margin:0 0 24px 0;font-size:15px;color:#444444;line-height:1.55;">Please find your invoice details below. If you have any questions, feel free to reply to this email.</p>

              <!-- Invoice Meta -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background:#f8f9fa;border-radius:8px;" class="dm-bg-left">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:4px 0;">
                          <p style="margin:0;font-size:10px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Invoice Number</p>
                          <p class="dm-text-primary" style="margin:2px 0 0 0;font-size:14px;color:#111111;font-weight:600;">${invoiceNumber}</p>
                        </td>
                        <td style="padding:4px 0;text-align:right;">
                          <p style="margin:0;font-size:10px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Date</p>
                          <p class="dm-text-primary" style="margin:2px 0 0 0;font-size:14px;color:#111111;font-weight:600;">${invoiceDate}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;">
                          <p style="margin:0;font-size:10px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Due Date</p>
                          <p class="dm-text-primary" style="margin:2px 0 0 0;font-size:14px;color:#111111;font-weight:600;">${dueDate}</p>
                        </td>
                        <td style="padding:4px 0;text-align:right;">
                          <p style="margin:0;font-size:10px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Total Amount</p>
                          <p style="margin:2px 0 0 0;font-size:18px;color:#2563eb;font-weight:700;">${amount}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Items -->
              ${itemsRows ? `
              <p style="margin:0 0 12px 0;font-size:10px;color:#2563eb;text-transform:uppercase;letter-spacing:2px;font-weight:700;">Invoice Items</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
                ${itemsRows}
                <tr>
                  <td style="padding:12px 0;text-align:right;">
                    <p style="margin:0;font-size:10px;color:#888888;text-transform:uppercase;letter-spacing:1px;">Total</p>
                    <p style="margin:2px 0 0 0;font-size:20px;color:#2563eb;font-weight:800;">${amount}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Pay Button -->
              ${paymentUrl ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                <tr>
                  <td style="text-align:center;padding:8px 0;">
                    <a href="${paymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Pay Invoice Online</a>
                  </td>
                </tr>
              </table>
              ` : `
              <p style="margin:24px 0;text-align:center;font-size:13px;color:#2563eb;font-weight:600;">This invoice has been paid. Thank you!</p>
              `}

              <p class="dm-text-secondary" style="margin:24px 0 0 0;font-size:14px;color:#444444;line-height:1.55;">Best regards,<br><strong class="dm-text-primary" style="color:#111111;">${companyName}</strong></p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="dm-bg-footer" style="padding:16px 24px;background:#f0f0f0;border-top:1px solid #e0e0e0;text-align:center;">
              <p class="dm-text-muted" style="margin:0;font-size:10px;color:#999999;letter-spacing:1px;text-transform:uppercase;">© Techno on the Block — ${companyName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `Invoice ${invoiceNumber} from ${companyName}

Hello ${customerName},

Please find your invoice details below:

Invoice Number: ${invoiceNumber}
Date: ${invoiceDate}
Due Date: ${dueDate}
Total Amount: ${amount}

${paymentUrl ? `Pay online: ${paymentUrl}\n` : 'This invoice has been paid. Thank you!'}

Best regards,
${companyName}`;

    // Send via Resend
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Techno on the Block <no-reply@technoontheblock.ch>',
      to: invoice.customer.email,
      subject,
      html,
      text,
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }

    // Update invoice status to sent if it's a draft
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', params.id);
    }

    return NextResponse.json({ success: true, id: sendData?.id });
  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send invoice email' },
      { status: 500 }
    );
  }
}
