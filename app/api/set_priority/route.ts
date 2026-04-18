import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PrioritySchema, handleZodError } from '@/lib/validate'
import { requireAuth } from '@/lib/auth'
import { handleForbidden, handleDatabaseError } from '@/lib/error-handler'

export const POST = requireAuth(async (req: NextRequest, session) => {
    try {
        const body = await req.json();
        const result = PrioritySchema.safeParse(body);

        if (!result.success) {
            return handleZodError(result.error);
        }

        const { urlEnding, url, priority } = result.data;

        if (urlEnding !== session.urlEnding) {
            return handleForbidden();
        }

        await prisma.priorities.upsert({
            where: { urlEnding_url: { urlEnding, url } },
            update: { priority },
            create: { urlEnding, url, priority }
        });

        return NextResponse.json({
            message: "Priority set successfully",
            success: true,
            urlEnding,
            url,
            priority
        }, { status: 200 });
    } catch (error) {
        console.error('Error setting priority:', error);
        return handleDatabaseError();
    }
});