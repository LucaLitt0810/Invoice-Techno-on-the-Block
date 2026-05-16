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
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

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

    // Create auth user with password
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: customer.email,
      email_confirm: true,
      password,
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
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Failed to link customer account' }, { status: 500 });
    }

    // Send email with login info
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://totb-workspace.ch'}/login`;
    const companyName = 'Techno on the Block';
    const subject = `Ihr Login zum DJ-Rider-Portal — ${companyName}`;

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0;padding:0;background-color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#f5f5f5; }
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
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 16px 0;font-size:15px;color:#f5f5f5;line-height:1.55;">Hallo ${customer.contact_person || customer.company_name},</p>
              <p style="margin:0 0 24px 0;font-size:15px;color:#bbbbbb;line-height:1.55;">Ihr Account für das DJ-Rider-Portal wurde erstellt. Sie können sich mit den folgenden Daten anmelden:</p>
              <div style="background:#0a0a0a;border:1px solid #222222;border-radius:8px;padding:16px;margin:0 0 24px 0;">
                <p style="margin:0 0 8px 0;font-size:13px;color:#888888;"><strong style="color:#f5f5f5;">E-Mail:</strong> ${customer.email}</p>
                <p style="margin:0;font-size:13px;color:#888888;"><strong style="color:#f5f5f5;">Passwort:</strong> ${password}</p>
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background:linear-gradient(90deg,#2563eb 0%,#1d4ed8 100%);border-radius:8px;text-align:center;">
                    <a href="${loginUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">Zum Portal anmelden</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px 0;font-size:13px;color:#ff4444;line-height:1.55;"><strong>Wichtig:</strong> Ändern Sie Ihr Passwort nach dem ersten Login umgehend unter Einstellungen.</p>
              <p style="margin:16px 0 0 0;font-size:12px;color:#555555;word-break:break-all;">${loginUrl}</p>
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

    const text = `Ihr Login zum DJ-Rider-Portal — ${companyName}

Hallo ${customer.contact_person || customer.company_name},

Ihr Account wurde erstellt.

E-Mail: ${customer.email}
Passwort: ${password}

Melden Sie sich hier an:
${loginUrl}

WICHTIG: Ändern Sie Ihr Passwort nach dem ersten Login umgehend.

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
    }

    return NextResponse.json({
      success: true,
      user_id: authData.user.id,
      message: 'Customer login created and email sent',
    });
  } catch (error: any) {
    console.error('Error creating customer login:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
