'use client'

import { getScoreBoardFactoryAddress } from '@/lib/contracts/scoreBoard'
import { DeployFactoryContract } from '../DeployFactoryContract'

interface DeployContractProps {
  onDeployed: (address: `0x${string}`) => void
}

export function DeployContract({ onDeployed }: DeployContractProps) {
  const factoryAddress = getScoreBoardFactoryAddress()

  return (
    <DeployFactoryContract
      factoryAddress={factoryAddress}
      factoryEnvVar="NEXT_PUBLIC_SCOREBOARD_FACTORY"
      contractName="ScoreBoard"
      apiRoute="/api/deploy-scoreboard"
      onDeployed={onDeployed}
    />
  )
}
