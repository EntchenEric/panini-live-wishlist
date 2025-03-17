import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as zlib from 'zlib'

const prisma = new PrismaClient();

type ResponseData = {
    message: string;
};

export async function GET(req: NextRequest) {
    const urlEnding = req.nextUrl.searchParams.get('urlEnding');

    const backendUrl: string | undefined = process.env.BACKEND_URL;

    if (!urlEnding) {
        return new NextResponse(
            JSON.stringify({ message: 'urlEnding not provided.' }),
            { status: 500 }
        );
    }

    const urlEndingStr = Array.isArray(urlEnding) ? urlEnding[0] : urlEnding;

    try {
        const existingAccount = await prisma.accountData.findUnique({
            where: {
                urlEnding: urlEndingStr,
            },
        });

        if (!existingAccount) {
            return new NextResponse(
                JSON.stringify({ message: 'No user found.' }),
                { status: 409 }
            );
        }

        const response = await fetch(backendUrl + "/get_wishlist_complete", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: existingAccount.email,
                password: existingAccount.password,
            }),
        });

        if (response.status !== 200) {
            return new NextResponse(
                JSON.stringify({ message: "Email or Password are wrong." }),
                { status: 401 }
            );
        }

        const responseData = await response.json();

        const cashString = JSON.stringify(responseData.result);

        const existingCache = await prisma.cashedWishlist.findUnique({
            where: {
                urlEnding: urlEndingStr,
            },
        });

        if (existingCache) {
            await prisma.cashedWishlist.update({
                where: {
                    urlEnding: urlEndingStr,
                },
                data: {
                    cash: zlib.gzipSync(cashString),
                },
            });

            return new NextResponse(
                JSON.stringify({ message: 'Wishlist successfully updated.', responseData: responseData }),
                { status: 200 }
            );
        } else {
            await prisma.cashedWishlist.create({
                data: {
                    urlEnding: urlEndingStr,
                    cash: zlib.gzipSync(cashString),
                },
            });

            return new NextResponse(
                JSON.stringify({ message: 'Wishlist successfully created and fetched.', responseData:responseData }),
                { status: 201 }
            );
        }

    } catch (err) {
        console.error('Error querying the database:', err);
        return new NextResponse(
            JSON.stringify({ message: 'Error querying the database.' }),
            { status: 500 }
        );
    }
}
