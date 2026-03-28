import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from '@/stores/authStore'

// Reset store state between tests
beforeEach(() => {
  useAuthStore.setState({
    token: null,
    userId: null,
    _hasHydrated: false,
  })
})

describe('useAuthStore', () => {
  it('has correct initial state', () => {
    const { result } = renderHook(() => useAuthStore())
    expect(result.current.token).toBeNull()
    expect(result.current.userId).toBeNull()
  })

  it('setToken updates token', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.setToken('abc123')
    })
    expect(result.current.token).toBe('abc123')
  })

  it('setUserId updates userId', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.setUserId('user-1')
    })
    expect(result.current.userId).toBe('user-1')
  })

  it('logout clears token and userId', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.setToken('abc123')
      result.current.setUserId('user-1')
    })
    act(() => {
      result.current.logout()
    })
    expect(result.current.token).toBeNull()
    expect(result.current.userId).toBeNull()
  })

  it('setHasHydrated updates hydration state', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => {
      result.current.setHasHydrated(true)
    })
    expect(result.current._hasHydrated).toBe(true)
  })
})
