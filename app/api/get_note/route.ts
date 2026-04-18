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

    const noteRecord = await prisma.note.findUnique({
      where: {
        urlEnding_url: { urlEnding, url }
      }
    });

    if (!noteRecord) {
      return NextResponse.json({ note: '' }, { status: 200 });
    }

    return NextResponse.json({ note: noteRecord.note }, { status: 200 });
  } catch (error) {
    console.error('Error getting note:', error);
    return handleDatabaseError();
  }
});