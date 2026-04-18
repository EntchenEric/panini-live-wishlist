import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock toast
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock wishlist events
vi.mock('@/lib/wishlist-events', () => ({
  useWishlistEvents: () => ({
    lastEvent: null,
    emit: vi.fn(),
  }),
}))

describe('usePriorities', () => {
  it('should fetch priorities on mount when logged in', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        priorities: [
          { url: 'https://www.panini.de/comic1', priority: 5 },
          { url: 'https://www.panini.de/comic2', priority: 8 },
        ],
      }),
    })

    const { usePriorities } = await import('@/app/[urlEnding]/hooks/usePriorities')
    renderHook(() => usePriorities('my-wishlist', true, Date.now()))

    // Wait for state to update
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/get_priorities?urlEnding=my-wishlist'),
      expect.any(Object)
    )
  })
})

describe('useNotes', () => {
  it('should not fetch when not logged in', async () => {
    mockFetch.mockClear()

    const { useNotes } = await import('@/app/[urlEnding]/hooks/useNotes')
    renderHook(() => useNotes('my-wishlist', false))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/get_all_notes'),
      expect.any(Object)
    )
  })
})

describe('useDependencies', () => {
  it('should not fetch when wishlistData is null', async () => {
    mockFetch.mockClear()

    const { useDependencies } = await import('@/app/[urlEnding]/hooks/useDependencies')
    renderHook(() => useDependencies('my-wishlist', null))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/get_all_dependencies'),
      expect.any(Object)
    )
  })
})

describe('useLoginStatus', () => {
  it('should default to not logged in', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const { useLoginStatus } = await import('@/app/[urlEnding]/hooks/useLoginStatus')
    const { result } = renderHook(() => useLoginStatus('my-wishlist'))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(result.current.isLoggedIn).toBe(false)
  })
})