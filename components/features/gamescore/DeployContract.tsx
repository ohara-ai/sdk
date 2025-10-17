'use client'

import { getGameScoreFactoryAddress } from '@/lib/contracts/gameScore'
import { DeployFactoryContract } from '../DeployFactoryContract'

interface DeployContractProps {
  onDeployed: (address: `0x${string}`) => void
}

export function DeployContract({ onDeployed }: DeployContractProps) {
  const factoryAddress = getGameScoreFactoryAddress()

  return (
    <DeployFactoryContract
      factoryAddress={factoryAddress}
      factoryEnvVar="NEXT_PUBLIC_GAMESCORE_FACTORY"
      contractName="GameScore"
      apiRoute="/api/deploy-game-score"
      onDeployed={onDeployed}
    />
  )
}
