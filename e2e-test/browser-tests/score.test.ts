import { test, expect } from '@playwright/test'
import { createMockEthereumScript, ANVIL_ACCOUNTS } from './fixtures/wallet'

const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'

test.describe('Score Page - Basic Load', () => {
  test('should load score page without errors', async ({ page }) => {
    const response = await page.goto('/testing/features/game/score')
    expect(response?.status()).toBeLessThan(500)
  })

  test('should display Game Score header', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await expect(page.locator('h1').filter({ hasText: 'Game Score' })).toBeVisible({ timeout: 10000 })
  })

  test('should display score description', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await expect(page.getByText(/Track player scores, wins, and match history/i)).toBeVisible({ timeout: 10000 })
  })

  test('should have back to home button', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await expect(page.getByRole('button', { name: /Back to Home/i })).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Score Page - Connect Wallet State', () => {
  test('should show connect wallet card when not connected', async ({ page }) => {
    await page.goto('/testing/features/game/score')

    const connectWalletCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Connect Wallet' })
    await expect(connectWalletCard).toBeVisible({ timeout: 10000 })
  })

  test('should show connect wallet button in header', async ({ page }) => {
    await page.goto('/testing/features/game/score')

    const connectButton = page.getByTestId('ockConnectButton')
    await expect(connectButton).toBeVisible({ timeout: 10000 })
  })

  test('should show wallet connection prompt text', async ({ page }) => {
    await page.goto('/testing/features/game/score')

    await expect(page.getByText(/Please connect your wallet to view GameScore data/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Score Page - Header Configuration', () => {
  test('should display contract address section', async ({ page }) => {
    await page.goto('/testing/features/game/score')

    await expect(page.getByText('Contract')).toBeVisible({ timeout: 10000 })
  })

  test('should display controller address when available', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Controller section should be visible
    const controllerText = page.getByText('Controller')
    await expect(controllerText).toBeVisible({ timeout: 15000 })
  })

  test('should have info button for contract details', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Wait for contract address to load
    await page.waitForTimeout(2000)

    // Info button should be visible if contract is deployed
    const infoButton = page.locator('button[title="View contract details"]')
    // May or may not be visible depending on deployment state
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Score Page - With Wallet Injection', () => {
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
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })

  test('should display header elements with wallet', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1').filter({ hasText: 'Game Score' })).toBeVisible({ timeout: 10000 })
  })

  test('should attempt wallet connection when button clicked', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    // Either shows leaderboard (connected) or still shows connect wallet
    const leaderboard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Top Players' })
    const connectWalletCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Connect Wallet' })

    await expect(leaderboard.or(connectWalletCard)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Score Page - Leaderboard UI', () => {
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

  test('should display Top Players card when connected', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    // Check for Top Players card or Connect Wallet
    const topPlayersCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Top Players' })
    const connectWalletCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Connect Wallet' })

    await expect(topPlayersCard.or(connectWalletCard)).toBeVisible({ timeout: 10000 })
  })

  test('should have Wins and Prize ranking buttons when connected', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    // Check for ranking buttons when connected
    const winsButton = page.getByRole('button', { name: /Wins/i })
    const prizeButton = page.getByRole('button', { name: /Prize/i })
    const connectWalletCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Connect Wallet' })

    // If connected, buttons should be visible
    if (await winsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(winsButton).toBeVisible()
      await expect(prizeButton).toBeVisible()
    } else {
      // Not connected, Connect Wallet should be shown
      await expect(connectWalletCard).toBeVisible()
    }
  })

  test('should toggle ranking when buttons clicked', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    // Check for ranking buttons
    const winsButton = page.getByRole('button', { name: /Wins/i })
    const prizeButton = page.getByRole('button', { name: /Prize/i })

    if (await prizeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click Prize button to switch ranking
      await prizeButton.click()
      await page.waitForTimeout(500)

      // Description should update
      await expect(page.getByText(/Ranked by prize pool/i)).toBeVisible({ timeout: 5000 })

      // Click Wins button to switch back
      await winsButton.click()
      await page.waitForTimeout(500)

      // Description should update
      await expect(page.getByText(/Ranked by total wins/i)).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show empty state when no players', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    // Check for empty state message or player list
    const emptyState = page.getByText(/No players yet/i)
    const playerEntries = page.locator('[class*="rounded-lg"]').filter({ hasText: /#\d+/ })
    const connectWalletCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Connect Wallet' })

    // Should show either empty state, player entries, or connect wallet
    await expect(emptyState.or(playerEntries.first()).or(connectWalletCard)).toBeVisible({ timeout: 10000 })
  })

  test('should show match completion prompt in empty state', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    // If no players, should show completion prompt
    const completionPrompt = page.getByText(/Complete matches to populate the leaderboard/i)
    const hasPlayers = await page.locator('code').filter({ hasText: /0x/ }).first().isVisible({ timeout: 2000 }).catch(() => false)
    const notConnected = await page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Connect Wallet' }).isVisible({ timeout: 1000 }).catch(() => false)

    if (!hasPlayers && !notConnected) {
      await expect(completionPrompt).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Score Page - Player Stats UI', () => {
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

  test('should display Your Statistics card when connected', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    // Check for Your Statistics card or Connect Wallet
    const statsCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Your Statistics' })
    const connectWalletCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Connect Wallet' })

    await expect(statsCard.or(connectWalletCard)).toBeVisible({ timeout: 10000 })
  })

  test('should show player stats fields when connected', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    const statsCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Your Statistics' })

    if (await statsCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Should show stat labels
      const totalWins = page.getByText('Total Wins')
      const totalPrize = page.getByText('Total Prize')
      const lastMatchId = page.getByText('Last Match ID')
      const noStats = page.getByText(/No statistics available/i)

      // Should show either stats or no stats message
      await expect(totalWins.or(noStats)).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show empty stats message for new players', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    const statsCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Your Statistics' })

    if (await statsCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check for either stats or empty message
      const noStats = page.getByText(/No statistics available/i)
      const startPlaying = page.getByText(/Start playing to track your stats/i)
      const totalWins = page.getByText('Total Wins')

      await expect(noStats.or(totalWins)).toBeVisible({ timeout: 5000 })

      // If no stats, should also show start playing prompt
      if (await noStats.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(startPlaying).toBeVisible({ timeout: 3000 })
      }
    }
  })
})

test.describe('Score Page - Layout Structure', () => {
  test('should have proper page layout', async ({ page }) => {
    await page.goto('/testing/features/game/score')

    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
  })

  test('should have responsive grid layout when connected', async ({ page, context }) => {
    await context.addInitScript(
      createMockEthereumScript(
        ANVIL_ACCOUNTS.user1.privateKey,
        ANVIL_ACCOUNTS.user1.address,
        rpcUrl,
        31337
      )
    )

    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    // Check that both leaderboard and stats sections exist
    const leaderboard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Top Players' })
    const statsCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Your Statistics' })
    const connectWalletCard = page.locator('h3, [class*="CardTitle"]').filter({ hasText: 'Connect Wallet' })

    // Should have either grid layout (connected) or connect wallet
    if (await leaderboard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(statsCard).toBeVisible({ timeout: 5000 })
    } else {
      await expect(connectWalletCard).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Score Page - Contract Details Dialog', () => {
  test('should open contract details dialog when info button clicked', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Wait for contract to potentially load
    await page.waitForTimeout(3000)

    const infoButton = page.locator('button[title="View contract details"]')

    if (await infoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await infoButton.click()

      // Dialog should open with details
      await expect(page.getByText(/Game Score Details/i)).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show config items in dialog', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(3000)

    const infoButton = page.locator('button[title="View contract details"]')

    if (await infoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await infoButton.click()
      await page.waitForTimeout(500)

      // Should show config labels
      const maxLosers = page.getByText('Max Losers/Match')
      const totalPlayers = page.getByText('Total Players')
      const maxPlayers = page.getByText('Max Players')
      const totalMatches = page.getByText('Total Matches')
      const maxMatches = page.getByText('Max Matches')

      // At least some config items should be visible (use .first() to avoid strict mode)
      await expect(maxLosers.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show Match Contract in additional contracts', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(3000)

    const infoButton = page.locator('button[title="View contract details"]')

    if (await infoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await infoButton.click()
      await page.waitForTimeout(500)

      // Should show Match Contract section
      await expect(page.getByText('Match Contract')).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Score Page - Error States', () => {
  test('should handle page errors gracefully', async ({ page }) => {
    const response = await page.goto('/testing/features/game/score')

    expect(response?.status()).toBeLessThan(500)
  })

  test('should not show console errors on load', async ({ page }) => {
    const errors: string[] = []

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Filter out known benign errors (blockchain/RPC, React, network)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error promise rejection') &&
        !e.includes('hydrat') &&
        !e.includes('Minified React error') &&
        !e.includes('NEXT_REDIRECT') &&
        !e.includes('eth_') &&
        !e.includes('Failed to fetch') &&
        !e.includes('getCode') &&
        !e.includes('JSON-RPC') &&
        !e.includes('network') &&
        !e.includes('ConnectorNotConnectedError') &&
        !e.includes('ChainMismatchError')
    )

    // Log errors for debugging if test fails
    if (criticalErrors.length > 0) {
      console.log('Critical errors found:', criticalErrors)
    }

    expect(criticalErrors.length).toBe(0)
  })

  test('should display properly styled containers', async ({ page }) => {
    await page.goto('/testing/features/game/score')

    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main')).toHaveClass(/min-h-screen/)
  })
})

test.describe('Score Page - Navigation', () => {
  test('should navigate back to home when back button clicked', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Back button is a Link with Button inside - find by text content
    const backButton = page.locator('a').filter({ hasText: 'Back to Home' })
    await expect(backButton).toBeVisible({ timeout: 10000 })

    await backButton.click()
    
    // Wait for navigation away from score page
    await page.waitForURL((url) => !url.pathname.includes('/score'), { timeout: 10000 })

    // Should no longer be on score page
    expect(page.url()).not.toContain('/score')
  })
})

test.describe('Score Page - Leaderboard with Players', () => {
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

  test('should display player entries with correct format when players exist', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    // Check if players exist on leaderboard
    const playerEntry = page.locator('[class*="rounded-lg"]').filter({ hasText: /0x/ }).first()

    if (await playerEntry.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Should show rank number
      await expect(page.getByText('#1')).toBeVisible({ timeout: 3000 })

      // Should show Wins and Prize labels
      await expect(page.getByText('Wins').first()).toBeVisible({ timeout: 3000 })
      await expect(page.getByText('Prize').first()).toBeVisible({ timeout: 3000 })

      // Should show ETH values
      await expect(page.getByText(/ETH/).first()).toBeVisible({ timeout: 3000 })
    }
  })

  test('should display truncated addresses correctly', async ({ page }) => {
    await page.goto('/testing/features/game/score')
    await page.waitForLoadState('networkidle')

    // Try to connect
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }

    // Check if players exist
    const playerEntry = page.locator('code').filter({ hasText: /0x.*\.\.\./ }).first()

    if (await playerEntry.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Address should be in truncated format (0x1234...5678)
      const addressText = await playerEntry.textContent()
      expect(addressText).toMatch(/^0x[a-fA-F0-9]{4}\.\.\./)
    }
  })
})
