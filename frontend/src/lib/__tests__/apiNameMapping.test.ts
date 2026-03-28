import { getApiName, API_NAME_MAP } from '../apiNameMapping'

describe('getApiName', () => {
  it('parses "METHOD path" format', () => {
    const result = getApiName('GET /v1/admin/models')
    expect(result.method).toBe('GET')
    expect(result.path).toBe('/v1/admin/models')
    expect(result.name).toBe('模型配置列表')
  })

  it('parses legacy single-word format', () => {
    const result = getApiName('/v1/admin/usage/summary')
    expect(result.name).toBe('用量统计')
  })

  it('strips UUID path suffix', () => {
    const result = getApiName('GET /v1/admin/models/550e8400-e29b-41d4-a716-446655440000')
    expect(result.name).toBe('模型配置列表')
  })

  it('strips numeric ID suffix', () => {
    const result = getApiName('DELETE /v1/admin/models/42')
    expect(result.name).toBe('模型配置列表')
  })

  it('returns fallback name for unknown path', () => {
    const result = getApiName('GET /v1/unknown/endpoint')
    expect(result.name).toBeTruthy()
    expect(typeof result.name).toBe('string')
  })

  it('returns correct method for POST', () => {
    const result = getApiName('POST /v1/admin/models')
    expect(result.method).toBe('POST')
  })

  it('all API_NAME_MAP entries produce correct name', () => {
    for (const [path, expectedName] of Object.entries(API_NAME_MAP)) {
      const result = getApiName(`GET ${path}`)
      expect(result.name).toBe(expectedName)
    }
  })
})
