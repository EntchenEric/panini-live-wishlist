import { describe, it, expect } from 'vitest'
import { getPriorityStyle, getPriorityTier } from '@/components/item/PriorityBadge'

describe('getPriorityStyle', () => {
  it('should return empty string for undefined priority', () => {
    expect(getPriorityStyle(undefined)).toBe('')
  })

  it('should return green style for low priority', () => {
    expect(getPriorityStyle(1)).toContain('green')
    expect(getPriorityStyle(2)).toContain('green')
    expect(getPriorityStyle(3)).toContain('green')
  })

  it('should return yellow style for medium priority', () => {
    expect(getPriorityStyle(4)).toContain('yellow')
    expect(getPriorityStyle(5)).toContain('yellow')
    expect(getPriorityStyle(6)).toContain('yellow')
  })

  it('should return red style for high priority', () => {
    expect(getPriorityStyle(7)).toContain('red')
    expect(getPriorityStyle(8)).toContain('red')
    expect(getPriorityStyle(10)).toContain('red')
  })
})

describe('getPriorityTier', () => {
  it('should return null for undefined', () => {
    expect(getPriorityTier(undefined)).toBeNull()
  })

  it('should return low for 1-3', () => {
    expect(getPriorityTier(1)).toBe('low')
    expect(getPriorityTier(2)).toBe('low')
    expect(getPriorityTier(3)).toBe('low')
  })

  it('should return medium for 4-6', () => {
    expect(getPriorityTier(4)).toBe('medium')
    expect(getPriorityTier(5)).toBe('medium')
    expect(getPriorityTier(6)).toBe('medium')
  })

  it('should return high for 7-10', () => {
    expect(getPriorityTier(7)).toBe('high')
    expect(getPriorityTier(8)).toBe('high')
    expect(getPriorityTier(10)).toBe('high')
  })
})