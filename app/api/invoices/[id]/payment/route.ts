import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { stripe, createCheckoutSession } from '@/lib/stripe/server';

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

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    // Create Stripe Checkout Session
    const session = await createCheckoutSession(
      invoice.id,
      invoice.total,
      invoice.currency,
      invoice.customer.email,
      `Invoice ${invoice.invoice_number} from ${invoice.company.name}`
    );

    // Save session ID to invoice
    await supabase
      .from('invoices')
      .update({ 
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_payment_url: session.url 
      })
      .eq('id', params.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating payment session:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
