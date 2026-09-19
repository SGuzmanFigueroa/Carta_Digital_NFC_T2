import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'gastropulse_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and internal Next.js requests bypass middleware
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Public customer routes
  if (pathname === '/menu' || pathname === '/' || pathname === '/login') {
    return NextResponse.next();
  }

  // Check auth session cookie
  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    // Unauthenticated user trying to access restaurant admin/kitchen routes
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('reason', 'unauthenticated');
    return NextResponse.redirect(loginUrl);
  }

  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie.value));
    const role = session.role;

    // Executive routes strictly require 'admin'
    const isExecutiveRoute =
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/personal') ||
      pathname.startsWith('/configuracion');

    if (isExecutiveRoute && role !== 'admin') {
      // Role unauthorized for executive panel
      const redirectUrl = new URL('/kds', request.url);
      redirectUrl.searchParams.set('denied', '1');
      return NextResponse.redirect(redirectUrl);
    }

    // Kitchen routes require staff role (admin, kitchen, floor, bartender)
    const isKitchenRoute = pathname.startsWith('/kds');
    const allowedKitchenRoles = ['admin', 'kitchen', 'floor', 'bartender'];
    if (isKitchenRoute && !allowedKitchenRoles.includes(role)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('reason', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // Corrupted cookie: redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('reason', 'invalid_session');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/kds/:path*', '/personal/:path*', '/configuracion/:path*'],
};
