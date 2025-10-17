#!/usr/bin/env node
/**
 * Contract Provisioning Script
 * 
 * Runs during build to ensure all necessary contracts are deployed and configured.
 * Creates/updates .onchain-cfg.json with contract addresses and controller keys.
 */

import fs from 'fs'
import path from 'path'
import { createWalletClient, createPublicClient, http, parseAbi, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { foundry } from 'viem/chains'
import * as crypto from 'crypto'

// Configuration file path
const CONFIG_PATH = path.join(process.cwd(), '.onchain-cfg.json')

// Factory ABIs
const GAME_MATCH_FACTORY_ABI = parseAbi([
  'function deployGameMatch(address controller, address scoreBoardAddress) external returns (address)',
  'function deployedContracts(uint256) external view returns (address)',
  'function setDefaultFees(address[] calldata recipients, uint256[] calldata shares) external',
  'function getDefaultFees() external view returns (address[] memory recipients, uint256[] memory shares)'
])

const SCOREBOARD_FACTORY_ABI = parseAbi([
  'function deployScoreboard() external returns (address)',
  'function deployedContracts(uint256) external view returns (address)'
])

interface OnchainConfig {
  /** Controller private key for backend operations */
  controllerPrivateKey: string
  /** Controller address derived from private key */
  controllerAddress: string
  /** Chain ID this config is for */
  chainId: number
  /** RPC URL used for deployment */
  rpcUrl: string
  /** Deployed contract addresses */
  contracts: {
    scoreboard?: string
    gameMatch?: string
  }
  /** Factory addresses used for deployment */
  factories: {
    scoreboard?: string
    gameMatch?: string
  }
  /** Timestamp of last update */
  lastUpdated: string
}

interface ProvisioningContext {
  config: OnchainConfig
  publicClient: any
  walletClient: any
  controllerAccount: any
  factoryAddresses: {
    scoreboard?: string
    gameMatch?: string
  }
  requiredContracts: Set<'scoreboard' | 'gameMatch'>
}

/**
 * Generate a new private key for the controller
 */
function generateControllerKey(): string {
  const privateKey = `0x${crypto.randomBytes(32).toString('hex')}`
  return privateKey
}

/**
 * Load existing config or create new one
 */
function loadOrCreateConfig(chainId: number, rpcUrl: string): OnchainConfig {
  if (fs.existsSync(CONFIG_PATH)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    
    // Validate it's for the same chain
    if (config.chainId !== chainId) {
      console.warn(`⚠️  Config is for chain ${config.chainId}, but current chain is ${chainId}`)
      console.warn(`   Creating new config for chain ${chainId}`)
      return createNewConfig(chainId, rpcUrl)
    }
    
    return config
  }
  
  return createNewConfig(chainId, rpcUrl)
}

/**
 * Create a new config with generated controller key
 */
function createNewConfig(chainId: number, rpcUrl: string): OnchainConfig {
  const controllerPrivateKey = generateControllerKey()
  const account = privateKeyToAccount(controllerPrivateKey as `0x${string}`)
  
  return {
    controllerPrivateKey,
    controllerAddress: account.address,
    chainId,
    rpcUrl,
    contracts: {},
    factories: {},
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Save config to file
 */
function saveConfig(config: OnchainConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  console.log(`✅ Saved config to ${CONFIG_PATH}`)
}

/**
 * Detect which contracts are needed by scanning the app code
 */
async function detectRequiredContracts(): Promise<Set<'scoreboard' | 'gameMatch'>> {
  const required = new Set<'scoreboard' | 'gameMatch'>()
  
  // Scan app directory for SDK component usage
  const appDir = path.join(process.cwd(), 'app')
  
  if (!fs.existsSync(appDir)) {
    console.log('ℹ️  No app directory found, skipping contract detection')
    return required
  }
  
  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath)
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        
        // Check for LeaderBoard usage
        if (content.includes('LeaderBoard') || content.includes('from \'@/sdk/src/components/LeaderBoard\'')) {
          required.add('scoreboard')
        }
        
        // Check for MatchBoard usage
        if (content.includes('MatchBoard') || content.includes('from \'@/sdk/src/components/MatchBoard\'')) {
          required.add('gameMatch')
          required.add('scoreboard') // GameMatch depends on ScoreBoard
        }
      }
    }
  }
  
  scanDirectory(appDir)
  
  return required
}

/**
 * Deploy ScoreBoard contract via factory
 */
async function deployScoreboard(ctx: ProvisioningContext): Promise<string> {
  const factoryAddress = ctx.factoryAddresses.scoreboard
  
  if (!factoryAddress) {
    throw new Error('ScoreBoard factory address not provided. Set NEXT_PUBLIC_SCOREBOARD_FACTORY in env.')
  }
  
  console.log(`📝 Deploying ScoreBoard via factory ${factoryAddress}...`)
  
  const hash = await ctx.walletClient.writeContract({
    address: factoryAddress as `0x${string}`,
    abi: SCOREBOARD_FACTORY_ABI,
    functionName: 'deployScoreboard',
    account: ctx.controllerAccount,
  })
  
  console.log(`   Transaction: ${hash}`)
  
  const receipt = await ctx.publicClient.waitForTransactionReceipt({ hash })
  
  // Get deployed address from factory
  const deployedAddress = await ctx.publicClient.readContract({
    address: factoryAddress as `0x${string}`,
    abi: SCOREBOARD_FACTORY_ABI,
    functionName: 'deployedContracts',
    args: [0n], // Assuming first deployment, or we can parse logs
  })
  
  console.log(`✅ ScoreBoard deployed at ${deployedAddress}`)
  
  return deployedAddress as string
}

/**
 * Deploy GameMatch contract via factory
 */
