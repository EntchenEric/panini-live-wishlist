import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'
import { DependencySchema, handleZodError } from '@/lib/validate'
import { requireAuth } from '@/lib/auth'
import { handleForbidden, handleDatabaseError } from '@/lib/error-handler'

export const POST = requireAuth(async (req: NextRequest, session) => {
  try {
    const body = await req.json();
    const result = DependencySchema.safeParse(body);

    if (!result.success) {
      return handleZodError(result.error);
    }

    const { urlEnding, url, dependencyUrl } = result.data;

    if (urlEnding !== session.urlEnding) {
      return handleForbidden();
    }

    const dependency = await prisma.dependency.upsert({
      where: { urlEnding_url: { urlEnding, url } },
      update: { dependencyUrl },
      create: { urlEnding, url, dependencyUrl }
    });

    return NextResponse.json({ dependency }, { status: 200 });
  } catch (error) {
    console.error('Error saving dependency:', error);
    return handleDatabaseError();
  }
});