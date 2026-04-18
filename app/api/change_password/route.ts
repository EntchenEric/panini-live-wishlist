import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma'
import { ChangePasswordSchema, handleZodError } from '@/lib/validate'
import { requireAuth } from '@/lib/auth'
import { handleForbidden, handleNotFound, handleUnauthenticated, handleDatabaseError } from '@/lib/error-handler'

export const POST = requireAuth(async (req: NextRequest, session) => {
    try {
        const body = await req.json();
        const result = ChangePasswordSchema.safeParse(body);

        if (!result.success) {
            return handleZodError(result.error);
        }

        const { currentPassword, newPassword, urlEnding } = result.data;

        if (urlEnding !== session.urlEnding) {
            return handleForbidden();
        }

        const account = await prisma.accountData.findUnique({
            where: { urlEnding },
        });

        if (!account) {
            return handleNotFound();
        }

        const passwordMatch = await bcrypt.compare(currentPassword, account.password);
        if (!passwordMatch) {
            return handleUnauthenticated();
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.accountData.update({
            where: { urlEnding },
            data: { password: hashedPassword, tokenVersion: { increment: 1 } },
        });

        console.info('[AUDIT] Password changed', { urlEnding, ts: new Date().toISOString() });

        return NextResponse.json({ message: 'Password changed successfully.' }, { status: 200 });
    } catch (err) {
        console.error('Error changing password:', err);
        return handleDatabaseError();
    }
});