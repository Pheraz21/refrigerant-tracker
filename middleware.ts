import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === '/') {
    if (searchParams.get('portal') === 'engineer') {
      return NextResponse.next();
    }

    const ua = request.headers.get('user-agent') ?? '';
    const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua);

    if (!isMobile) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
