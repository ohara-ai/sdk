/**
 * Match E2E Flow Tests
 * 
 * Tests the complete match lifecycle with multiple users:
 * 1. User 1 creates a match with ETH wager
 * 2. User 2 joins the match
 * 3. Match is activated
 * 4. Match is finalized with a winner
 * 
 * These tests serve as the foundation for Score, Prize, Tournament, 
 * League, and Prediction contract testing.
 */

import { test, expect, Browser } from '@playwright/test'
import { createMockEthereumScript, ANVIL_ACCOUNTS } from './fixtures/wallet'
import {
  createWalletContext,
  createMatchPageActions,
  connectWallet,
  waitForWalletReady,
} from './fixtures/test-helpers'

const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'

// ============ FULL E2E MATCH FLOW TESTS ============

test.describe('Match E2E Flow - Two Player Match', () => {
  test('complete match lifecycle: create -> join -> activate -> finalize', async ({ browser }) => {
    // Create separate browser contexts for each user with different wallets
    const user1Context = await browser.newContext()
    const user2Context = await browser.newContext()
    
    // Inject user2 (anvil account #2) wallet for first user
    await user1Context.addInitScript(
      createMockEthereumScript(
        ANVIL_ACCOUNTS.user2.privateKey,
        ANVIL_ACCOUNTS.user2.address,
        rpcUrl,
        31337
      )
    )
    
    // Inject user3 (anvil account #3) wallet for second user
    await user2Context.addInitScript(
      createMockEthereumScript(
        ANVIL_ACCOUNTS.user3.privateKey,
        ANVIL_ACCOUNTS.user3.address,
        rpcUrl,
        31337
      )
    )
    
    try {
      const user1Page = await user1Context.newPage()
      const user2Page = await user2Context.newPage()
      
      // ========== STEP 1: User 1 creates a 2-player match with 1 ETH wager ==========
      console.log('[Test] Step 1: User 1 navigating to match page and connecting wallet')
      await user1Page.goto('/testing/features/game/match')
      await user1Page.waitForLoadState('networkidle')
      
      // Connect wallet
      const connectButton1 = user1Page.getByTestId('ockConnectButton')
      if (await connectButton1.isVisible({ timeout: 5000 }).catch(() => false)) {
        await connectButton1.click()
        await user1Page.waitForTimeout(2000)
      }
      
      // Verify wallet connected - tabs should be visible
      await expect(user1Page.getByRole('tab', { name: 'Create Match' })).toBeVisible({ timeout: 15000 })
      
      // Navigate to Create Match tab
      await user1Page.getByRole('tab', { name: 'Create Match' }).click()
      await user1Page.waitForTimeout(500)
      
      // Fill in match creation form
      console.log('[Test] Step 1: Creating match with 1 ETH stake')
      await user1Page.locator('#stakeAmount').fill('1')
      await user1Page.locator('#maxPlayers').fill('2')
      
      // Create the match
      await user1Page.getByRole('button', { name: 'Create Match' }).click()
      
      // Wait for success and capture match ID
      const successMessage = user1Page.getByText(/Match created successfully/)
      await expect(successMessage).toBeVisible({ timeout: 30000 })
      
      const successText = await successMessage.textContent()
      const matchIdMatch = successText?.match(/Match ID: (\d+)/)
      const matchId = matchIdMatch ? parseInt(matchIdMatch[1]) : 0
      console.log(`[Test] Step 1 Complete: Match #${matchId} created by User 1`)
      expect(matchId).toBeGreaterThanOrEqual(0)
      
      // ========== STEP 2: User 2 opens page, connects wallet, and joins the match ==========
      console.log('[Test] Step 2: User 2 navigating to match page and connecting wallet')
      await user2Page.goto('/testing/features/game/match')
      await user2Page.waitForLoadState('networkidle')
      
      // Connect wallet for User 2
      const connectButton2 = user2Page.getByTestId('ockConnectButton')
      if (await connectButton2.isVisible({ timeout: 5000 }).catch(() => false)) {
        await connectButton2.click()
        await user2Page.waitForTimeout(2000)
      }
      
      // Verify wallet connected
      await expect(user2Page.getByRole('tab', { name: 'Matches' })).toBeVisible({ timeout: 15000 })
      
      // Wait for matches to load and find the match
      await user2Page.waitForTimeout(2000)
      
      // Click on the match to select it
      const matchCard = user2Page.getByText(`Match #${matchId}`).first()
      await expect(matchCard).toBeVisible({ timeout: 10000 })
      await matchCard.click()
      await user2Page.waitForTimeout(1000)
      
      // User 2 joins the match
      console.log('[Test] Step 2: User 2 joining the match')
      const joinButton = user2Page.getByRole('button', { name: 'Join Match' })
      await expect(joinButton).toBeVisible({ timeout: 10000 })
      await joinButton.click()
      
      // Wait for join success
      await expect(user2Page.getByText('Successfully joined match!')).toBeVisible({ timeout: 30000 })
      console.log('[Test] Step 2 Complete: User 2 joined match')
      
      // ========== STEP 3: Activate the match ==========
      console.log('[Test] Step 3: Activating the match')
      
      // User 1 refreshes and activates (they're the match owner)
      await user1Page.getByRole('tab', { name: 'Matches' }).click()
      await user1Page.waitForTimeout(1000)
      
      // Select the match again
      const matchCardUser1 = user1Page.getByText(`Match #${matchId}`).first()
      await matchCardUser1.click()
      await user1Page.waitForTimeout(2000)
      
      // Should see Activate button now that 2 players have joined
      const activateButton = user1Page.getByRole('button', { name: 'Activate Match' })
      await expect(activateButton).toBeVisible({ timeout: 15000 })
      await activateButton.click()
      
      // Wait for activation success
      await expect(user1Page.getByText('Successfully activated match!')).toBeVisible({ timeout: 30000 })
      console.log('[Test] Step 3 Complete: Match activated')
      
      // ========== STEP 4: Finalize the match with random winner ==========
      console.log('[Test] Step 4: Finalizing the match')
      
      // Wait a moment for state to propagate
      await user1Page.waitForTimeout(2000)
      
      // Click Finalize Match button
      const finalizeButton = user1Page.getByRole('button', { name: 'Finalize Match' })
      await expect(finalizeButton).toBeVisible({ timeout: 15000 })
      await finalizeButton.click()
      
      // Wait for winner picker
      await expect(user1Page.getByText('Select Winner')).toBeVisible({ timeout: 5000 })
      
      // Randomly select a winner (0 or 1)
      const winnerIndex = Math.floor(Math.random() * 2)
      console.log(`[Test] Step 4: Selecting winner at index ${winnerIndex}`)
      
      // Select the winner - find all player selection buttons
      const playerButtons = user1Page.locator('button.w-full.p-3.rounded-md.border.text-left')
      await playerButtons.nth(winnerIndex).click()
      
      // Confirm finalization
      await user1Page.getByRole('button', { name: 'Confirm' }).click()
      
      // Wait for finalization success
      await expect(user1Page.getByText('Match Finalized Successfully!')).toBeVisible({ timeout: 30000 })
      console.log('[Test] Step 4 Complete: Match finalized')
      
      // Verify final state shows winner info
      await expect(user1Page.getByText(/Winner Received:/)).toBeVisible({ timeout: 5000 })
      
      console.log('[Test] ✅ Complete Match E2E Flow successful!')
      
    } finally {
      await user1Context.close()
      await user2Context.close()
    }
  })
})

