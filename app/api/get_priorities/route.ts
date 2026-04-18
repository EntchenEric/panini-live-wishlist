import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { handleForbidden, handleDatabaseError } from '@/lib/error-handler'

export const GET = requireAuth(async (req: NextRequest, session) => {
    try {
        const urlEnding = req.nextUrl.searchParams.get('urlEnding');

        if (!urlEnding) {
            return NextResponse.json({ message: 'urlEnding not provided.' }, { status: 400 });
        }

        if (urlEnding !== session.urlEnding) {
            return handleForbidden();
        }

        const priorities = await prisma.priorities.findMany({
            where: { urlEnding },
            select: { url: true, priority: true }
        });

        return NextResponse.json({
            message: "Priorities retrieved successfully",
            success: true,
            priorities
        }, { status: 200 });
    } catch (error) {
        console.error('Error getting priorities:', error);
        return handleDatabaseError();
    }
});