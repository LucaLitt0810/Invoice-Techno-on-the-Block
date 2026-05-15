import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      get() { return undefined; },
      set() {},
      remove() {},
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Check admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser || currentUser.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const customerId = params.id;

    // Fetch customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (customer.auth_user_id) {
      return NextResponse.json({ error: 'Customer already has an account' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: customer.email,
      email_confirm: true,
      user_metadata: {
        role: 'customer',
        first_name: customer.contact_person?.split(' ')[0] || '',
        last_name: customer.contact_person?.split(' ').slice(1).join(' ') || '',
        onboarding_complete: false,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 500 });
    }

    // Update customer with auth_user_id
    const { error: updateError } = await supabase
      .from('customers')
      .update({ auth_user_id: authData.user.id })
      .eq('id', customerId);

    if (updateError) {
      // Rollback: delete auth user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Failed to link customer account' }, { status: 500 });
    }

    // Generate magic link for invitation
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: customer.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://totb-workspace.ch'}/login`,
      },
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      // Continue anyway - user can use password reset
    }

    const magicLink = linkData?.properties?.action_link || `${process.env.NEXT_PUBLIC_APP_URL || 'https://totb-workspace.ch'}/login`;

    // Send invitation email via Resend
    const companyName = 'Techno on the Block';
    const subject = `Einladung zum DJ-Rider-Portal — ${companyName}`;

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0;padding:0;background-color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#f5f5f5; }
    @media only screen and (max-width: 600px) {
      .mob-pad { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background-color:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #333333;">
          <tr>
            <td style="background:linear-gradient(90deg,#2563eb 0%,#1d4ed8 100%);padding:20px 24px;text-align:center;">
              <p style="margin:0;font-size:16px;font-weight:800;color:#ffffff;letter-spacing:4px;text-transform:uppercase;">TECHNO ON THE BLOCK</p>
              <p style="margin:4px 0 0 0;font-size:10px;color:rgba(255,255,255,0.8);letter-spacing:3px;text-transform:uppercase;">Advancing Portal</p>
            </td>
          </tr>
          <tr>
            <td class="mob-pad" style="padding:32px 28px;">
              <p style="margin:0 0 16px 0;font-size:15px;color:#f5f5f5;line-height:1.55;">Hallo ${customer.contact_person || customer.company_name},</p>
              <p style="margin:0 0 24px 0;font-size:15px;color:#bbbbbb;line-height:1.55;">Sie wurden eingeladen, unser DJ-Rider-Portal zu nutzen. Dort können Sie alle Event-Details gemeinsam mit uns bearbeiten und bestätigen.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background:linear-gradient(90deg,#2563eb 0%,#1d4ed8 100%);border-radius:8px;text-align:center;">
                    <a href="${magicLink}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">Zum Portal anmelden</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px 0;font-size:13px;color:#888888;line-height:1.55;">Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:</p>
              <p style="margin:0;font-size:12px;color:#555555;word-break:break-all;">${magicLink}</p>
              <p style="margin:24px 0 0 0;font-size:13px;color:#888888;line-height:1.55;">Bei Ihrem ersten Login werden Sie aufgefordert, Ihre Daten zu bestätigen und ein Passwort zu erstellen.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#0a0a0a;border-top:1px solid #222222;text-align:center;">
              <p style="margin:0;font-size:10px;color:#666666;letter-spacing:1px;text-transform:uppercase;">© ${companyName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `Einladung zum DJ-Rider-Portal — ${companyName}

Hallo ${customer.contact_person || customer.company_name},

Sie wurden eingeladen, unser DJ-Rider-Portal zu nutzen.

Klicken Sie hier, um sich anzumelden:
${magicLink}

Bei Ihrem ersten Login werden Sie aufgefordert, Ihre Daten zu bestätigen und ein Passwort zu erstellen.

© ${companyName}`;

    const { error: sendError } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || 'Techno on the Block <no-reply@technoontheblock.ch>',
      to: customer.email,
      subject,
      html,
      text,
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      // Non-fatal: user is created, they can still log in via password reset
    }

    return NextResponse.json({
      success: true,
      user_id: authData.user.id,
      message: 'Customer invited successfully',
    });
  } catch (error: any) {
    console.error('Error inviting customer:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
