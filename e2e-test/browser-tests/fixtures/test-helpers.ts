import { Page, Browser, BrowserContext, expect } from '@playwright/test'
import { ANVIL_ACCOUNTS, createMockEthereumScript, AnvilAccount } from './wallet'

const RPC_URL = process.env.RPC_URL || 'http://localhost:8545'
const CHAIN_ID = 31337

/**
 * Create a browser context with a specific anvil account injected
 */
export async function createWalletContext(
  browser: Browser,
  account: AnvilAccount
): Promise<BrowserContext> {
  const context = await browser.newContext()
  const acc = ANVIL_ACCOUNTS[account]
  
  await context.addInitScript(
    createMockEthereumScript(acc.privateKey, acc.address, RPC_URL, CHAIN_ID)
  )
  
  return context
}

/**
 * Connect wallet on a page (clicks the connect button)
 */
export async function connectWallet(page: Page): Promise<void> {
  const connectButton = page.getByTestId('ockConnectButton')
  if (await connectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await connectButton.click()
    await page.waitForTimeout(2000)
  }
}

/**
 * Wait for wallet to be ready and connected
 */
export async function waitForWalletReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await connectWallet(page)
  // Wait for wallet client to be ready
  await page.waitForTimeout(1000)
}

// ============ MATCH PAGE HELPERS ============

export interface MatchPageActions {
  page: Page
  
  /** Navigate to match page and connect wallet */
  setup(): Promise<void>
  
  /** Create a new match with given parameters */
  createMatch(stakeAmount: string, maxPlayers: number): Promise<number>
  
  /** Select a match by ID in the list */
  selectMatch(matchId: number): Promise<void>
  
  /** Join the currently selected match */
  joinMatch(): Promise<void>
  
  /** Activate the currently selected match */
  activateMatch(): Promise<void>
  
  /** Finalize the currently selected match with given winner index */
  finalizeMatch(winnerIndex: number): Promise<void>
  
  /** Wait for match status to change */
  waitForMatchStatus(matchId: number, status: 'Open' | 'Active' | 'Finalized'): Promise<void>
}

export function createMatchPageActions(page: Page): MatchPageActions {
  return {
    page,
    
    async setup() {
      await page.goto('/testing/features/game/match')
      await waitForWalletReady(page)
    },
    
    async createMatch(stakeAmount: string, maxPlayers: number): Promise<number> {
      // Click Create Match tab
      const createTab = page.getByRole('tab', { name: 'Create Match' })
      await createTab.click()
      await page.waitForTimeout(500)
      
      // Fill form
      await page.locator('#stakeAmount').fill(stakeAmount)
      await page.locator('#maxPlayers').fill(maxPlayers.toString())
      
      // Click create button
      const createButton = page.getByRole('button', { name: 'Create Match' })
      await createButton.click()
      
      // Wait for success message and extract match ID
      const successMessage = page.getByText(/Match created successfully! Match ID: (\d+)/)
      await expect(successMessage).toBeVisible({ timeout: 30000 })
      
      const text = await successMessage.textContent()
      const matchId = parseInt(text?.match(/Match ID: (\d+)/)?.[1] || '0')
      
      return matchId
    },
    
    async selectMatch(matchId: number) {
      // Click Matches tab first
      const matchesTab = page.getByRole('tab', { name: 'Matches' })
      await matchesTab.click()
      await page.waitForTimeout(500)
      
      // Find and click the match card
      const matchCard = page.locator(`[data-match-id="${matchId}"]`).or(
        page.getByText(`Match #${matchId}`).first()
      )
      await matchCard.click()
      await page.waitForTimeout(500)
    },
    
    async joinMatch() {
      const joinButton = page.getByRole('button', { name: 'Join Match' })
      await expect(joinButton).toBeVisible({ timeout: 10000 })
      await joinButton.click()
      
      // Wait for success
      await expect(page.getByText('Successfully joined match!')).toBeVisible({ timeout: 30000 })
    },
    
    async activateMatch() {
      const activateButton = page.getByRole('button', { name: 'Activate Match' })
      await expect(activateButton).toBeVisible({ timeout: 10000 })
      await activateButton.click()
      
      // Wait for success
      await expect(page.getByText('Successfully activated match!')).toBeVisible({ timeout: 30000 })
    },
    
    async finalizeMatch(winnerIndex: number) {
      // Click Finalize Match button
      const finalizeButton = page.getByRole('button', { name: 'Finalize Match' })
      await expect(finalizeButton).toBeVisible({ timeout: 10000 })
      await finalizeButton.click()
      
      // Wait for winner picker to appear
      await expect(page.getByText('Select Winner')).toBeVisible({ timeout: 5000 })
      
      // Select the winner by index (0-based)
      const playerButtons = page.locator('.rounded-md.border.text-left')
      await playerButtons.nth(winnerIndex).click()
      
      // Confirm
      const confirmButton = page.getByRole('button', { name: 'Confirm' })
      await confirmButton.click()
      
      // Wait for success
      await expect(page.getByText('Match Finalized Successfully!')).toBeVisible({ timeout: 30000 })
    },
    
    async waitForMatchStatus(matchId: number, status: 'Open' | 'Active' | 'Finalized') {
      await this.selectMatch(matchId)
      await expect(page.getByText(status)).toBeVisible({ timeout: 15000 })
    }
  }
}

