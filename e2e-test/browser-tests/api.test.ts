import { test, expect, request as apiRequest } from '@playwright/test'

const port = process.env.TEST_PORT || '3000'
const apiBaseURL = `http://localhost:${port}`

test.describe('API Endpoints', () => {
  test('should return addresses from SDK API', async () => {
    const context = await apiRequest.newContext({ baseURL: apiBaseURL })
    const response = await context.get('/api/sdk/addresses')
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('addresses')
    await context.dispose()
  })

  test('should validate contracts endpoint', async () => {
    const context = await apiRequest.newContext({ baseURL: apiBaseURL })
    const response = await context.get('/api/sdk/validate-contracts')
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('validations')
    expect(Array.isArray(data.validations)).toBeTruthy()
    await context.dispose()
  })

  test('should fetch deployment plan', async () => {
    const context = await apiRequest.newContext({ baseURL: apiBaseURL })
    const response = await context.get('/testing/deploy/plan')
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('contracts')
    expect(Array.isArray(data.contracts)).toBeTruthy()
    await context.dispose()
  })
})
