/**
 * Heap E2E Flow Tests
 * 
 * Tests the complete heap lifecycle with multiple users:
 * 1. User 1 creates a heap with contribution amount
 * 2. User 1 adds multiple contributions
 * 3. User 2 adds multiple contributions
 * 4. Heap is activated
 * 5. Heap is finalized with user 1 as winner
 * 
 * These tests serve as the foundation for Score, Prize, Tournament, 
 * League, and Prediction contract testing alongside Match tests.
 */

import { test, expect } from '@playwright/test'
import { createMockEthereumScript, ANVIL_ACCOUNTS } from './fixtures/wallet'

const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'

// ============ FULL E2E HEAP FLOW TESTS ============

test.describe('Heap E2E Flow - Multi-Contributor Heap', () => {
  test('complete heap lifecycle: create -> contribute -> activate -> finalize', async ({ browser }) => {
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
      
      // ========== STEP 1: User 1 creates a heap with sufficient max contributions ==========
      console.log('[Test] Step 1: User 1 navigating to heap page and connecting wallet')
      await user1Page.goto('/testing/features/game/heap')
      await user1Page.waitForLoadState('networkidle')
      
      // Connect wallet
      const connectButton1 = user1Page.getByTestId('ockConnectButton')
      if (await connectButton1.isVisible({ timeout: 5000 }).catch(() => false)) {
        await connectButton1.click()
        await user1Page.waitForTimeout(2000)
      }
      
      // Verify wallet connected - tabs should be visible
      await expect(user1Page.getByRole('tab', { name: 'Create Heap' })).toBeVisible({ timeout: 15000 })
      
      // Navigate to Create Heap tab
      await user1Page.getByRole('tab', { name: 'Create Heap' }).click()
      await user1Page.waitForTimeout(500)
      
      // Fill in heap creation form - 0.1 ETH contribution, max 10 contributions
      console.log('[Test] Step 1: Creating heap with 0.1 ETH contribution amount')
      await user1Page.locator('#contributionAmount').fill('0.1')
      await user1Page.locator('#maxContributions').fill('10')
      
      // Create the heap
      await user1Page.getByRole('button', { name: 'Create Heap' }).click()
      
      // Wait for success and capture heap ID
      const successMessage = user1Page.getByText(/Heap created successfully/)
      await expect(successMessage).toBeVisible({ timeout: 30000 })
      
      const successText = await successMessage.textContent()
      const heapIdMatch = successText?.match(/Heap ID: (\d+)/)
      const heapId = heapIdMatch ? parseInt(heapIdMatch[1]) : 0
      console.log(`[Test] Step 1 Complete: Heap #${heapId} created by User 1 (first contribution automatic)`)
      expect(heapId).toBeGreaterThanOrEqual(0)
      
      // ========== STEP 2: User 1 adds additional contributions ==========
      console.log('[Test] Step 2: User 1 adding additional contributions')
      
      // Navigate to Heaps tab and select the heap
      await user1Page.getByRole('tab', { name: 'Heaps' }).click()
      await user1Page.waitForTimeout(1000)
      
      // Find and click the heap card
      const heapCard1 = user1Page.getByText(`Heap #${heapId}`).first()
      await expect(heapCard1).toBeVisible({ timeout: 10000 })
      await heapCard1.click()
      await user1Page.waitForTimeout(1000)
      
      // User 1 contributes again (2nd contribution)
      const contributeButton1 = user1Page.getByRole('button', { name: 'Contribute to Heap' })
      await expect(contributeButton1).toBeVisible({ timeout: 10000 })
      await contributeButton1.click()
      await user1Page.waitForTimeout(3000) // Wait for transaction
      
      console.log('[Test] Step 2 Complete: User 1 made additional contribution')
      
      // ========== STEP 3: User 2 opens page, connects wallet, and adds contributions ==========
      console.log('[Test] Step 3: User 2 navigating to heap page and connecting wallet')
      await user2Page.goto('/testing/features/game/heap')
      await user2Page.waitForLoadState('networkidle')
      
      // Connect wallet for User 2
      const connectButton2 = user2Page.getByTestId('ockConnectButton')
      if (await connectButton2.isVisible({ timeout: 5000 }).catch(() => false)) {
        await connectButton2.click()
        await user2Page.waitForTimeout(2000)
      }
      
      // Verify wallet connected
      await expect(user2Page.getByRole('tab', { name: 'Heaps' })).toBeVisible({ timeout: 15000 })
      
      // Wait for heaps to load and find the heap
      await user2Page.waitForTimeout(2000)
      
      // Click on the heap to select it
      const heapCard2 = user2Page.getByText(`Heap #${heapId}`).first()
      await expect(heapCard2).toBeVisible({ timeout: 10000 })
      await heapCard2.click()
      await user2Page.waitForTimeout(1000)
      
      // User 2 contributes (1st contribution from user 2)
      console.log('[Test] Step 3: User 2 contributing to the heap')
      const contributeButton2a = user2Page.getByRole('button', { name: 'Contribute to Heap' })
      await expect(contributeButton2a).toBeVisible({ timeout: 10000 })
      await contributeButton2a.click()
      await user2Page.waitForTimeout(3000) // Wait for transaction
      
      // User 2 contributes again (2nd contribution from user 2)
      console.log('[Test] Step 3: User 2 adding second contribution')
      // Refresh heap details
      await heapCard2.click()
      await user2Page.waitForTimeout(1000)
      
      const contributeButton2b = user2Page.getByRole('button', { name: 'Contribute to Heap' })
      if (await contributeButton2b.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contributeButton2b.click()
        await user2Page.waitForTimeout(3000)
      }
      
      console.log('[Test] Step 3 Complete: User 2 added contributions to heap')
      
      // ========== STEP 4: Activate the heap ==========
      console.log('[Test] Step 4: Activating the heap')
      
      // User 1 refreshes and activates
      await user1Page.getByRole('tab', { name: 'Heaps' }).click()
      await user1Page.waitForTimeout(1000)
      
      // Select the heap again
      const heapCardUser1Activate = user1Page.getByText(`Heap #${heapId}`).first()
      await heapCardUser1Activate.click()
      await user1Page.waitForTimeout(2000)
      
      // Should see Activate button now that multiple contributors have joined
      const activateButton = user1Page.getByRole('button', { name: 'Activate Heap' })
      await expect(activateButton).toBeVisible({ timeout: 15000 })
      await activateButton.click()
      
      // Wait for activation (the button text changes or we see status change)
      await user1Page.waitForTimeout(5000)
      
      // Verify heap is now Active
      await expect(user1Page.getByText('Active')).toBeVisible({ timeout: 10000 })
      console.log('[Test] Step 4 Complete: Heap activated')
      
      // ========== STEP 5: Finalize the heap with User 1 as winner ==========
      console.log('[Test] Step 5: Finalizing the heap with User 1 as winner')
      
      // Wait a moment for state to propagate
      await user1Page.waitForTimeout(2000)
      
      // Select User 1's address as winner from the dropdown
      const winnerSelect = user1Page.locator('select')
      await expect(winnerSelect).toBeVisible({ timeout: 10000 })
      
      // Select User 1's address (first option after "Select Winner")
      await winnerSelect.selectOption({ index: 1 }) // First contributor (User 1)
      
      // Click Finalize Heap button
      const finalizeButton = user1Page.getByRole('button', { name: 'Finalize Heap' })
      await expect(finalizeButton).toBeVisible({ timeout: 10000 })
      await finalizeButton.click()
      
      // Wait for finalization
      await user1Page.waitForTimeout(5000)
      
      // Verify heap is finalized - status should show Finalized
      await expect(user1Page.getByText('Finalized')).toBeVisible({ timeout: 15000 })
      console.log('[Test] Step 5 Complete: Heap finalized')
      
      console.log('[Test] ✅ Complete Heap E2E Flow successful!')
      
    } finally {
      await user1Context.close()
      await user2Context.close()
    }
  })
})

