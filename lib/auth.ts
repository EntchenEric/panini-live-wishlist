import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { prisma } from './prisma';

const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION = '7d';

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.SECRET_KEY;
  if (!secret) throw new Error('SESSION_SECRET or SECRET_KEY is required');
  if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return new Uint8Array(crypto.createHash('sha256').update(secret).digest());
}

export async function createSession(urlEnding: string, tokenVersion: number = 0): Promise<string> {
  const secret = getSecretKey();
  const token = await new SignJWT({ urlEnding, tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(secret);
  return token;
}

export async function verifySession(request: NextRequest): Promise<{ urlEnding: string } | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    if (payload.urlEnding && typeof payload.urlEnding === 'string') {
      // Verify tokenVersion against DB (invalidates sessions after password change)
      if (typeof payload.tokenVersion === 'number') {
        const account = await prisma.accountData.findUnique({
          where: { urlEnding: payload.urlEnding },
          select: { tokenVersion: true, deletedAt: true },
        });
        if (!account || account.deletedAt || payload.tokenVersion !== account.tokenVersion) {
          return null;
        }
      }
      return { urlEnding: payload.urlEnding };
    }
    return null;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export function requireAuth(
  handler: (req: NextRequest, session: { urlEnding: string }) => Promise<NextResponse>,
  options?: { expectedUrlEnding?: string }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }
    if (options?.expectedUrlEnding && session.urlEnding !== options.expectedUrlEnding) {
      return NextResponse.json({ message: 'Not authorized.' }, { status: 403 });
    }
    return handler(req, session);
  };
}