// ============ HEAP PAGE HELPERS ============

export interface HeapPageActions {
  page: Page
  
  /** Navigate to heap page and connect wallet */
  setup(): Promise<void>
  
  /** Create a new heap with given parameters */
  createHeap(contributionAmount: string, maxContributions: number): Promise<number>
  
  /** Select a heap by ID in the list */
  selectHeap(heapId: number): Promise<void>
  
  /** Add contribution to the currently selected heap */
  contribute(): Promise<void>
  
  /** Activate the currently selected heap */
  activateHeap(): Promise<void>
  
  /** Finalize the currently selected heap with given winner index */
  finalizeHeap(winnerIndex: number): Promise<void>
  
  /** Wait for heap status to change */
  waitForHeapStatus(heapId: number, status: 'Open' | 'Active' | 'Finalized'): Promise<void>
}

export function createHeapPageActions(page: Page): HeapPageActions {
  return {
    page,
    
    async setup() {
      await page.goto('/testing/features/game/heap')
      await waitForWalletReady(page)
    },
    
    async createHeap(contributionAmount: string, maxContributions: number): Promise<number> {
      // Click Create Heap tab
      const createTab = page.getByRole('tab', { name: 'Create Heap' })
      await createTab.click()
      await page.waitForTimeout(500)
      
      // Fill form
      await page.locator('#contributionAmount').fill(contributionAmount)
      await page.locator('#maxContributions').fill(maxContributions.toString())
      
      // Click create button
      const createButton = page.getByRole('button', { name: 'Create Heap' })
      await createButton.click()
      
      // Wait for success message and extract heap ID
      const successMessage = page.getByText(/Heap created successfully/)
      await expect(successMessage).toBeVisible({ timeout: 30000 })
      
      const text = await successMessage.textContent()
      const heapId = parseInt(text?.match(/Heap ID: (\d+)/)?.[1] || '0')
      
      return heapId
    },
    
    async selectHeap(heapId: number) {
      // Click Heaps tab first
      const heapsTab = page.getByRole('tab', { name: 'Heaps' })
      await heapsTab.click()
      await page.waitForTimeout(500)
      
      // Find and click the heap card
      const heapCard = page.locator(`[data-heap-id="${heapId}"]`).or(
        page.getByText(`Heap #${heapId}`).first()
      )
      await heapCard.click()
      await page.waitForTimeout(500)
    },
    
    async contribute() {
      // Heap uses "Contribute to Heap" button text
      const contributeButton = page.getByRole('button', { name: 'Contribute to Heap' })
      await expect(contributeButton).toBeVisible({ timeout: 10000 })
      await contributeButton.click()
      
      // Wait for transaction to complete
      await page.waitForTimeout(3000)
    },
    
    async activateHeap() {
      const activateButton = page.getByRole('button', { name: 'Activate Heap' })
      await expect(activateButton).toBeVisible({ timeout: 10000 })
      await activateButton.click()
      
      // Wait for status to change to Active
      await page.waitForTimeout(5000)
      await expect(page.getByText('Active')).toBeVisible({ timeout: 10000 })
    },
    
    async finalizeHeap(winnerIndex: number) {
      // Heap uses a select dropdown for winner selection, not buttons
      const winnerSelect = page.locator('select')
      await expect(winnerSelect).toBeVisible({ timeout: 10000 })
      
      // Select winner by index (index 0 is "Select Winner" placeholder, so add 1)
      await winnerSelect.selectOption({ index: winnerIndex + 1 })
      
      // Click Finalize Heap button
      const finalizeButton = page.getByRole('button', { name: 'Finalize Heap' })
      await expect(finalizeButton).toBeVisible({ timeout: 10000 })
      await finalizeButton.click()
      
      // Wait for status to change to Finalized
      await page.waitForTimeout(5000)
      await expect(page.getByText('Finalized')).toBeVisible({ timeout: 15000 })
    },
    
    async waitForHeapStatus(heapId: number, status: 'Open' | 'Active' | 'Finalized') {
      await this.selectHeap(heapId)
      await expect(page.getByText(status)).toBeVisible({ timeout: 15000 })
    }
  }
}

