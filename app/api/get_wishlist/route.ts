import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { promisify } from 'util';
import zlib from 'zlib';

const gzip = promisify(zlib.gzip);

export const POST = requireAuth(async (req: NextRequest, session) => {
    const urlEnding = req.nextUrl.searchParams.get('urlEnding');
    const backendUrl: string | undefined = process.env.BACKEND_URL;

    if (!urlEnding) {
        return NextResponse.json({ message: 'urlEnding not provided.' }, { status: 400 });
    }

    if (urlEnding !== session.urlEnding) {
        return NextResponse.json({ message: 'Not authorized.' }, { status: 403 });
    }

    try {
        const account = await prisma.accountData.findUnique({
            where: { urlEnding },
        });

        if (!account) {
            return NextResponse.json({ message: 'No user found.' }, { status: 404 });
        }

        if (!account.encryptedPaniniPassword) {
            return NextResponse.json({ message: 'Panini credentials not stored. Please re-enter your credentials.' }, { status: 403 });
        }

        const response = await fetch(backendUrl + "/get_wishlist_complete", {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.FLASK_API_KEY || '' },
            body: JSON.stringify({
                email: account.email,
                password: account.encryptedPaniniPassword,
            }),
            signal: AbortSignal.timeout(60000),
        });

        if (response.status !== 200) {
            return NextResponse.json({ message: "Email or Password are wrong." }, { status: 401 });
        }

        const responseData = await response.json();
        const cashString = JSON.stringify(responseData.result);
        const compressed = await gzip(Buffer.from(cashString));

        const existingCache = await prisma.cachedWishlist.findUnique({
            where: { urlEnding },
        });

        if (existingCache) {
            await prisma.cachedWishlist.update({
                where: { urlEnding },
                data: { cash: compressed },
            });

            return NextResponse.json({ message: 'Wishlist successfully updated.', responseData }, { status: 200 });
        } else {
            await prisma.cachedWishlist.create({
                data: { urlEnding, cash: compressed },
            });

            return NextResponse.json({ message: 'Wishlist successfully created and fetched.', responseData }, { status: 201 });
        }
    } catch (err) {
        console.error('Error fetching wishlist:', err);
        return NextResponse.json({ message: 'Error fetching wishlist.' }, { status: 500 });
    }
});