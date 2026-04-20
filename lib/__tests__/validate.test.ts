import { describe, it, expect } from 'vitest'
import {
  CreateUserSchema,
  LoginSchema,
  ChangePasswordSchema,
  NoteSchema,
  PrioritySchema,
  DependencySchema,
} from '../validate'

describe('CreateUserSchema', () => {
  it('accepts valid input', () => {
    const result = CreateUserSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
      urlEnding: 'my-wishlist',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = CreateUserSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
      urlEnding: 'my-wishlist',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = CreateUserSchema.safeParse({
      email: 'test@example.com',
      password: '',
      urlEnding: 'my-wishlist',
    })
    expect(result.success).toBe(false)
  })

  it('rejects urlEnding with special chars', () => {
    const result = CreateUserSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      urlEnding: 'bad_ending!',
    })
    expect(result.success).toBe(false)
  })
})

describe('LoginSchema', () => {
  it('accepts valid input', () => {
    const result = LoginSchema.safeParse({
      email: 'test@example.com',
      password: 'mypassword',
      urlEnding: 'my-wishlist',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty password', () => {
    const result = LoginSchema.safeParse({
      email: 'test@example.com',
      password: '',
      urlEnding: 'my-wishlist',
    })
    expect(result.success).toBe(false)
  })
})

describe('ChangePasswordSchema', () => {
  it('accepts valid input', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'oldpassword',
      newPassword: 'Newpassword123!',
      urlEnding: 'my-wishlist',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty new password', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'oldpassword',
      newPassword: '',
      urlEnding: 'my-wishlist',
    })
    expect(result.success).toBe(false)
  })
})

describe('NoteSchema', () => {
  it('accepts valid input', () => {
    const result = NoteSchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic',
      note: 'Great comic!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty note', () => {
    const result = NoteSchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic',
      note: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('PrioritySchema', () => {
  it('accepts valid priority', () => {
    const result = PrioritySchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic',
      priority: 5,
    })
    expect(result.success).toBe(true)
  })

  it('defaults priority to 5 when omitted', () => {
    const result = PrioritySchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priority).toBe(5)
    }
  })

  it('rejects priority out of range', () => {
    const result = PrioritySchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic',
      priority: 11,
    })
    expect(result.success).toBe(false)
  })
})

describe('DependencySchema', () => {
  it('accepts valid input', () => {
    const result = DependencySchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic1',
      dependencyUrl: 'https://www.panini.de/comic2',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty dependency URL', () => {
    const result = DependencySchema.safeParse({
      urlEnding: 'my-wishlist',
      url: 'https://www.panini.de/comic1',
      dependencyUrl: '',
    })
    expect(result.success).toBe(false)
  })
})