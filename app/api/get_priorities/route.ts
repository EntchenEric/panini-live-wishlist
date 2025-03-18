import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    try {
        const urlEnding = req.nextUrl.searchParams.get('urlEnding');

        if (!urlEnding) {
            return new NextResponse(
                JSON.stringify({ message: 'urlEnding not provided.' }),
                { status: 400 }
            );
        }

        const priorities = await prisma.prioritys.findMany({
            where: {
                urlEnding: urlEnding
            },
            select: {
                url: true,
                priority: true
            }
        });

        return new NextResponse(
            JSON.stringify({ 
                message: "Priorities retrieved successfully",
                success: true,
                priorities: priorities
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error('Error getting priorities:', error);
        return new NextResponse(
            JSON.stringify({ 
                message: 'An error occurred while getting priorities.',
                error: String(error)
            }),
            { status: 500 }
        );
    }
} 