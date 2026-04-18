import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encrypt'
import { CreateUserSchema, handleZodError } from '@/lib/validate'
import { createError } from '@/lib/error-handler'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const result = CreateUserSchema.safeParse(body);

        if (!result.success) {
            return handleZodError(result.error);
        }

        const { email, password, urlEnding } = result.data;
        const backendUrl: string | undefined = process.env.BACKEND_URL;

        const response = await fetch(backendUrl + "/test_account", {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.FLASK_API_KEY || '' },
            body: JSON.stringify({
                email: encrypt(email),
                password: encrypt(password)
            })
        })

        if (response.status !== 200) {
            return NextResponse.json(
                { message: "Email or Password are wrong.", errorId: crypto.randomUUID() },
                { status: 401 }
            )
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 12);
            const encryptedEmail = encrypt(email);

            await prisma.accountData.create({
                data: {
                    email: encryptedEmail,
                    password: hashedPassword,
                    urlEnding,
                    encryptedPaniniPassword: encrypt(password),
                },
            });

            return NextResponse.json({ message: 'Account created successfully.' }, { status: 201 });
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
                return NextResponse.json(
                    { message: 'An account with these details already exists.' },
                    { status: 409 }
                );
            }
            console.error('Error creating account:', err);
            return createError('Error creating account.');
        }
    } catch (err) {
        console.error('Error in create_user:', err);
        return NextResponse.json({ message: 'Error creating account.' }, { status: 500 });
    }
}