import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { urlEnding, url, note } = body;
    
    if (!urlEnding || !url || note === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    const savedNote = await prisma.note.upsert({
      where: {
        urlEnding_url: {
          urlEnding: urlEnding,
          url: url
        }
      },
      update: {
        note: note
      },
      create: {
        urlEnding: urlEnding,
        url: url,
        note: note
      }
    });
    
    return NextResponse.json({ success: true, note: savedNote.note }, { status: 200 });
  } catch (error) {
    console.error('Error saving note:', error);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
} 