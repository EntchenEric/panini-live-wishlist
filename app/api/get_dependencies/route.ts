import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { handleForbidden, handleDatabaseError } from '@/lib/error-handler'

export const GET = requireAuth(async (req: NextRequest, session) => {
  try {
    const urlEnding = req.nextUrl.searchParams.get('urlEnding');
    const url = req.nextUrl.searchParams.get('url');

    if (!urlEnding || !url) {
      return NextResponse.json({ message: 'Missing required parameters.' }, { status: 400 });
    }

    if (urlEnding !== session.urlEnding) {
      return handleForbidden();
    }

    const dependencies = await prisma.dependency.findMany({
      where: { urlEnding, url },
      select: { dependencyUrl: true }
    });

    return NextResponse.json({ dependencies }, { status: 200 });
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    return handleDatabaseError();
  }
});