async function deployGameMatch(ctx: ProvisioningContext, scoreboardAddress: string): Promise<string> {
  const factoryAddress = ctx.factoryAddresses.gameMatch
  
  if (!factoryAddress) {
    throw new Error('GameMatch factory address not provided. Set NEXT_PUBLIC_GAME_MATCH_FACTORY in env.')
  }
  
  console.log(`📝 Deploying GameMatch via factory ${factoryAddress}...`)
  
  const hash = await ctx.walletClient.writeContract({
    address: factoryAddress as `0x${string}`,
    abi: GAME_MATCH_FACTORY_ABI,
    functionName: 'deployGameMatch',
    args: [ctx.controllerAccount.address, scoreboardAddress as `0x${string}`],
    account: ctx.controllerAccount,
  })
  
  console.log(`   Transaction: ${hash}`)
  
  const receipt = await ctx.publicClient.waitForTransactionReceipt({ hash })
  
  // Get deployed address from factory
  const deployedAddress = await ctx.publicClient.readContract({
    address: factoryAddress as `0x${string}`,
    abi: GAME_MATCH_FACTORY_ABI,
    functionName: 'deployedContracts',
    args: [0n],
  })
  
  console.log(`✅ GameMatch deployed at ${deployedAddress}`)
  
  return deployedAddress as string
}

/**
 * Ensure controller account has gas
 */
async function ensureControllerFunded(ctx: ProvisioningContext) {
  const balance = await ctx.publicClient.getBalance({
    address: ctx.controllerAccount.address
  })
  
  console.log(`💰 Controller balance: ${balance} wei`)
  
  // For local development, auto-fund from test account
  if (balance === 0n && ctx.config.chainId === 31337) {
    console.log(`⚠️  Controller has no balance. Funding from default account...`)
    
    // Use Anvil's default test account
    const testAccount = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')
    
    const testWallet = createWalletClient({
      account: testAccount,
      chain: foundry,
      transport: http(ctx.config.rpcUrl)
    })
    
    const hash = await testWallet.sendTransaction({
      to: ctx.controllerAccount.address,
      value: parseEther('10'), // Send 10 ETH
    })
    
    await ctx.publicClient.waitForTransactionReceipt({ hash })
    console.log(`✅ Funded controller with 10 ETH`)
  }
}

/**
 * Main provisioning function
 */
async function provision() {
  console.log('🚀 Starting contract provisioning...\n')
  
  // Get environment configuration
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'
  const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337')
  
  console.log(`📡 RPC URL: ${rpcUrl}`)
  console.log(`⛓️  Chain ID: ${chainId}\n`)
  
  // Load or create config
  let config = loadOrCreateConfig(chainId, rpcUrl)
  console.log(`📋 Controller: ${config.controllerAddress}\n`)
  
  // Detect required contracts
  const requiredContracts = await detectRequiredContracts()
  console.log(`🔍 Required contracts: ${Array.from(requiredContracts).join(', ') || 'none'}\n`)
  
  if (requiredContracts.size === 0) {
    console.log('ℹ️  No contracts required. Skipping deployment.')
    return
  }
  
  // Setup clients
  const controllerAccount = privateKeyToAccount(config.controllerPrivateKey as `0x${string}`)
  
  const publicClient = createPublicClient({
    chain: chainId === 31337 ? foundry : undefined,
    transport: http(rpcUrl)
  })
  
  const walletClient = createWalletClient({
    account: controllerAccount,
    chain: chainId === 31337 ? foundry : undefined,
    transport: http(rpcUrl)
  })
  
  // Get factory addresses from env
  const factoryAddresses = {
    scoreboard: process.env.NEXT_PUBLIC_SCOREBOARD_FACTORY,
    gameMatch: process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY,
  }
  
  config.factories = factoryAddresses
  
  const ctx: ProvisioningContext = {
    config,
    publicClient,
    walletClient,
    controllerAccount,
    factoryAddresses,
    requiredContracts
  }
  
  // Ensure controller is funded
  await ensureControllerFunded(ctx)
  
  // Deploy missing contracts
  let needsSave = false
  
  // ScoreBoard (required by both LeaderBoard and MatchBoard)
  if (requiredContracts.has('scoreboard') && !config.contracts.scoreboard) {
    const address = await deployScoreboard(ctx)
    config.contracts.scoreboard = address
    needsSave = true
  } else if (config.contracts.scoreboard) {
    console.log(`✓ ScoreBoard already deployed at ${config.contracts.scoreboard}`)
  }
  
  // GameMatch (required by MatchBoard)
  if (requiredContracts.has('gameMatch') && !config.contracts.gameMatch) {
    if (!config.contracts.scoreboard) {
      throw new Error('Cannot deploy GameMatch without ScoreBoard address')
    }
    const address = await deployGameMatch(ctx, config.contracts.scoreboard)
    config.contracts.gameMatch = address
    needsSave = true
  } else if (config.contracts.gameMatch) {
    console.log(`✓ GameMatch already deployed at ${config.contracts.gameMatch}`)
  }
  
  // Save config if anything changed
  if (needsSave) {
    config.lastUpdated = new Date().toISOString()
    saveConfig(config)
  }
  
  console.log('\n✨ Contract provisioning complete!\n')
  console.log('📄 Configuration:')
  console.log(`   Controller: ${config.controllerAddress}`)
  if (config.contracts.scoreboard) {
    console.log(`   ScoreBoard: ${config.contracts.scoreboard}`)
  }
  if (config.contracts.gameMatch) {
    console.log(`   GameMatch: ${config.contracts.gameMatch}`)
  }
}

// Run if called directly
if (require.main === module) {
  provision().catch(error => {
    console.error('❌ Provisioning failed:', error)
    process.exit(1)
  })
}

export { provision }
