import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      urlEnding: session.urlEnding
    }, { status: 200 });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}