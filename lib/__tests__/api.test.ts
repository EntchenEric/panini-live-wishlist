import { describe, it, expect, vi } from 'vitest'

// Mock Prisma before importing anything that uses it
vi.mock('@/lib/prisma', () => ({
  prisma: {
    accountData: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    prioritys: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    note: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    dependency: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    cashedWishlist: {
      findUnique: vi.fn(),
    },
    cashedComicData: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}))

// Mock encrypt
vi.mock('@/lib/encrypt', () => ({
  encrypt: vi.fn((text: string) => `encrypted_${text}`),
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn((handler: Function) => handler),
  verifySession: vi.fn(),
  createSession: vi.fn(),
  setSessionCookie: vi.fn((res: unknown) => res),
  clearSessionCookie: vi.fn((res: unknown) => res),
}))

describe('Health API', () => {
  it('should return a status response', async () => {
    const { GET } = await import('@/app/api/health/route')
    const response = await GET(new Request('http://localhost/api/health'))
    expect([200, 503]).toContain(response.status)
    const data = await response.json()
    expect(data).toHaveProperty('status')
  })
})

describe('Session API', () => {
  it('should return 401 when not authenticated', async () => {
    const { verifySession } = await import('@/lib/auth')
    vi.mocked(verifySession).mockResolvedValueOnce(null)

    const { GET } = await import('@/app/api/session/route')
    const response = await GET(new Request('http://localhost/api/session'))
    expect(response.status).toBe(401)
  })
})

describe('Logout API', () => {
  it('should return 401 when not authenticated', async () => {
    const { verifySession } = await import('@/lib/auth')
    vi.mocked(verifySession).mockResolvedValueOnce(null)

    const { POST } = await import('@/app/api/logout/route')
    const response = await POST(new Request('http://localhost/api/logout', { method: 'POST' }))
    expect(response.status).toBe(401)
  })
})

describe('Create User Validation', () => {
  it('should reject missing email', async () => {
    const { CreateUserSchema } = await import('@/lib/validate')
    const result = CreateUserSchema.safeParse({
      password: 'Password123!',
      urlEnding: 'my-wishlist',
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing password', async () => {
    const { CreateUserSchema } = await import('@/lib/validate')
    const result = CreateUserSchema.safeParse({
      email: 'test@example.com',
      urlEnding: 'my-wishlist',
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing urlEnding', async () => {
    const { CreateUserSchema } = await import('@/lib/validate')
    const result = CreateUserSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
    })
    expect(result.success).toBe(false)
  })

  it('should accept valid input with strong password', async () => {
    const { CreateUserSchema } = await import('@/lib/validate')
    const result = CreateUserSchema.safeParse({
      email: 'test@example.com',
      password: 'Str0ng!Pass',
      urlEnding: 'my-wishlist',
    })
    expect(result.success).toBe(true)
  })
})

describe('Note Validation', () => {
  it('should reject empty note', async () => {
    const { NoteSchema } = await import('@/lib/validate')
    const result = NoteSchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic',
      note: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject note exceeding max length', async () => {
    const { NoteSchema } = await import('@/lib/validate')
    const result = NoteSchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic',
      note: 'a'.repeat(10001),
    })
    expect(result.success).toBe(false)
  })
})

describe('Priority Validation', () => {
  it('should reject priority out of range (too high)', async () => {
    const { PrioritySchema } = await import('@/lib/validate')
    const result = PrioritySchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic',
      priority: 11,
    })
    expect(result.success).toBe(false)
  })

  it('should reject priority out of range (too low)', async () => {
    const { PrioritySchema } = await import('@/lib/validate')
    const result = PrioritySchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic',
      priority: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('Dependency Validation', () => {
  it('should reject empty dependency URL', async () => {
    const { DependencySchema } = await import('@/lib/validate')
    const result = DependencySchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic1',
      dependencyUrl: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('Comic URL Validation', () => {
  it('should accept valid Panini URLs', async () => {
    const { ComicUrlSchema } = await import('@/lib/validate')
    const result = ComicUrlSchema.safeParse('https://www.panini.de/comics/batman-1.html')
    expect(result.success).toBe(true)
  })

  it('should reject non-Panini URLs', async () => {
    const { ComicUrlSchema } = await import('@/lib/validate')
    const result = ComicUrlSchema.safeParse('https://www.example.com/comic')
    expect(result.success).toBe(false)
  })
})

describe('Error Handler', () => {
  it('should create error with correct status code', async () => {
    const { createError } = await import('@/lib/error-handler')
    const response = createError('Test error', 400)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.message).toBe('Test error')
    expect(data).toHaveProperty('errorId')
  })

  it('should default to 500 status code', async () => {
    const { createError } = await import('@/lib/error-handler')
    const response = createError('Server error')
    expect(response.status).toBe(500)
  })

  it('should return 404 for handleNotFound', async () => {
    const { handleNotFound } = await import('@/lib/error-handler')
    const response = handleNotFound()
    expect(response.status).toBe(404)
  })

  it('should return 403 for handleForbidden', async () => {
    const { handleForbidden } = await import('@/lib/error-handler')
    const response = handleForbidden()
    expect(response.status).toBe(403)
  })

  it('should return 401 for handleUnauthenticated', async () => {
    const { handleUnauthenticated } = await import('@/lib/error-handler')
    const response = handleUnauthenticated()
    expect(response.status).toBe(401)
  })

  it('should return 503 for handleDatabaseError', async () => {
    const { handleDatabaseError } = await import('@/lib/error-handler')
    const response = handleDatabaseError()
    expect(response.status).toBe(503)
  })

  it('should return 409 for handleExists', async () => {
    const { handleExists } = await import('@/lib/error-handler')
    const response = handleExists()
    expect(response.status).toBe(409)
  })
})