// ============ MULTI-USER TEST UTILITIES ============

export interface CompletedMatch {
  matchId: number
  winner: string
  loser: string
  stakeAmount: string
}

export interface CompletedHeap {
  heapId: number
  winner: string
  contributors: string[]
  contributionAmount: string
}

/**
 * Execute a complete match flow with two users
 * Returns the match result for use in subsequent tests
 */
export async function executeMatchFlow(
  browser: Browser,
  options: {
    user1Account: AnvilAccount
    user2Account: AnvilAccount
    stakeAmount: string
    maxPlayers?: number
    winnerIndex?: number // 0 = user1, 1 = user2, -1 = random
  }
): Promise<CompletedMatch> {
  const { 
    user1Account, 
    user2Account, 
    stakeAmount, 
    maxPlayers = 2,
    winnerIndex = -1 
  } = options
  
  // Create contexts for both users
  const user1Context = await createWalletContext(browser, user1Account)
  const user2Context = await createWalletContext(browser, user2Account)
  
  try {
    const user1Page = await user1Context.newPage()
    const user2Page = await user2Context.newPage()
    
    const user1Actions = createMatchPageActions(user1Page)
    const user2Actions = createMatchPageActions(user2Page)
    
    // User 1: Setup and create match
    await user1Actions.setup()
    const matchId = await user1Actions.createMatch(stakeAmount, maxPlayers)
    
    // User 2: Setup, find match, and join
    await user2Actions.setup()
    await user2Actions.selectMatch(matchId)
    await user2Actions.joinMatch()
    
    // User 1: Refresh and activate
    await user1Actions.selectMatch(matchId)
    await user1Page.waitForTimeout(2000) // Wait for blockchain state update
    await user1Actions.activateMatch()
    
    // Determine winner
    const actualWinnerIndex = winnerIndex === -1 
      ? Math.floor(Math.random() * 2) 
      : winnerIndex
    
    // User 1: Finalize with winner
    await user1Page.waitForTimeout(1000)
    await user1Actions.finalizeMatch(actualWinnerIndex)
    
    const user1Address = ANVIL_ACCOUNTS[user1Account].address
    const user2Address = ANVIL_ACCOUNTS[user2Account].address
    
    return {
      matchId,
      winner: actualWinnerIndex === 0 ? user1Address : user2Address,
      loser: actualWinnerIndex === 0 ? user2Address : user1Address,
      stakeAmount
    }
  } finally {
    await user1Context.close()
    await user2Context.close()
  }
}

