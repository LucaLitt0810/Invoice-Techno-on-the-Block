import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && /^https?:\/\//.test(url)) {
    return url;
  }
  return 'https://placeholder.supabase.co';
}

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ users: {} });
    }

    const supabase = createClient(
      getSupabaseUrl(),
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      return NextResponse.json({ users: {} }, { status: 500 });
    }

    const usersMap: Record<string, { email: string; user_metadata?: any }> = {};
    const idSet = new Set(userIds);

    for (const user of data.users) {
      if (idSet.has(user.id)) {
        usersMap[user.id] = {
          email: user.email || '',
          user_metadata: user.user_metadata || {},
        };
      }
    }

    return NextResponse.json({ users: usersMap });
  } catch (error) {
    console.error('Error in riders/users API:', error);
    return NextResponse.json({ users: {} }, { status: 500 });
  }
}
