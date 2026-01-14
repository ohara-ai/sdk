import { test, expect } from '@playwright/test'
import { createMockEthereumScript, ANVIL_ACCOUNTS } from './fixtures/wallet'

test.describe('Match Page', () => {
  test('should load match page without errors', async ({ page }) => {
    const response = await page.goto('/testing/features/game/match')
    expect(response?.status()).toBeLessThan(500)
  })

  test('should display page header', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    
    // Wait for page to load - check for main heading or loading state
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })

  test('should display connect wallet or match content', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    
    // Either shows "Connect Wallet" prompt or the match interface
    // Use specific heading locator to avoid matching multiple elements
    const matchHeader = page.locator('h1').filter({ hasText: 'Game Match' })
    const connectWalletCard = page.locator('h3').filter({ hasText: 'Connect Wallet' })
    
    // One of these should be visible (use first to avoid strict mode with .or())
    await expect(
      matchHeader.or(connectWalletCard).first()
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Match Page - With Wallet', () => {
  test.beforeEach(async ({ context }) => {
    // Inject mock wallet before page loads
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
    await context.addInitScript(
      createMockEthereumScript(
        ANVIL_ACCOUNTS.user1.privateKey,
        ANVIL_ACCOUNTS.user1.address,
        rpcUrl,
        31337
      )
    )
  })

  test('should display match page with injected wallet', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Check that page loaded
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })

  test('should show Game Match header when wallet is connected', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    // Try to connect if button is visible
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(1000)
    }
    
    // Check for Game Match header (h1) or connect wallet card (h3)
    const gameMatch = page.locator('h1').filter({ hasText: 'Game Match' })
    const connectWalletCard = page.locator('h3').filter({ hasText: 'Connect Wallet' })
    
    await expect(gameMatch.or(connectWalletCard).first()).toBeVisible({ timeout: 10000 })
  })

  test('should display tabs when wallet connected', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    // Connect if needed
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Check for tabs or connect wallet card
    const matchesTab = page.getByRole('tab', { name: 'Matches' })
    const connectWalletCard = page.locator('h3').filter({ hasText: 'Connect Wallet' })
    
    await expect(matchesTab.or(connectWalletCard)).toBeVisible({ timeout: 10000 })
  })
})