/**
 * Execute a complete heap flow with multiple contributions
 * Returns the heap result for use in subsequent tests
 */
export async function executeHeapFlow(
  browser: Browser,
  options: {
    user1Account: AnvilAccount
    user2Account: AnvilAccount
    contributionAmount: string
    maxContributions?: number
    user1Contributions?: number
    user2Contributions?: number
    winnerIndex?: number // 0 = user1, 1+ = user2's contribution positions
  }
): Promise<CompletedHeap> {
  const { 
    user1Account, 
    user2Account, 
    contributionAmount, 
    maxContributions = 10,
    user1Contributions = 2,
    user2Contributions = 2,
    winnerIndex = 0 
  } = options
  
  // Create contexts for both users
  const user1Context = await createWalletContext(browser, user1Account)
  const user2Context = await createWalletContext(browser, user2Account)
  
  try {
    const user1Page = await user1Context.newPage()
    const user2Page = await user2Context.newPage()
    
    const user1Actions = createHeapPageActions(user1Page)
    const user2Actions = createHeapPageActions(user2Page)
    
    // User 1: Setup and create heap (first contribution automatic)
    await user1Actions.setup()
    const heapId = await user1Actions.createHeap(contributionAmount, maxContributions)
    
    // User 1: Make additional contributions
    await user1Actions.selectHeap(heapId)
    for (let i = 1; i < user1Contributions; i++) {
      await user1Actions.contribute()
      await user1Page.waitForTimeout(1000)
    }
    
    // User 2: Setup, find heap, and contribute
    await user2Actions.setup()
    await user2Actions.selectHeap(heapId)
    for (let i = 0; i < user2Contributions; i++) {
      await user2Actions.contribute()
      await user2Page.waitForTimeout(1000)
    }
    
    // User 1: Refresh and activate
    await user1Actions.selectHeap(heapId)
    await user1Page.waitForTimeout(2000)
    await user1Actions.activateHeap()
    
    // User 1: Finalize with user1 as winner (index 0)
    await user1Page.waitForTimeout(1000)
    await user1Actions.finalizeHeap(winnerIndex)
    
    const user1Address = ANVIL_ACCOUNTS[user1Account].address
    const user2Address = ANVIL_ACCOUNTS[user2Account].address
    
    return {
      heapId,
      winner: winnerIndex === 0 ? user1Address : user2Address,
      contributors: [user1Address, user2Address],
      contributionAmount
    }
  } finally {
    await user1Context.close()
    await user2Context.close()
  }
}

/**
 * Execute multiple matches for tournament/league testing
 */
export async function executeMultipleMatches(
  browser: Browser,
  count: number,
  baseOptions: {
    user1Account: AnvilAccount
    user2Account: AnvilAccount
    stakeAmount: string
  }
): Promise<CompletedMatch[]> {
  const results: CompletedMatch[] = []
  
  for (let i = 0; i < count; i++) {
    const result = await executeMatchFlow(browser, {
      ...baseOptions,
      winnerIndex: -1 // Random winner each time
    })
    results.push(result)
  }
  
  return results
}

/**
 * Execute multiple heaps for tournament/league testing
 */
export async function executeMultipleHeaps(
  browser: Browser,
  count: number,
  baseOptions: {
    user1Account: AnvilAccount
    user2Account: AnvilAccount
    contributionAmount: string
  }
): Promise<CompletedHeap[]> {
  const results: CompletedHeap[] = []
  
  for (let i = 0; i < count; i++) {
    const result = await executeHeapFlow(browser, {
      ...baseOptions,
      winnerIndex: i % 2 // Alternate winners
    })
    results.push(result)
  }
  
  return results
}
