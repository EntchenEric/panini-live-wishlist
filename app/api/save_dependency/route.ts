import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { urlEnding, url, dependencyUrl } = body;

    if (!urlEnding || !url || !dependencyUrl) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const dependency = await prisma.dependency.upsert({
      where: {
        urlEnding_url: {
          urlEnding,
          url,
        },
      },
      update: {
        dependencyUrl,
      },
      create: {
        urlEnding,
        url,
        dependencyUrl,
      },
    });

    return NextResponse.json({ dependency });
  } catch (error) {
    console.error('Error saving dependency:', error);
    return NextResponse.json({ error: 'Failed to save dependency' }, { status: 500 });
  }
} 