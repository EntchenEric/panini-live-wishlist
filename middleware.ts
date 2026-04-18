import { NextRequest, NextResponse } from 'next/server';

const MAX_CONTENT_LENGTH = 1 * 1024 * 1024; // 1MB

export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const contentLength = request.headers.get('content-length');

  if (contentLength && parseInt(contentLength) > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { message: 'Request body is too large', details: { maxBytes: MAX_CONTENT_LENGTH } },
      { status: 413 }
    );
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' https://www.panini.de https://*.panini.de data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ${process.env.FLASK_BACKEND_URL || 'http://localhost:5000'}`
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/api/:path*',
  ],
};