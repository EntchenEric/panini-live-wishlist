import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'
import { NoteSchema, handleZodError } from '@/lib/validate'
import { requireAuth } from '@/lib/auth'
import { handleForbidden, handleDatabaseError } from '@/lib/error-handler'

export const POST = requireAuth(async (req: NextRequest, session) => {
  try {
    const body = await req.json();
    const result = NoteSchema.safeParse(body);

    if (!result.success) {
      return handleZodError(result.error);
    }

    const { urlEnding, url, note } = result.data;

    if (urlEnding !== session.urlEnding) {
      return handleForbidden();
    }

    const savedNote = await prisma.note.upsert({
      where: { urlEnding_url: { urlEnding, url } },
      update: { note },
      create: { urlEnding, url, note }
    });

    return NextResponse.json({ success: true, note: savedNote.note }, { status: 200 });
  } catch (error) {
    console.error('Error saving note:', error);
    return handleDatabaseError();
  }
});