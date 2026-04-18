import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { promisify } from 'util';
import zlib from 'zlib';
import { requireAuth } from '@/lib/auth'
import { handleForbidden, handleNotFound, handleDatabaseError } from '@/lib/error-handler'

const gunzip = promisify(zlib.gunzip);

export const GET = requireAuth(async (req: NextRequest, session) => {
    const urlEnding = req.nextUrl.searchParams.get('urlEnding')

    if (!urlEnding) {
        return NextResponse.json({ message: 'urlEnding not provided.' }, { status: 400 });
    }

    if (urlEnding !== session.urlEnding) {
        return handleForbidden();
    }

    try {
        const cash = await prisma.cachedWishlist.findUnique({
            where: { urlEnding },
            select: { cash: true }
        });

        if (!cash) {
            return handleNotFound();
        }

        const decompressedData = (await gunzip(cash.cash)).toString();

        return NextResponse.json({ message: 'Cached wishlist fetched.', cash: JSON.parse(decompressedData) }, { status: 200 });
    } catch (err) {
        console.error('Error fetching cached wishlist:', err);
        return handleDatabaseError();
    }
});