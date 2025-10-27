'use client'

import { DeployFactoryContract } from '../DeployFactoryContract'
import { useOharaAi } from '@/sdk/src/context/OharaAiProvider'
import { ContractType } from '@/sdk/src/types/contracts'

interface DeployGameScoreContractProps {
  onDeployed: (address: `0x${string}`) => void
}

export function DeployGameScoreContract({ onDeployed }: DeployGameScoreContractProps) {
  const { game, deployGameScore } = useOharaAi()
  const gameScoreAddress = game.scores?.address

  return (
    <DeployFactoryContract
      contractName="Game Score"
      contractDescription="Track player scores, wins, and match history across all games"
      deployFunction={deployGameScore}
      onDeployed={onDeployed}
      deployedAddress={gameScoreAddress}
      featuresLink="/contract-testing/features/game-score"
    />
  )
}
