/**
 * Next.js Instrumentation
 * Runs once when the server starts
 * Used to inject .onchain-cfg.json values into environment
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { injectConfigIntoEnv } = await import('./lib/onchain-config')
    
    console.log('📡 Injecting onchain config into environment...')
    injectConfigIntoEnv()
    
    // Log loaded addresses
    if (process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS) {
      console.log(`✓ GameScore: ${process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS}`)
    }
    if (process.env.NEXT_PUBLIC_GAME_MATCH_INSTANCE) {
      console.log(`✓ GameMatch: ${process.env.NEXT_PUBLIC_GAME_MATCH_INSTANCE}`)
    }
  }
}
