import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('should navigate to Score test page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Open test page' }).first().click()
    await expect(page).toHaveURL(/\/testing\/features\/game\//)
  })

  test('should load score test page without errors', async ({ page }) => {
    const response = await page.goto('/testing/features/game/score')
    expect(response?.status()).toBeLessThan(500)
  })

  test('should load match test page without errors', async ({ page }) => {
    const response = await page.goto('/testing/features/game/match')
    expect(response?.status()).toBeLessThan(500)
  })
})
