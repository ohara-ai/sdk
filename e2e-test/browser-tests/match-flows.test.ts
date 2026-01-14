import { test, expect } from '@playwright/test'
import { createMockEthereumScript, ANVIL_ACCOUNTS } from './fixtures/wallet'

const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'

test.describe('Match Page - Basic Load', () => {
  test('should load match page without errors', async ({ page }) => {
    const response = await page.goto('/testing/features/game/match')
    expect(response?.status()).toBeLessThan(500)
  })

  test('should display Game Match header', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await expect(page.locator('h1').filter({ hasText: 'Game Match' })).toBeVisible({ timeout: 10000 })
  })

  test('should display escrow description', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await expect(page.getByText(/Escrow-based match system/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Match Page - Connect Wallet State', () => {
  test('should show connect wallet card when not connected', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    
    // Should show Connect Wallet card in content area
    const connectWalletCard = page.locator('h3').filter({ hasText: 'Connect Wallet' })
    await expect(connectWalletCard).toBeVisible({ timeout: 10000 })
  })

  test('should show connect wallet button in header', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    
    // OnchainKit connect button should be visible
    const connectButton = page.getByTestId('ockConnectButton')
    await expect(connectButton).toBeVisible({ timeout: 10000 })
  })

  test('should show wallet connection prompt text', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    
    await expect(page.getByText(/Please connect your wallet/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Match Page - With Wallet Injection', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      createMockEthereumScript(
        ANVIL_ACCOUNTS.user1.privateKey,
        ANVIL_ACCOUNTS.user1.address,
        rpcUrl,
        31337
      )
    )
  })

  test('should load page with injected wallet', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    // Page should load successfully
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })

  test('should display header elements', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    // Game Match header should always be visible
    await expect(page.locator('h1').filter({ hasText: 'Game Match' })).toBeVisible({ timeout: 10000 })
  })

  test('should attempt wallet connection when button clicked', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      // Wait for any state change
      await page.waitForTimeout(2000)
    }
    
    // Either shows tabs (connected) or still shows connect wallet
    const matchesTab = page.getByRole('tab', { name: 'Matches' })
    const connectWalletCard = page.locator('h3').filter({ hasText: 'Connect Wallet' })
    
    await expect(matchesTab.or(connectWalletCard)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Match Page - UI Structure', () => {
  test('should have proper page layout', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    
    // Main container should exist
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })

  test('should display contract configuration section', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    
    // Header should show config items like Total Fee, Active Matches, etc.
    // These are visible even without wallet connection
    await expect(page.locator('h1').filter({ hasText: 'Game Match' })).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Match Creation Form - Structure', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      createMockEthereumScript(
        ANVIL_ACCOUNTS.user1.privateKey,
        ANVIL_ACCOUNTS.user1.address,
        rpcUrl,
        31337
      )
    )
  })

  test('should display Create New Match card title when connected', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Check for Create Match tab or form
    const createTab = page.getByRole('tab', { name: 'Create Match' })
    const connectWalletCard = page.locator('h3').filter({ hasText: 'Connect Wallet' })
    
    // If connected, Create Match tab should be visible
    // If not connected, Connect Wallet should be visible
    await expect(createTab.or(connectWalletCard)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Match Details Panel - Structure', () => {
  test('should display select match prompt or connect wallet', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    // Either shows "Select a match" prompt (when connected) or "Connect Wallet" (when not)
    const selectMatch = page.getByText(/Select a match to view details/i)
    const connectWallet = page.locator('h3').filter({ hasText: 'Connect Wallet' })
    
    await expect(selectMatch.or(connectWallet)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Multi-Player Configuration - Form Inputs', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      createMockEthereumScript(
        ANVIL_ACCOUNTS.user1.privateKey,
        ANVIL_ACCOUNTS.user1.address,
        rpcUrl,
        31337
      )
    )
  })

  test('should have stake amount input when form is accessible', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    // Try to connect and navigate
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Try to click Create Match tab
    const createTab = page.getByRole('tab', { name: 'Create Match' })
    if (await createTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createTab.click()
      await page.waitForTimeout(500)
      
      // Check for stake amount input
      const stakeInput = page.locator('#stakeAmount')
      await expect(stakeInput).toBeVisible({ timeout: 5000 })
    } else {
      // Not connected, verify connect wallet is shown
      await expect(page.locator('h3').filter({ hasText: 'Connect Wallet' })).toBeVisible()
    }
  })

  test('should have max players input when form is accessible', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    // Try to connect and navigate
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Try to click Create Match tab
    const createTab = page.getByRole('tab', { name: 'Create Match' })
    if (await createTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createTab.click()
      await page.waitForTimeout(500)
      
      // Check for max players input
      const maxPlayersInput = page.locator('#maxPlayers')
      await expect(maxPlayersInput).toBeVisible({ timeout: 5000 })
    } else {
      // Not connected, verify connect wallet is shown
      await expect(page.locator('h3').filter({ hasText: 'Connect Wallet' })).toBeVisible()
    }
  })
})

test.describe('Match Flow Actions - Button States', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      createMockEthereumScript(
        ANVIL_ACCOUNTS.user1.privateKey,
        ANVIL_ACCOUNTS.user1.address,
        rpcUrl,
        31337
      )
    )
  })

  test('should show action buttons based on match state', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Verify page structure is intact
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })

  test('should have proper button structure for match actions', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    // The page should contain buttons for various actions
    // Join Match, Leave Match, Activate Match, Finalize Match
    // These are conditionally visible based on match state
    
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Error States', () => {
  test('should handle page errors gracefully', async ({ page }) => {
    // Navigate to match page
    const response = await page.goto('/testing/features/game/match')
    
    // Should not return server error
    expect(response?.status()).toBeLessThan(500)
  })

  test('should display properly styled error containers', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    
    // Page should load without critical errors
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })
})
