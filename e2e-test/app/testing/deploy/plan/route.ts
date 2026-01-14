import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

/**
 * Storage directory for SDK data
 */
function getStorageDir(): string {
  return path.join(process.cwd(), 'public', 'ohara-ai-data')
}

/**
 * POST /testing/deploy/plan
 * Saves the deployment plan requirements to public/ohara-ai-data/requirements.json
 * This file is read by assureContractsDeployed to know which contracts to deploy.
 * 
 * @body { contracts: string[], forceRedeploy?: boolean } - Array of contract types to deploy ('Score', 'Match', 'Prize')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contracts, forceRedeploy = true } = body as { contracts: string[], forceRedeploy?: boolean }

    // Validate contracts array
    if (!Array.isArray(contracts)) {
      return NextResponse.json(
        { error: 'contracts must be an array' },
        { status: 400 },
      )
    }

    // Filter to only valid contract types
    const validContracts = contracts.filter(
      (c): c is 'Score' | 'Match' | 'Prize' | 'League' | 'Tournament' | 'Prediction' =>
        c === 'Score' || c === 'Match' || c === 'Prize' || c === 'League' || c === 'Tournament' || c === 'Prediction',
    )

    // Create storage directory if needed
    const storageDir = getStorageDir()
    await fs.mkdir(storageDir, { recursive: true })

    // Check if requirements have changed
    const requirementsPath = path.join(storageDir, 'requirements.json')
    let requirementsChanged = true
    try {
      const existingContent = await fs.readFile(requirementsPath, 'utf-8')
      const existingData = JSON.parse(existingContent)
      const existingContracts = (existingData.contracts || []).sort()
      const newContracts = [...validContracts].sort()
      requirementsChanged = JSON.stringify(existingContracts) !== JSON.stringify(newContracts)
    } catch {
      // File doesn't exist, requirements are new
      requirementsChanged = true
    }

    // Write requirements file
    console.log(`[deploy/plan] Writing requirements.json with contracts: [${validContracts.join(', ')}]`)
    await fs.writeFile(
      requirementsPath,
      JSON.stringify({ contracts: validContracts }, null, 2),
    )
    console.log(`[deploy/plan] Requirements saved to: ${requirementsPath}`)

    // Clear existing contracts to force redeployment (if requested or requirements changed)
    // This clears both local storage and API cache to ensure fresh deployment
    if (forceRedeploy || requirementsChanged) {
      const filesToClear = [
        { name: 'contracts.json', desc: 'local contracts' },
        { name: 'api-cache.json', desc: 'API cache' },
      ]
      
      for (const file of filesToClear) {
        const filePath = path.join(storageDir, file.name)
        try {
          await fs.unlink(filePath)
          console.log(`[deploy/plan] Cleared ${file.name} (${file.desc})`)
        } catch {
          // File might not exist, that's okay
        }
      }
    }

    return NextResponse.json({
      success: true,
      contracts: validContracts,
      requirementsChanged,
      requirementsPath,
      message: `Deployment plan saved with ${validContracts.length} contract(s): ${validContracts.join(', ') || 'none'}`,
    })
  } catch (error) {
    console.error('Error saving deployment plan:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save deployment plan' },
      { status: 500 },
    )
  }
}

/**
 * GET /testing/deploy/plan
 * Returns the current deployment plan requirements
 */
export async function GET() {
  try {
    const storageDir = getStorageDir()
    const requirementsPath = path.join(storageDir, 'requirements.json')

    const content = await fs.readFile(requirementsPath, 'utf-8')
    const data = JSON.parse(content)

    return NextResponse.json(data)
  } catch {
    // File doesn't exist or can't be read
    return NextResponse.json({ contracts: [] })
  }
}

/**
 * DELETE /testing/deploy/plan
 * Clears the deployment plan and resets contracts
 */
export async function DELETE() {
  try {
    const storageDir = getStorageDir()
    
    // Remove requirements file
    const requirementsPath = path.join(storageDir, 'requirements.json')
    try {
      await fs.unlink(requirementsPath)
    } catch {
      // File might not exist
    }

    // Also remove contracts file to reset state
    const contractsPath = path.join(storageDir, 'contracts.json')
    try {
      await fs.unlink(contractsPath)
    } catch {
      // File might not exist
    }

    return NextResponse.json({
      success: true,
      message: 'Deployment plan cleared. All contracts will need to be redeployed.',
    })
  } catch (error) {
    console.error('Error clearing deployment plan:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear deployment plan' },
      { status: 500 },
    )
  }
}
