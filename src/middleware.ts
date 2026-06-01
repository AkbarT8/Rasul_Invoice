import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'rasul_session';

const PUBLIC_PATHS = ['/login'];
const PUBLIC_API = ['/api/auth/login', '/api/auth/logout'];

function isPublic(path: string) {
  return (
    PUBLIC_PATHS.some((p) => path === p) ||
    PUBLIC_API.some((p) => path === p) ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path === '/robots.txt'
  );
}

async function isValidJwt(token: string | undefined) {
  if (!token) return false;
  const raw = process.env.JWT_SECRET;
  if (!raw) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(raw), { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const valid = await isValidJwt(token);

  // Authenticated user hitting /login → bounce to dashboard
  if (valid && pathname === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (!valid) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|uploads/).*)']
};
