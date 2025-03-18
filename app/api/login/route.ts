import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { encrypt } from '@/lib/encrypt'
import { decrypt } from '@/lib/decrypt'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, urlEnding } = body;

        if (!email || !password || !urlEnding) {
            return new NextResponse(
                JSON.stringify({ message: 'Email, password, or urlEnding not provided.' }),
                { status: 400 }
            );
        }

        const account = await prisma.accountData.findFirstOrThrow({
            where: {
                email: encrypt(email),
                urlEnding: urlEnding
            }
        });
        
        if (!account) {
            return new NextResponse(
                JSON.stringify({ message: "URL ending does not match the account." }),
                { status: 403 }
            );
        }

        return new NextResponse(
            JSON.stringify({ 
                message: "Authentication successful",
                success: true,
                urlEnding: urlEnding
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error('Login error:', error);
        return new NextResponse(
            JSON.stringify({ message: 'An error occurred during login.' }),
            { status: 500 }
        );
    }
} 