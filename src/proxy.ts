import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const STAFF_ROLES = ['admin', 'kitchen', 'floor', 'bar', 'runner'];

/**
 * Chequeo optimista de rutas internas. La sesión es la de Supabase Auth (cookies
 * de @supabase/ssr) y el rol sale de app_metadata dentro del JWT, cuya firma
 * (ES256) se verifica con las claves públicas del proyecto: editar la cookie no
 * otorga acceso. La autorización definitiva de los datos la hace RLS.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return redirectToLogin(request, pathname, 'unauthenticated');

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Sesión renovada: se reenvía al render y al navegador.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      }
    }
  });

  const { data } = await supabase.auth.getClaims();
  const meta = (data?.claims?.app_metadata ?? {}) as Record<string, unknown>;
  const role = typeof meta.staff_role === 'string' ? meta.staff_role : '';

  if (!STAFF_ROLES.includes(role)) {
    return withCookies(redirectToLogin(request, pathname, data?.claims ? 'unauthorized' : 'unauthenticated'), response);
  }

  // Contraseña temporal pendiente: primero hay que cambiarla.
  if (meta.must_change_password === true) {
    return withCookies(redirectToLogin(request, pathname, 'change_password'), response);
  }

  const isExecutiveRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/personal') ||
    pathname.startsWith('/configuracion');
  if (isExecutiveRoute && role !== 'admin') {
    const redirectUrl = new URL('/kds', request.url);
    redirectUrl.searchParams.set('denied', '1');
    return withCookies(NextResponse.redirect(redirectUrl), response);
  }

  return response;
}

function redirectToLogin(request: NextRequest, pathname: string, reason: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  loginUrl.searchParams.set('reason', reason);
  return NextResponse.redirect(loginUrl);
}

/** Conserva las cookies de sesión renovadas también en las redirecciones. */
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export const config = {
  matcher: ['/dashboard/:path*', '/kds/:path*', '/personal/:path*', '/configuracion/:path*', '/pedidos/:path*'],
};
