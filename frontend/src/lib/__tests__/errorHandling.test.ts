import { ApiError, classifyError, getErrorMessage, ErrorTypes } from '../errorHandling'

describe('ApiError', () => {
  it('constructs with defaults', () => {
    const err = new ApiError('something failed')
    expect(err.message).toBe('something failed')
    expect(err.code).toBe('UNKNOWN_ERROR')
    expect(err.status).toBe(500)
    expect(err.name).toBe('ApiError')
    expect(err).toBeInstanceOf(Error)
  })

  it('constructs with explicit values', () => {
    const err = new ApiError('forbidden', 'AUTH_DENIED', 403, 'trace-123')
    expect(err.code).toBe('AUTH_DENIED')
    expect(err.status).toBe(403)
    expect(err.traceId).toBe('trace-123')
  })

  it('fromResponse parses error envelope', () => {
    const response = {
      error: { code: 'VAL_BAD_INPUT', message: 'bad input', trace_id: 'tid-1' },
    }
    const err = ApiError.fromResponse(response)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('VAL_BAD_INPUT')
    expect(err.message).toBe('bad input')
    expect(err.traceId).toBe('tid-1')
  })

  it('fromResponse returns generic error for non-envelope', () => {
    const err = ApiError.fromResponse({ data: 'something' })
    expect(err.message).toBe('请求失败')
    expect(err.code).toBe('UNKNOWN_ERROR')
  })
})

describe('classifyError', () => {
  it('classifies AUTH_ prefixed ApiError as AUTH', () => {
    const err = new ApiError('unauthorized', 'AUTH_REQUIRED', 401)
    expect(classifyError(err)).toBe('AUTH')
  })

  it('classifies VAL_ prefixed ApiError as VALIDATION', () => {
    const err = new ApiError('invalid', 'VAL_MISSING_FIELD', 422)
    expect(classifyError(err)).toBe('VALIDATION')
  })

  it('classifies SYS_ prefixed ApiError as SERVER', () => {
    const err = new ApiError('server error', 'SYS_DB_ERROR', 500)
    expect(classifyError(err)).toBe('SERVER')
  })

  it('classifies TypeError with fetch as NETWORK', () => {
    const err = new TypeError('Failed to fetch')
    expect(classifyError(err)).toBe('NETWORK')
  })

  it('classifies Error with network keyword as NETWORK', () => {
    const err = new Error('network timeout')
    expect(classifyError(err)).toBe('NETWORK')
  })

  it('classifies Error with 401 as AUTH', () => {
    const err = new Error('got 401 response')
    expect(classifyError(err)).toBe('AUTH')
  })

  it('classifies unknown as UNKNOWN', () => {
    expect(classifyError(new Error('something random'))).toBe('UNKNOWN')
  })
})

describe('getErrorMessage', () => {
  it('returns ApiError message directly', () => {
    const err = new ApiError('specific api error')
    expect(getErrorMessage(err)).toBe('specific api error')
  })

  it('returns network message for network error', () => {
    const err = new TypeError('Failed to fetch')
    expect(getErrorMessage(err)).toBe('网络连接失败，请检查网络后重试')
  })

  it('returns auth message for auth error', () => {
    const err = new Error('got 401 response')
    expect(getErrorMessage(err)).toBe('登录已过期，请重新登录')
  })

  it('returns fallback for unknown error', () => {
    expect(getErrorMessage('some string error')).toBe('发生未知错误，请重试')
  })

  it('returns generic message for unknown Error', () => {
    const err = new Error('something random')
    expect(getErrorMessage(err)).toBe('something random')
  })
})
