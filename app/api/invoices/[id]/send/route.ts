import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendEmail, generateInvoiceEmailTemplate } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    
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

    // Generate payment URL if not paid
    const paymentUrl = invoice.status !== 'paid' 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}`
      : undefined;

    // Generate email template
    const emailTemplate = generateInvoiceEmailTemplate(
      invoice.company.name,
      invoice.customer.company_name,
      invoice.invoice_number,
      formatCurrency(invoice.total),
      formatDate(invoice.due_date),
      paymentUrl
    );

    // Send email
    await sendEmail({
      to: invoice.customer.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    // Update invoice status to sent if it's a draft
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', params.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice email' },
      { status: 500 }
    );
  }
}
