import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as zlib from 'zlib'

const prisma = new PrismaClient()

type ResponseData = {
    message: string
}

export async function GET(req: NextRequest) {
    const urlEnding = req.nextUrl.searchParams.get('urlEnding')

    const backendUrl: string | undefined = process.env.BACKEND_URL;

    if (!urlEnding) {
        return new NextResponse(
            JSON.stringify({ message: 'urlEnding not provided.' }),
            { status: 500 }
        );
    }

    const urlEndingStr = Array.isArray(urlEnding) ? urlEnding[0] : urlEnding;

    try {
        const cash = await prisma.cashedWishlist.findUnique({
            where: {
                urlEnding: urlEndingStr,
            },
            select: {
                cash: true
            }
        });

        if (!cash) {
            return new NextResponse(
                JSON.stringify({ message: 'No cash found.' }),
                { status: 409 }
            );
        }

        const decompressedData = zlib.gunzipSync(cash.cash).toString();

        return new NextResponse(
            JSON.stringify({ message: 'Cashed Wishlist successfully fetched.', cash: JSON.parse(decompressedData) }),
            { status: 201 }
        );
    } catch (err) {
        console.error('Error querying the database:', err);
        return new NextResponse(
            JSON.stringify({ message: 'Error querying the database.' }),
            { status: 500 }
        );
    }
}
