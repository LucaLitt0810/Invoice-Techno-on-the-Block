import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && /^https?:\/\//.test(url)) {
    return url;
  }
  return 'https://placeholder.supabase.co';
}

const supabaseUrl = getSupabaseUrl();
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const userRole = session?.user?.user_metadata?.role as string | undefined;
  const isCustomer = userRole === 'customer';

  // Auth routes - redirect if already logged in
  if (request.nextUrl.pathname.startsWith('/login') || 
      request.nextUrl.pathname.startsWith('/register') ||
      request.nextUrl.pathname.startsWith('/reset-password')) {
    if (session) {
      const redirectTo = isCustomer ? '/customer/riders' : '/dashboard';
      const redirectResponse = NextResponse.redirect(new URL(redirectTo, request.url));
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      redirectResponse.headers.set('Pragma', 'no-cache');
      redirectResponse.headers.set('Expires', '0');
      return redirectResponse;
    }
    return response;
  }

  // Root path - redirect based on role
  if (request.nextUrl.pathname === '/') {
    if (session) {
      const redirectTo = isCustomer ? '/customer/riders' : '/dashboard';
      const redirectResponse = NextResponse.redirect(new URL(redirectTo, request.url));
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      redirectResponse.headers.set('Pragma', 'no-cache');
      redirectResponse.headers.set('Expires', '0');
      return redirectResponse;
    }
    const loginResponse = NextResponse.redirect(new URL('/login', request.url));
    loginResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    loginResponse.headers.set('Pragma', 'no-cache');
    loginResponse.headers.set('Expires', '0');
    return loginResponse;
  }

  // Protected agency routes: customers should be redirected to their dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/customers') ||
      request.nextUrl.pathname.startsWith('/customer-detail') ||
      request.nextUrl.pathname.startsWith('/invoices') ||
      request.nextUrl.pathname.startsWith('/products') ||
      request.nextUrl.pathname.startsWith('/coworkers') ||
      request.nextUrl.pathname.startsWith('/settings') ||
      request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/user') ||
      request.nextUrl.pathname.startsWith('/agency') ||
      request.nextUrl.pathname.startsWith('/bookings') ||
      request.nextUrl.pathname.startsWith('/contracts') ||
      request.nextUrl.pathname.startsWith('/b2b') ||
      request.nextUrl.pathname.startsWith('/bookkeeping') ||
      request.nextUrl.pathname.startsWith('/personal') ||
      request.nextUrl.pathname.startsWith('/meetings')) {
    if (!session) {
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      redirectResponse.headers.set('Pragma', 'no-cache');
      redirectResponse.headers.set('Expires', '0');
      return redirectResponse;
    }
    if (isCustomer) {
      const redirectResponse = NextResponse.redirect(new URL('/customer/riders', request.url));
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      redirectResponse.headers.set('Pragma', 'no-cache');
      redirectResponse.headers.set('Expires', '0');
      return redirectResponse;
    }
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // Customer-specific routes: non-customers should not access them
  if (request.nextUrl.pathname.startsWith('/customer')) {
    if (!session) {
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      redirectResponse.headers.set('Pragma', 'no-cache');
      redirectResponse.headers.set('Expires', '0');
      return redirectResponse;
    }
    if (!isCustomer) {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      redirectResponse.headers.set('Pragma', 'no-cache');
      redirectResponse.headers.set('Expires', '0');
      return redirectResponse;
    }
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
