import { prisma } from './prisma';
import { NextResponse } from 'next/server';

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export async function checkAccountRateLimit(
  urlEnding: string,
  _maxAttempts: number = 5,
  _lockoutDurationMs: number = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const account = await prisma.accountData.findUnique({
    where: { urlEnding },
    select: { loginAttempts: true, lockedUntil: true },
  });

  if (!account) return { allowed: true };

  if (account.lockedUntil && new Date(account.lockedUntil) > new Date()) {
    const retryAfterSeconds = Math.ceil(
      (new Date(account.lockedUntil).getTime() - Date.now()) / 1000
    );
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

export async function recordFailedAttempt(
  urlEnding: string,
  maxAttempts: number = 5,
  lockoutDurationMs: number = 15 * 60 * 1000
): Promise<void> {
  const account = await prisma.accountData.findUnique({
    where: { urlEnding },
    select: { loginAttempts: true },
  });

  const currentAttempts = account?.loginAttempts ?? 0;
  const newAttempts = currentAttempts + 1;
  const shouldLock = newAttempts >= maxAttempts;

  await prisma.accountData.update({
    where: { urlEnding },
    data: {
      loginAttempts: newAttempts,
      ...(shouldLock ? { lockedUntil: new Date(Date.now() + lockoutDurationMs) } : {}),
    },
  });
}

export async function resetFailedAttempts(urlEnding: string): Promise<void> {
  await prisma.accountData.update({
    where: { urlEnding },
    data: { loginAttempts: 0, lockedUntil: null },
  });
}

export function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { message: 'Too many login attempts. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}