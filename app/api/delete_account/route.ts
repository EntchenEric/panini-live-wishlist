import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encrypt'
import { DeleteAccountSchema, handleZodError } from '@/lib/validate'
import { requireAuth, clearSessionCookie } from '@/lib/auth'
import { handleForbidden, handleNotFound, handleUnauthenticated, handleDatabaseError } from '@/lib/error-handler'

export const POST = requireAuth(async (req: NextRequest, session) => {
    try {
        const body = await req.json();
        const result = DeleteAccountSchema.safeParse(body);

        if (!result.success) {
            return handleZodError(result.error);
        }

        const { email, password, urlEnding } = result.data;

        if (urlEnding !== session.urlEnding) {
            return handleForbidden();
        }

        const existingAccount = await prisma.accountData.findUnique({
            where: { email: encrypt(email) },
        });

        if (!existingAccount) {
            return handleNotFound();
        }

        if (existingAccount.urlEnding !== session.urlEnding) {
            return handleUnauthenticated();
        }

        const passwordMatch = await bcrypt.compare(password, existingAccount.password);
        if (!passwordMatch) {
            return handleUnauthenticated();
        }

        await prisma.accountData.update({
            where: { urlEnding },
            data: { tokenVersion: { increment: 1 } },
        });

        await prisma.$transaction([
          prisma.note.deleteMany({ where: { urlEnding } }),
          prisma.priorities.deleteMany({ where: { urlEnding } }),
          prisma.dependency.deleteMany({ where: { urlEnding } }),
          prisma.cachedWishlist.deleteMany({ where: { urlEnding } }),
          prisma.accountData.update({
            where: { urlEnding },
            data: { deletedAt: new Date(), loginAttempts: 0, lockedUntil: null, tokenVersion: { increment: 1 } },
          }),
        ]);

        console.info('[AUDIT] Account soft-deleted', { urlEnding, ts: new Date().toISOString() });

        const response = NextResponse.json({ message: 'Account deleted successfully.' }, { status: 200 });
        return clearSessionCookie(response);
    } catch (err) {
        console.error('Error deleting account:', err);
        return handleDatabaseError();
    }
});