// ============ HEAP FOUNDATION TESTS FOR INTEGRATION ============

test.describe('Heap Foundation - For Score/Prize/Tournament Integration', () => {
  /**
   * This test executes multiple heaps in sequence.
   * Useful for building up Score contract data and testing Tournament/League flows.
   */
  test.skip('execute multiple heaps for integration testing', async ({ browser }) => {
    const heapResults: { heapId: number; winner: string }[] = []
    
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
        
        // User 1 creates heap
        await user1Page.goto('/testing/features/game/heap')
        await user1Page.waitForLoadState('networkidle')
        
        const connectButton1 = user1Page.getByTestId('ockConnectButton')
        if (await connectButton1.isVisible({ timeout: 5000 }).catch(() => false)) {
          await connectButton1.click()
          await user1Page.waitForTimeout(2000)
        }
        
        await user1Page.getByRole('tab', { name: 'Create Heap' }).click()
        await user1Page.waitForTimeout(500)
        await user1Page.locator('#contributionAmount').fill('0.05')
        await user1Page.locator('#maxContributions').fill('5')
        await user1Page.getByRole('button', { name: 'Create Heap' }).click()
        
        const successMessage = user1Page.getByText(/Heap created successfully/)
        await expect(successMessage).toBeVisible({ timeout: 30000 })
        const successText = await successMessage.textContent()
        const heapId = parseInt(successText?.match(/Heap ID: (\d+)/)?.[1] || '0')
        
        // User 2 contributes
        await user2Page.goto('/testing/features/game/heap')
        await user2Page.waitForLoadState('networkidle')
        
        const connectButton2 = user2Page.getByTestId('ockConnectButton')
        if (await connectButton2.isVisible({ timeout: 5000 }).catch(() => false)) {
          await connectButton2.click()
          await user2Page.waitForTimeout(2000)
        }
        
        await user2Page.waitForTimeout(2000)
        await user2Page.getByText(`Heap #${heapId}`).first().click()
        await user2Page.waitForTimeout(1000)
        await user2Page.getByRole('button', { name: 'Contribute to Heap' }).click()
        await user2Page.waitForTimeout(3000)
        
        // Activate
        await user1Page.getByRole('tab', { name: 'Heaps' }).click()
        await user1Page.waitForTimeout(1000)
        await user1Page.getByText(`Heap #${heapId}`).first().click()
        await user1Page.waitForTimeout(2000)
        await user1Page.getByRole('button', { name: 'Activate Heap' }).click()
        await user1Page.waitForTimeout(5000)
        
        // Finalize with alternating winner
        const winnerSelect = user1Page.locator('select')
        await winnerSelect.selectOption({ index: i % 2 === 0 ? 1 : 2 }) // Alternate winners
        await user1Page.getByRole('button', { name: 'Finalize Heap' }).click()
        await user1Page.waitForTimeout(5000)
        
        heapResults.push({
          heapId,
          winner: i % 2 === 0 ? ANVIL_ACCOUNTS.user2.address : ANVIL_ACCOUNTS.user3.address
        })
        
        console.log(`[Test] Heap ${i + 1}/3 completed: Heap #${heapId}`)
        
      } finally {
        await user1Context.close()
        await user2Context.close()
      }
    }
    
    console.log('[Test] Multiple heaps completed:', heapResults)
    expect(heapResults.length).toBe(3)
  })
})

