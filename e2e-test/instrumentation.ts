/**
 * Next.js Instrumentation
 * Runs once when the server starts
 * Used to automatically deploy contracts if needed
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('📡 Initializing on-chain configuration...')

    try {
      const {
        getContracts,
        deployGameScore,
        deployGameMatch,
      } = await import('@ohara-ai/sdk/server')
      const { createPublicClient, http } = await import('viem')

      // Get RPC URL and chain ID
      const rpcUrl = process.env.RPC_URL || 'http://localhost:8545'
      const publicClient = createPublicClient({
        transport: http(rpcUrl),
      })

      const chainId = await publicClient.getChainId()
      console.log(`🔗 Connected to chain ID: ${chainId}`)

      const contractExistsOnChain = async (
        address: string | undefined,
      ): Promise<boolean> => {
        if (!address) return false
        try {
          const code = await publicClient.getCode({
            address: address as `0x${string}`,
          })
          return !!code && code !== '0x'
        } catch {
          return false
        }
      }

      // Check if contracts are already deployed
      const contracts = await getContracts(chainId)

      // Verify stored contracts actually exist on-chain
      const gameScoreExistsOnChain = await contractExistsOnChain(
        contracts.game?.score,
      )
      const gameMatchExistsOnChain = await contractExistsOnChain(
        contracts.game?.match,
      )

      const hasGameScore = !!contracts.game?.score && gameScoreExistsOnChain
      const hasGameMatch = !!contracts.game?.match && gameMatchExistsOnChain

      // Log warnings for stored addresses that don't exist on-chain
      if (contracts.game?.score && !gameScoreExistsOnChain) {
        console.log(
          `⚠️  Stored game.Score address ${contracts.game.score} not found on-chain (redeploying)`,
        )
      }
      if (contracts.game?.match && !gameMatchExistsOnChain) {
        console.log(
          `⚠️  Stored game.Match address ${contracts.game.match} not found on-chain (redeploying)`,
        )
      }

      if (!hasGameScore || !hasGameMatch) {

        // Deploy GameScore first if needed
        let gameScoreAddress: `0x${string}` | undefined = contracts.game
          ?.score as `0x${string}` | undefined

        if (!hasGameScore) {
          const scoreResult = await deployGameScore({})
          gameScoreAddress = scoreResult.address
          console.log(`✅ game.Score deployed at: ${scoreResult.address}`)
        } else {
          console.log(`✓ game.Score already deployed at: ${gameScoreAddress}`)
        }

        if (!hasGameMatch) {
          const matchResult = await deployGameMatch({
            gameScoreAddress,
          })
          console.log(`✅ game.Match deployed at: ${matchResult.address}`)

          if (matchResult.authorizationWarning) {
            console.warn(`⚠️  ${matchResult.authorizationWarning}`)
          }
        } else {
          console.log(
            `✓ GameMatch already deployed at: ${contracts.game?.match}`,
          )
        }

        console.log('🎉 Contract deployment complete!')
      } else {
        console.log('✓ All contracts already deployed')
        console.log(`  game.Score: ${contracts.game?.score}`)
        console.log(`  game.Match: ${contracts.game?.match}`)
      }
    } catch (error) {
      console.error(
        '❌ Auto-deployment failed:',
        error instanceof Error ? `${error.message}\n${error.stack}` : error,
      )
      console.log(
        '💡 You can manually deploy contracts using: npm run deploy-contracts',
      )
      // Don't throw - allow build to continue even if deployment fails
    }
  } else {
    console.log('📡 Skipping auto-deployment - not running in Node.js')
  }
}
