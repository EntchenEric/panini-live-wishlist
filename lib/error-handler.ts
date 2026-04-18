import { NextResponse } from 'next/server';
import crypto from 'crypto';

export function createError(message: string, statusCode: number = 500): NextResponse {
  const errorId = crypto.randomUUID();

  return NextResponse.json(
    { message, errorId },
    {
      status: statusCode,
      headers: { 'X-Error-Id': errorId }
    }
  );
}

export function handleExists(): NextResponse {
  return NextResponse.json(
    { message: 'Resource already exists', errorId: crypto.randomUUID() },
    { status: 409 }
  );
}

export function handleNotFound(): NextResponse {
  return NextResponse.json(
    { message: 'Resource not found', errorId: crypto.randomUUID() },
    { status: 404 }
  );
}

export function handleUnauthenticated(): NextResponse {
  return NextResponse.json(
    { message: 'Authentication required', errorId: crypto.randomUUID() },
    { status: 401 }
  );
}

export function handleForbidden(): NextResponse {
  return NextResponse.json(
    { message: 'Access forbidden', errorId: crypto.randomUUID() },
    { status: 403 }
  );
}

export function handleDatabaseError(): NextResponse {
  return NextResponse.json(
    { message: 'Database error', errorId: crypto.randomUUID() },
    { status: 503 }
  );
}