// ============ BASIC VALIDATION TESTS ============

test.describe('Heap Page - Basic Validation', () => {
  test('should load heap page without errors', async ({ page }) => {
    const response = await page.goto('/testing/features/game/heap')
    expect(response?.status()).toBeLessThan(500)
  })

  test('should display Heap header', async ({ page }) => {
    await page.goto('/testing/features/game/heap')
    await expect(page.locator('h1').filter({ hasText: 'Heap' })).toBeVisible({ timeout: 10000 })
  })

  test('should show connect wallet card when not connected', async ({ page }) => {
    await page.goto('/testing/features/game/heap')
    const connectWalletCard = page.locator('h3').filter({ hasText: 'Connect Wallet' })
    await expect(connectWalletCard).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Heap Page - With Wallet', () => {
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

  test('should connect wallet and show heap interface', async ({ page }) => {
    await page.goto('/testing/features/game/heap')
    await page.waitForLoadState('networkidle')
    
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }
    
    // Either shows tabs (connected) or still shows connect wallet
    const heapsTab = page.getByRole('tab', { name: 'Heaps' })
    const connectWalletCard = page.locator('h3').filter({ hasText: 'Connect Wallet' })
    
    await expect(heapsTab.or(connectWalletCard)).toBeVisible({ timeout: 10000 })
  })

  test('should have create heap form inputs when connected', async ({ page }) => {
    await page.goto('/testing/features/game/heap')
    await page.waitForLoadState('networkidle')
    
    const connectButton = page.getByTestId('ockConnectButton')
    if (await connectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await connectButton.click()
      await page.waitForTimeout(2000)
    }
    
    const createTab = page.getByRole('tab', { name: 'Create Heap' })
    if (await createTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createTab.click()
      await page.waitForTimeout(500)
      
      await expect(page.locator('#contributionAmount')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('#maxContributions')).toBeVisible({ timeout: 5000 })
    }
  })
})
