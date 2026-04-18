import { NextRequest, NextResponse } from 'next/server'
import { verifySession, clearSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const response = NextResponse.json({ message: 'Logged out successfully.' }, { status: 200 });
    return clearSessionCookie(response);
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ message: 'An error occurred during logout.' }, { status: 500 });
  }
}