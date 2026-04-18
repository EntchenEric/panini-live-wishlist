import { NextRequest, NextResponse } from 'next/server'
import { encrypt } from '@/lib/encrypt'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs';
import { LoginSchema, handleZodError } from '@/lib/validate'
import { createSession, setSessionCookie } from '@/lib/auth'
import { checkAccountRateLimit, recordFailedAttempt, resetFailedAttempts, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = LoginSchema.safeParse(body);

        if (!result.success) {
            return handleZodError(result.error);
        }

        const { email, password, urlEnding } = result.data;

        try {
            const rateLimit = await checkAccountRateLimit(urlEnding);
            if (!rateLimit.allowed && rateLimit.retryAfterSeconds) {
                return rateLimitResponse(rateLimit.retryAfterSeconds);
            }

            const account = await prisma.accountData.findFirst({
                where: {
                    email: encrypt(email),
                    urlEnding: urlEnding,
                    deletedAt: null,
                },
            });

            if (!account) {
                console.info('[AUDIT] Login failed: account not found', { urlEnding, ts: new Date().toISOString() });
                return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
            }

            const passwordMatch = await bcrypt.compare(password, account.password);

            if (!passwordMatch) {
                await recordFailedAttempt(urlEnding);
                return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
            }

            console.info('[AUDIT] Login successful', { urlEnding, ts: new Date().toISOString() });
            await resetFailedAttempts(urlEnding);

            const token = await createSession(urlEnding, account.tokenVersion);
            const response = NextResponse.json({
                message: "Authentication successful",
                success: true,
            }, { status: 200 });

            return setSessionCookie(response, token);
        } catch (error) {
            console.error('Login error:', error);
            return NextResponse.json({ message: 'An error occurred during login.' }, { status: 500 });
        }
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ message: 'An error occurred during login.' }, { status: 500 });
    }
}