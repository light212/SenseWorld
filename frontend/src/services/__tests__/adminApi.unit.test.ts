import { adminApi } from '@/services/adminApi'

const ADMIN_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/v1'

function mockFetch(body: unknown, status = 200) {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => body,
  })
}

beforeEach(() => {
  global.fetch = jest.fn()
  adminApi.setToken('test-token')
})

afterEach(() => {
  jest.resetAllMocks()
  adminApi.setToken(null)
})

describe('adminApi.listModelConfigs', () => {
  it('calls correct endpoint without params', async () => {
    mockFetch([])
    await adminApi.listModelConfigs()
    expect(global.fetch).toHaveBeenCalledWith(
      `${ADMIN_BASE}/admin/models`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    )
  })

  it('appends query params when provided', async () => {
    mockFetch([])
    await adminApi.listModelConfigs({ model_type: 'llm', is_active: true })
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('model_type=llm')
    expect(url).toContain('is_active=true')
  })
})

describe('adminApi.createModelConfig', () => {
  it('sends POST with correct body', async () => {
    const created = { id: '1', model_type: 'llm', model_name: 'gpt-4', provider: 'openai' }
    mockFetch(created, 201)
    const result = await adminApi.createModelConfig({
      model_type: 'llm',
      model_name: 'gpt-4',
      provider: 'openai',
    })
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`${ADMIN_BASE}/admin/models`)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toMatchObject({ model_name: 'gpt-4' })
    expect(result).toEqual(created)
  })
})

describe('adminApi error handling', () => {
  it('throws ApiError on non-ok response', async () => {
    mockFetch({ error: { message: 'Not found', code: 'NOT_FOUND' } }, 404)
    await expect(adminApi.listModelConfigs()).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    })
  })
})

describe('adminApi.getUsageSummary', () => {
  it('calls usage summary endpoint', async () => {
    const summary = {
      total_calls: 10,
      total_input_tokens: 100,
      total_output_tokens: 200,
      total_cost: 0.5,
      by_model_type: {},
    }
    mockFetch(summary)
    const result = await adminApi.getUsageSummary()
    expect(result).toEqual(summary)
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('/admin/usage/summary')
  })
})