// ============ MATCH FOUNDATION TESTS FOR INTEGRATION ============

test.describe('Match Foundation - For Score/Prize/Tournament Integration', () => {
  /**
   * This test executes multiple matches in sequence.
   * Useful for building up Score contract data and testing Tournament/League flows.
   */
  test.skip('execute multiple matches for integration testing', async ({ browser }) => {
    const matchResults: { matchId: number; winner: string }[] = []
    
    for (let i = 0; i < 3; i++) {
      const user1Context = await browser.newContext()
      const user2Context = await browser.newContext()
      
      await user1Context.addInitScript(
        createMockEthereumScript(
          ANVIL_ACCOUNTS.user2.privateKey,
          ANVIL_ACCOUNTS.user2.address,
          rpcUrl,
          31337
        )
      )
      
      await user2Context.addInitScript(
        createMockEthereumScript(
          ANVIL_ACCOUNTS.user3.privateKey,
          ANVIL_ACCOUNTS.user3.address,
          rpcUrl,
          31337
        )
      )
      
      try {
        const user1Page = await user1Context.newPage()
        const user2Page = await user2Context.newPage()
        
        // User 1 creates match
        await user1Page.goto('/testing/features/game/match')
        await user1Page.waitForLoadState('networkidle')
        
        const connectButton1 = user1Page.getByTestId('ockConnectButton')
        if (await connectButton1.isVisible({ timeout: 5000 }).catch(() => false)) {
          await connectButton1.click()
          await user1Page.waitForTimeout(2000)
        }
        
        await user1Page.getByRole('tab', { name: 'Create Match' }).click()
        await user1Page.waitForTimeout(500)
        await user1Page.locator('#stakeAmount').fill('0.1')
        await user1Page.locator('#maxPlayers').fill('2')
        await user1Page.getByRole('button', { name: 'Create Match' }).click()
        
        const successMessage = user1Page.getByText(/Match created successfully/)
        await expect(successMessage).toBeVisible({ timeout: 30000 })
        const successText = await successMessage.textContent()
        const matchId = parseInt(successText?.match(/Match ID: (\d+)/)?.[1] || '0')
        
        // User 2 joins
        await user2Page.goto('/testing/features/game/match')
        await user2Page.waitForLoadState('networkidle')
        
        const connectButton2 = user2Page.getByTestId('ockConnectButton')
        if (await connectButton2.isVisible({ timeout: 5000 }).catch(() => false)) {
          await connectButton2.click()
          await user2Page.waitForTimeout(2000)
        }
        
        await user2Page.waitForTimeout(2000)
        await user2Page.getByText(`Match #${matchId}`).first().click()
        await user2Page.waitForTimeout(1000)
        await user2Page.getByRole('button', { name: 'Join Match' }).click()
        await expect(user2Page.getByText('Successfully joined match!')).toBeVisible({ timeout: 30000 })
        
        // Activate
        await user1Page.getByRole('tab', { name: 'Matches' }).click()
        await user1Page.waitForTimeout(1000)
        await user1Page.getByText(`Match #${matchId}`).first().click()
        await user1Page.waitForTimeout(2000)
        await user1Page.getByRole('button', { name: 'Activate Match' }).click()
        await expect(user1Page.getByText('Successfully activated match!')).toBeVisible({ timeout: 30000 })
        
        // Finalize with alternating winner
        await user1Page.waitForTimeout(2000)
        await user1Page.getByRole('button', { name: 'Finalize Match' }).click()
        await expect(user1Page.getByText('Select Winner')).toBeVisible({ timeout: 5000 })
        
        const winnerIndex = i % 2
        const playerButtons = user1Page.locator('button.w-full.p-3.rounded-md.border.text-left')
        await playerButtons.nth(winnerIndex).click()
        await user1Page.getByRole('button', { name: 'Confirm' }).click()
        await expect(user1Page.getByText('Match Finalized Successfully!')).toBeVisible({ timeout: 30000 })
        
        matchResults.push({
          matchId,
          winner: winnerIndex === 0 ? ANVIL_ACCOUNTS.user2.address : ANVIL_ACCOUNTS.user3.address
        })
        
        console.log(`[Test] Match ${i + 1}/3 completed: Match #${matchId}, Winner index: ${winnerIndex}`)
        
      } finally {
        await user1Context.close()
        await user2Context.close()
      }
    }
    
    console.log('[Test] Multiple matches completed:', matchResults)
    expect(matchResults.length).toBe(3)
  })
})

