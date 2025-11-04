'use client'

import { DeploymentResult } from '@ohara-ai/sdk/server'
import { DeployFactoryContract } from '../../DeployFactoryContract'
import { useOharaAi } from '@ohara-ai/sdk'

interface DeployContractProps {
  onDeployed: (address: `0x${string}`) => void
}

export function DeployContract({ onDeployed }: DeployContractProps) {
  const { game, loadAddresses } = useOharaAi()
  const gameScoreAddress = game.scores?.address

  const deployGameScore = async (): Promise<DeploymentResult> => {
    if (typeof window === 'undefined') {
      throw new Error('Deployment can only be called from the browser')
    }
    
    const response = await fetch('/testing/deploy/game/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Deployment failed')
    }
    
    // Refresh addresses after successful deployment
    await loadAddresses()
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('contractDeployed'))
    
    return data
  }

  return (
    <DeployFactoryContract
      contractName="Game Score"
      contractDescription="Track player scores, wins, and match history across all games"
      deployFunction={deployGameScore}
      onDeployed={onDeployed}
      deployedAddress={gameScoreAddress}
      featuresLink="/testing/features/game/score"
    />
  )
}
