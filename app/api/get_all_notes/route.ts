import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { handleForbidden, handleDatabaseError } from '@/lib/error-handler'

export const GET = requireAuth(async (req: NextRequest, session) => {
  try {
    const urlEnding = req.nextUrl.searchParams.get('urlEnding');

    if (!urlEnding) {
      return NextResponse.json({ message: 'Missing required parameter: urlEnding' }, { status: 400 });
    }

    if (urlEnding !== session.urlEnding) {
      return handleForbidden();
    }

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '100', 10), 500);
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: { urlEnding },
        select: { url: true, note: true },
        skip,
        take: limit,
      }),
      prisma.note.count({ where: { urlEnding } }),
    ]);

    return NextResponse.json({
      notes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting notes:', error);
    return handleDatabaseError();
  }
});