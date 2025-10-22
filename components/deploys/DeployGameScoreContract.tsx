'use client'

import { DeployFactoryContract } from '../DeployFactoryContract'
import { useOharaAi } from '@/sdk/src/context/OharaAiProvider'
import { ContractType } from '@/sdk/src/types/contracts'

interface DeployContractProps {
  onDeployed: (address: `0x${string}`) => void
}

export function DeployContract({ onDeployed }: DeployContractProps) {
  const { getContractAddress, deployGameScore } = useOharaAi()
  const gameScoreAddress = getContractAddress(ContractType.GAME_SCORE)

  return (
    <DeployFactoryContract
      factoryEnvVar="NEXT_PUBLIC_GAME_SCORE_FACTORY"
      contractName="Game Score"
      contractDescription="Track player scores, wins, and match history across all games"
      deployFunction={deployGameScore}
      onDeployed={onDeployed}
      deployedAddress={gameScoreAddress}
      featuresLink="/contract-testing/features/game-score"
    />
  )
}
