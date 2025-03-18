import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { urlEnding, url, priority } = body;

        if (!urlEnding || !url || priority === undefined) {
            return new NextResponse(
                JSON.stringify({ message: 'urlEnding, url, or priority not provided.' }),
                { status: 400 }
            );
        }

        const priorityNumber = Number(priority);
        if (isNaN(priorityNumber) || priorityNumber < 1 || priorityNumber > 10) {
            return new NextResponse(
                JSON.stringify({ message: 'Priority must be a number between 1 and 10.' }),
                { status: 400 }
            );
        }

        const existingPriority = await prisma.prioritys.findUnique({
            where: {
                urlEnding_url: {
                    urlEnding: urlEnding,
                    url: url
                }
            }
        });

        if (existingPriority) {
            await prisma.prioritys.update({
                where: {
                    urlEnding_url: {
                        urlEnding: urlEnding,
                        url: url
                    }
                },
                data: {
                    priority: priorityNumber
                }
            });
        } else {
            await prisma.prioritys.create({
                data: {
                    urlEnding: urlEnding,
                    url: url,
                    priority: priorityNumber
                }
            });
        }

        return new NextResponse(
            JSON.stringify({ 
                message: "Priority set successfully",
                success: true,
                urlEnding: urlEnding,
                url: url,
                priority: priorityNumber
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error('Error setting priority:', error);
        return new NextResponse(
            JSON.stringify({ 
                message: 'An error occurred while setting the priority.',
                error: String(error)
            }),
            { status: 500 }
        );
    }
} 