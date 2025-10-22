/**
 * Next.js Instrumentation
 * Runs once when the server starts
 * Used to inject .onchain-cfg.json values into environment
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('📡 Preparing onchain config... NOT IMPLEMENTED')
    
  }
}
