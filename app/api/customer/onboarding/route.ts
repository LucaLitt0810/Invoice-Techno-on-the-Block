import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

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

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.user_metadata?.role !== 'customer') {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });
    }

    const { password, dataConfirmed } = await request.json();

    if (!dataConfirmed) {
      return NextResponse.json({ error: 'Customer data must be confirmed' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Update auth user metadata and password
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      currentUser.id,
      {
        password,
        user_metadata: {
          ...currentUser.user_metadata,
          onboarding_complete: true,
        },
      }
    );

    if (authError) {
      console.error('Error updating auth user:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Onboarding completed' });
  } catch (error: any) {
    console.error('Error in customer onboarding:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
