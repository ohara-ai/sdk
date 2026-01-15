/**
 * Populate Contracts Script
 * 
 * Automatically plays out 100 matches and 100 heaps to populate contracts with test data.
 * Uses viem directly for fast blockchain interactions.
 * Uses SDK for ABIs and contract address resolution.
 * 
 * Usage: npx tsx scripts/populate-contracts.ts
 */

import 'dotenv/config'
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  Address,
  zeroAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { anvil } from 'viem/chains'
import { execSync } from 'child_process'

// Import ABIs from SDK
import { MATCH_ABI, HEAP_ABI } from '@ohara-ai/sdk'

// Anvil test accounts for players (controller comes from SDK)
const PLAYER_ACCOUNTS = {
  // Account #2 - Player 1
  player1: {
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const,
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address,
  },
  // Account #3 - Player 2
  player2: {
    privateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' as const,
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906' as Address,
  },
}

/**
 * Get controller private key using SDK's get-controller-key.js script
 * This follows the same pattern as fund-controller.sh using get-controller-address.js
 */
function getControllerKey(): string {
  try {
    const key = execSync('node ../sdk/scripts/get-controller-key.js', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    
    console.log('[Config] Loaded controller key via SDK')
    return key
  } catch (error) {
    console.error('❌ Failed to get controller key from SDK')
    console.error('   Make sure you have run: npm run setup')
    process.exit(1)
  }
}

// Configuration
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545'
const MATCH_COUNT = 12
const HEAP_COUNT = 12
const STAKE_AMOUNT = parseEther('0.01') // 0.01 ETH per stake/contribution

/**
 * Get contract addresses using SDK's get-contracts.js script
 * This follows the same pattern as fund-controller.sh using get-controller-address.js
 */
function getContractAddresses(): { matchAddress: Address | null; heapAddress: Address | null } {
  let matchAddress: Address | null = null
  let heapAddress: Address | null = null

  try {
    // Call SDK's get-contracts.js script (same pattern as get-controller-address.js)
    const output = execSync('node ../sdk/scripts/get-contracts.js', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'], // Capture stderr separately
    }).trim()

    const contracts = JSON.parse(output)
    
    if (contracts.Match) matchAddress = contracts.Match as Address
    if (contracts.Heap) heapAddress = contracts.Heap as Address
    
    console.log('[Config] Loaded contracts via SDK')
  } catch (error) {
    console.log('[Config] SDK script failed, trying environment variables')
    
    // Fallback to environment variables
    if (process.env.NEXT_PUBLIC_GAME_MATCH) {
      matchAddress = process.env.NEXT_PUBLIC_GAME_MATCH as Address
    }
    if (process.env.NEXT_PUBLIC_HEAP) {
      heapAddress = process.env.NEXT_PUBLIC_HEAP as Address
    }
  }

  return { matchAddress, heapAddress }
}