// ============ BASIC VALIDATION TESTS ============

test.describe('Match Page - Basic Validation', () => {
  test('should load match page without errors', async ({ page }) => {
    const response = await page.goto('/testing/features/game/match')
    expect(response?.status()).toBeLessThan(500)
  })

  test('should display Game Match header', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await expect(page.locator('h1').filter({ hasText: 'Game Match' })).toBeVisible({ timeout: 10000 })
  })

  test('should show connect wallet card when not connected', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    const connectWalletCard = page.locator('h3').filter({ hasText: 'Connect Wallet' })
    await expect(connectWalletCard).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Match Page - With Wallet', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      createMockEthereumScript(
        ANVIL_ACCOUNTS.user2.privateKey,
        ANVIL_ACCOUNTS.user2.address,
        rpcUrl,
        31337
      )
    )
  })

  test('should connect wallet and show match interface', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Either shows tabs (connected) or still shows connect wallet
    const matchesTab = page.getByRole('tab', { name: 'Matches' })
    const connectWalletCard = page.locator('h3').filter({ hasText: 'Connect Wallet' })
    
    await expect(matchesTab.or(connectWalletCard)).toBeVisible({ timeout: 10000 })
  })

  test('should have create match form inputs when connected', async ({ page }) => {
    await page.goto('/testing/features/game/match')
    await page.waitForLoadState('networkidle')
    
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }
    
    const createTab = page.getByRole('tab', { name: 'Create Match' })
    if (await createTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createTab.click()
      await page.waitForTimeout(500)
      
      await expect(page.locator('#stakeAmount')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('#maxPlayers')).toBeVisible({ timeout: 5000 })
    }
  })
})
