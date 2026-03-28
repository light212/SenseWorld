import { cn, formatDate, formatDuration } from '../utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('deduplicates tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})

describe('formatDuration', () => {
  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('formats seconds only', () => {
    expect(formatDuration(45000)).toBe('0:45')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(90000)).toBe('1:30')
  })

  it('pads single-digit seconds', () => {
    expect(formatDuration(65000)).toBe('1:05')
  })

  it('formats large duration', () => {
    expect(formatDuration(3661000)).toBe('61:01')
  })
})

describe('formatDate', () => {
  const RealDate = Date

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns time only for today', () => {
    const now = new Date('2024-01-15T14:30:00')
    jest.spyOn(global, 'Date').mockImplementation((arg?: any) => {
      if (arg === undefined) return now as any
      return new RealDate(arg) as any
    })
    const result = formatDate('2024-01-15T10:00:00')
    expect(result).not.toContain('昨天')
    expect(result).toMatch(/\d{2}:\d{2}/)
  })

  it('returns 昨天 prefix for yesterday', () => {
    const now = new Date('2024-01-15T14:30:00')
    jest.spyOn(global, 'Date').mockImplementation((arg?: any) => {
      if (arg === undefined) return now as any
      return new RealDate(arg) as any
    })
    const result = formatDate('2024-01-14T10:00:00')
    expect(result).toContain('昨天')
  })

  it('returns month/day for older dates', () => {
    const now = new Date('2024-01-15T14:30:00')
    jest.spyOn(global, 'Date').mockImplementation((arg?: any) => {
      if (arg === undefined) return now as any
      return new RealDate(arg) as any
    })
    const result = formatDate('2024-01-01T10:00:00')
    expect(result).not.toContain('昨天')
    expect(result).toMatch(/\d+月\d+日|\d+\/\d+/)
  })
})
