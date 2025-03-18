import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const urlEnding = searchParams.get('urlEnding');
    const url = searchParams.get('url');
    
    if (!urlEnding || !url) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    const noteRecord = await prisma.note.findUnique({
      where: {
        urlEnding_url: {
          urlEnding: urlEnding,
          url: url
        }
      }
    });
    
    if (!noteRecord) {
      return NextResponse.json({ note: '' }, { status: 200 });
    }
    
    return NextResponse.json({ note: noteRecord.note }, { status: 200 });
  } catch (error) {
    console.error('Error getting note:', error);
    return NextResponse.json({ error: 'Failed to retrieve note' }, { status: 500 });
  }
} 