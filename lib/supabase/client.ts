import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && /^https?:\/\//.test(url)) {
    return url;
  }
  return 'https://placeholder.supabase.co';
}

function getSupabaseKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
}

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseKey();

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}

// For server components and server actions
export function createServerClient() {
  return createSupabaseClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
