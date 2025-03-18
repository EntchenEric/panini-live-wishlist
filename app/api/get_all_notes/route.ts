import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const urlEnding = searchParams.get('urlEnding');
    
    if (!urlEnding) {
      return NextResponse.json({ error: 'Missing required parameter: urlEnding' }, { status: 400 });
    }
    
    const notes = await prisma.note.findMany({
      where: {
        urlEnding: urlEnding
      },
      select: {
        url: true,
        note: true
      }
    });
    
    return NextResponse.json({ notes }, { status: 200 });
  } catch (error) {
    console.error('Error getting notes:', error);
    return NextResponse.json({ error: 'Failed to retrieve notes' }, { status: 500 });
  }
} 