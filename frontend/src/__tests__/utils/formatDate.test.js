import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatDate } from '../../utils/formatDate'

// Pin "now" to a fixed date so relative labels are deterministic
const FAKE_NOW = new Date('2024-06-15T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FAKE_NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('formatDate', () => {
  it('returns "Today" for a timestamp on the current date', () => {
    const ts = new Date('2024-06-15T08:30:00.000Z').toISOString()
    expect(formatDate(ts)).toBe('Today')
  })

  it('returns "Yesterday" for a timestamp on the previous date', () => {
    const ts = new Date('2024-06-14T08:00:00.000Z').toISOString()
    expect(formatDate(ts)).toBe('Yesterday')
  })

  it('returns a short date for older dates in the same year', () => {
    const ts = new Date('2024-01-12T10:00:00.000Z').toISOString()
    // Expected format: "12 Jan" — matches the formatDate util pattern
    expect(formatDate(ts)).toMatch(/12.*(Jan|January)/i)
  })

  it('returns a date with year for dates in a previous year', () => {
    const ts = new Date('2023-03-05T10:00:00.000Z').toISOString()
    expect(formatDate(ts)).toMatch(/2023/)
  })

  it('returns a non-empty string for any valid ISO timestamp', () => {
    const ts = new Date('2022-11-20T00:00:00.000Z').toISOString()
    expect(typeof formatDate(ts)).toBe('string')
    expect(formatDate(ts).length).toBeGreaterThan(0)
  })

  it('does not throw for an invalid date string', () => {
    expect(() => formatDate('not-a-date')).not.toThrow()
  })

  it('does not throw for a future date', () => {
    const ts = new Date('2099-01-01T00:00:00.000Z').toISOString()
    expect(() => formatDate(ts)).not.toThrow()
  })

  it('returns a string for undefined/null input', () => {
    expect(() => formatDate(undefined)).not.toThrow()
    expect(() => formatDate(null)).not.toThrow()
  })
})