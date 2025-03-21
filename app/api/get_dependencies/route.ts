import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const urlEnding = searchParams.get('urlEnding');
    const url = searchParams.get('url');

    if (!urlEnding || !url) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const dependencies = await prisma.dependency.findMany({
      where: {
        urlEnding,
        url,
      },
      select: {
        dependencyUrl: true,
      },
    });

    return NextResponse.json({ dependencies });
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    return NextResponse.json({ error: 'Failed to fetch dependencies' }, { status: 500 });
  }
} 