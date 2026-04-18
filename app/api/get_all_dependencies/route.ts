import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { handleForbidden, handleDatabaseError } from '@/lib/error-handler'

export const POST = requireAuth(async (req: NextRequest, session) => {
  try {
    const body = await req.json()
    const { urlEnding } = body

    if (!urlEnding) {
      return NextResponse.json({ message: 'Missing urlEnding.' }, { status: 400 })
    }

    if (urlEnding !== session.urlEnding) {
      return handleForbidden()
    }

    const dependencies = await prisma.dependency.findMany({
      where: { urlEnding },
      select: { url: true, dependencyUrl: true },
    })

    // Group by url for easy client-side lookup
    const grouped: Record<string, string[]> = {}
    for (const dep of dependencies) {
      if (!grouped[dep.url]) {
        grouped[dep.url] = []
      }
      grouped[dep.url].push(dep.dependencyUrl)
    }

    return NextResponse.json({ dependencies: grouped }, { status: 200 })
  } catch (error) {
    console.error('Error fetching all dependencies:', error)
    return handleDatabaseError()
  }
})