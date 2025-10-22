'use client'

import { DeployFactoryContract } from '../DeployFactoryContract'
import { useOharaAi } from '@/sdk/src/context/OnchainContext'
import { ContractType } from '@/sdk/src/types/contracts'

interface DeployContractProps {
  onDeployed: (address: `0x${string}`) => void
}

export function DeployContract({ onDeployed }: DeployContractProps) {
  const { getContractAddress, factoryAddresses, deployGameScore } = useOharaAi()
  const gameScoreAddress = getContractAddress(ContractType.GAMESCORE)

  return (
    <DeployFactoryContract
      factoryAddress={factoryAddresses.gameScoreFactory}
      factoryEnvVar="NEXT_PUBLIC_GAMESCORE_FACTORY"
      contractName="Game Score"
      contractDescription="Track player scores, wins, and match history across all games"
      deployFunction={deployGameScore}
      onDeployed={onDeployed}
      deployedAddress={gameScoreAddress}
      featuresLink="/contract-testing/features/game-score"
    />
  )
}
