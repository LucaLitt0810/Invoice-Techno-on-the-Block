import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(options: EmailOptions) {
  const { to, subject, html, text, attachments } = options;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
    attachments,
  };

  return transporter.sendMail(mailOptions);
}

export function generateInvoiceEmailTemplate(
  companyName: string,
  customerName: string,
  invoiceNumber: string,
  amount: string,
  dueDate: string,
  paymentUrl?: string
): { subject: string; html: string; text: string } {
  const subject = `Invoice ${invoiceNumber} from ${companyName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice from ${companyName}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .button { display: inline-block; background: #3b82f6; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Invoice from ${companyName}</h2>
        </div>
        <div class="content">
          <p>Dear ${customerName},</p>
          <p>Thank you for your business. Please find your invoice details below:</p>
          <ul>
            <li><strong>Invoice Number:</strong> ${invoiceNumber}</li>
            <li><strong>Amount:</strong> ${amount}</li>
            <li><strong>Due Date:</strong> ${dueDate}</li>
          </ul>
          ${paymentUrl ? `
          <p>You can pay this invoice online by clicking the button below:</p>
          <a href="${paymentUrl}" class="button">Pay Invoice</a>
          ` : ''}
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>${companyName}</p>
        </div>
        <div class="footer">
          <p>This email was sent from ${companyName} invoicing system.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Dear ${customerName},

Thank you for your business. Please find your invoice details below:

Invoice Number: ${invoiceNumber}
Amount: ${amount}
Due Date: ${dueDate}

${paymentUrl ? `You can pay this invoice online at: ${paymentUrl}\n` : ''}

If you have any questions, please don't hesitate to contact us.

Best regards,
${companyName}
  `;

  return { subject, html, text };
}
