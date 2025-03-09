import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { encrypt } from '@/lib/encrypt'

const prisma = new PrismaClient()

type ResponseData = {
    message: string
}

export async function GET(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email')
    const password = req.nextUrl.searchParams.get('password')
    const urlEnding = req.nextUrl.searchParams.get('urlEnding')

    if (!email || !password || !urlEnding) {
        return new NextResponse(
            JSON.stringify({ message: 'Email, password, or urlEnding not provided.' }),
            { status: 500 }
        );
    }

    const emailStr = Array.isArray(email) ? email[0] : email;
    const passwordStr = Array.isArray(password) ? password[0] : password;
    const urlEndingStr = Array.isArray(urlEnding) ? urlEnding[0] : urlEnding;

    try {
        // Check if account with this email exists
        const existingAccount = await prisma.accountData.findUnique({
            where: {
                email: emailStr,
            },
        });

        if (existingAccount) {
            return new NextResponse(
                JSON.stringify({ message: 'A user with this E-Mail already exists.' }),
                { status: 409 }
            );
        }

        const existingUrlEnding = await prisma.accountData.findUnique({
            where: {
                urlEnding: urlEndingStr,
            },
        });

        if (existingUrlEnding) {
            return new NextResponse(
                JSON.stringify({ message: 'This URL ending already exists.' }),
                { status: 409 }
            );
        }

        const encryptedEmail = encrypt(emailStr);
        const encryptedPassword = encrypt(passwordStr);

        await prisma.accountData.create({
            data: {
                email: encryptedEmail,
                password: encryptedPassword,
                urlEnding: urlEndingStr,
            },
        });

        return new NextResponse(
            JSON.stringify({ message: 'Account created successfully.' }),
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