async function main() {
  console.log('🚀 Starting contract population script')
  console.log(`   RPC URL: ${RPC_URL}`)
  console.log(`   Matches to create: ${MATCH_COUNT}`)
  console.log(`   Heaps to create: ${HEAP_COUNT}`)
  console.log('')

  const { matchAddress, heapAddress } = getContractAddresses()

  if (!matchAddress && !heapAddress) {
    console.error('❌ No contract addresses found!')
    console.error('   Please deploy contracts first using: npm run setup')
    console.error('   Or set NEXT_PUBLIC_GAME_MATCH and NEXT_PUBLIC_HEAP environment variables')
    process.exit(1)
  }

  // Create clients
  const publicClient = createPublicClient({
    chain: anvil,
    transport: http(RPC_URL),
  })

  // Get controller from SDK (same as fund-controller.sh)
  const controllerKey = getControllerKey()
  const controllerAccount = privateKeyToAccount(controllerKey as `0x${string}`)
  const player1Account = privateKeyToAccount(PLAYER_ACCOUNTS.player1.privateKey)
  const player2Account = privateKeyToAccount(PLAYER_ACCOUNTS.player2.privateKey)
  
  console.log(`   Controller: ${controllerAccount.address}`)

  const controllerWallet = createWalletClient({
    account: controllerAccount,
    chain: anvil,
    transport: http(RPC_URL),
  })

  const player1Wallet = createWalletClient({
    account: player1Account,
    chain: anvil,
    transport: http(RPC_URL),
  })

  const player2Wallet = createWalletClient({
    account: player2Account,
    chain: anvil,
    transport: http(RPC_URL),
  })

  // Track statistics
  let matchesCreated = 0
  let matchesFailed = 0
  let heapsCreated = 0
  let heapsFailed = 0

  // Run matches
  if (matchAddress) {
    console.log(`\n📊 Creating ${MATCH_COUNT} matches at ${matchAddress}`)
    console.log('   Format: Create -> Join -> Activate -> Finalize')
    console.log('')

    for (let i = 0; i < MATCH_COUNT; i++) {
      try {
        // Alternate which player creates the match
        const creatorWallet = i % 2 === 0 ? player1Wallet : player2Wallet
        const joinerWallet = i % 2 === 0 ? player2Wallet : player1Wallet
        const creatorAddress = i % 2 === 0 ? PLAYER_ACCOUNTS.player1.address : PLAYER_ACCOUNTS.player2.address
        const joinerAddress = i % 2 === 0 ? PLAYER_ACCOUNTS.player2.address : PLAYER_ACCOUNTS.player1.address

        // 1. Create match
        const createHash = await creatorWallet.writeContract({
          address: matchAddress,
          abi: MATCH_ABI,
          functionName: 'create',
          args: [zeroAddress, STAKE_AMOUNT, 2n],
          value: STAKE_AMOUNT,
        })
        const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash })
        
        // Extract matchId from logs
        const matchCreatedLog = createReceipt.logs.find(log => log.topics.length >= 2)
        if (!matchCreatedLog?.topics[1]) throw new Error('Could not extract matchId')
        const matchId = BigInt(matchCreatedLog.topics[1])

        // 2. Join match
        const joinHash = await joinerWallet.writeContract({
          address: matchAddress,
          abi: MATCH_ABI,
          functionName: 'join',
          args: [matchId],
          value: STAKE_AMOUNT,
        })
        await publicClient.waitForTransactionReceipt({ hash: joinHash })

        // 3. Activate match (controller)
        const activateHash = await controllerWallet.writeContract({
          address: matchAddress,
          abi: MATCH_ABI,
          functionName: 'activate',
          args: [matchId],
        })
        await publicClient.waitForTransactionReceipt({ hash: activateHash })

        // 4. Finalize match with random winner
        const winner = Math.random() < 0.5 ? creatorAddress : joinerAddress
        const finalizeHash = await controllerWallet.writeContract({
          address: matchAddress,
          abi: MATCH_ABI,
          functionName: 'finalize',
          args: [matchId, winner],
        })
        await publicClient.waitForTransactionReceipt({ hash: finalizeHash })

        matchesCreated++
        console.log(`   ✅ Match ${i + 1}/${MATCH_COUNT} - ID #${matchId} finalized, winner: ${winner.slice(0, 10)}...`)
      } catch (error) {
        matchesFailed++
        console.error(`   ❌ Match ${i + 1} failed:`, error instanceof Error ? error.message : error)
      }
    }

    console.log(`\n📈 Match Results: ${matchesCreated} created, ${matchesFailed} failed`)
  } else {
    console.log('\n⚠️  No Match contract address found, skipping matches')
  }

  // Run heaps
  if (heapAddress) {
    console.log(`\n📊 Creating ${HEAP_COUNT} heaps at ${heapAddress}`)
    console.log('   Format: Create (with contribution) -> Contribute -> Activate -> Finalize')
    console.log('')

    for (let i = 0; i < HEAP_COUNT; i++) {
      try {
        // Alternate which player creates the heap
        const creatorWallet = i % 2 === 0 ? player1Wallet : player2Wallet
        const contributorWallet = i % 2 === 0 ? player2Wallet : player1Wallet
        const creatorAddress = i % 2 === 0 ? PLAYER_ACCOUNTS.player1.address : PLAYER_ACCOUNTS.player2.address
        const contributorAddress = i % 2 === 0 ? PLAYER_ACCOUNTS.player2.address : PLAYER_ACCOUNTS.player1.address

        // 1. Create heap (creator automatically contributes)
        const createHash = await creatorWallet.writeContract({
          address: heapAddress,
          abi: HEAP_ABI,
          functionName: 'create',
          args: [zeroAddress, STAKE_AMOUNT, 10n], // max 10 contributions
          value: STAKE_AMOUNT,
        })
        const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash })
        
        // Extract heapId from logs
        const heapCreatedLog = createReceipt.logs.find(log => log.topics.length >= 2)
        if (!heapCreatedLog?.topics[1]) throw new Error('Could not extract heapId')
        const heapId = BigInt(heapCreatedLog.topics[1])

        // 2. Contribute to heap
        const contributeHash = await contributorWallet.writeContract({
          address: heapAddress,
          abi: HEAP_ABI,
          functionName: 'contribute',
          args: [heapId],
          value: STAKE_AMOUNT,
        })
        await publicClient.waitForTransactionReceipt({ hash: contributeHash })

        // 3. Activate heap (controller)
        const activateHash = await controllerWallet.writeContract({
          address: heapAddress,
          abi: HEAP_ABI,
          functionName: 'activate',
          args: [heapId],
        })
        await publicClient.waitForTransactionReceipt({ hash: activateHash })

        // 4. Finalize heap with random winner
        const winner = Math.random() < 0.5 ? creatorAddress : contributorAddress
        const finalizeHash = await controllerWallet.writeContract({
          address: heapAddress,
          abi: HEAP_ABI,
          functionName: 'finalize',
          args: [heapId, winner],
        })
        await publicClient.waitForTransactionReceipt({ hash: finalizeHash })

        heapsCreated++
        console.log(`   ✅ Heap ${i + 1}/${HEAP_COUNT} - ID #${heapId} finalized, winner: ${winner.slice(0, 10)}...`)
      } catch (error) {
        heapsFailed++
        console.error(`   ❌ Heap ${i + 1} failed:`, error instanceof Error ? error.message : error)
      }
    }

    console.log(`\n📈 Heap Results: ${heapsCreated} created, ${heapsFailed} failed`)
  } else {
    console.log('\n⚠️  No Heap contract address found, skipping heaps')
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 POPULATION COMPLETE')
  console.log('='.repeat(50))
  console.log(`   Matches: ${matchesCreated}/${MATCH_COUNT} successful`)
  console.log(`   Heaps:   ${heapsCreated}/${HEAP_COUNT} successful`)
  console.log('')

  if (matchesFailed > 0 || heapsFailed > 0) {
    console.log(`⚠️  Some operations failed. Check the logs above for details.`)
    process.exit(1)
  }

  console.log('✅ All operations completed successfully!')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
