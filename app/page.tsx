'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useOharaAi } from '@/sdk/src/context/OnchainContext'
import { ContractType } from '@/sdk/src/types/contracts'
import { DeployContract as DeployGameMatch } from '@/components/features/game-match/DeployContract'
import { DeployContract as DeployGameScore } from '@/components/features/game-score/DeployContract'
import { FactoryInformation } from '@/components/features/FactoryInformation'
import { ConnectWallet } from '@/components/ConnectWallet'
import { Button } from '@/components/ui/button'

export default function Home() {
  const { getContractAddress } = useOharaAi()
  const gameScoreAddress = getContractAddress(ContractType.GAMESCORE)
  
  const [showFactoryDetails, setShowFactoryDetails] = useState(false)

  const handleGameMatchDeployed = (newAddress: `0x${string}`) => {
    // Address will be automatically picked up by OharaAiProvider polling
    console.log('GameMatch deployed:', newAddress)
  }

  const handleGameScoreDeployed = (newAddress: `0x${string}`) => {
    // Address will be automatically picked up by OharaAiProvider polling
    console.log('GameScore deployed:', newAddress)
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">OharaAI SDK</h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Deploy and test on-chain gaming contracts. Functional primitives for Match and Scores operations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ConnectWallet />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFactoryDetails(!showFactoryDetails)}
                className="flex items-center gap-1.5"
              >
                Factory Details
                {showFactoryDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          {showFactoryDetails && (
            <div className="mt-6 animate-in slide-in-from-top duration-200">
              <FactoryInformation />
            </div>
          )}
          
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            <p className="text-sm text-blue-900">
              <span className="font-semibold">SDK Testing:</span> Deploy contracts and validate primitives
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DeployGameMatch 
            onDeployed={handleGameMatchDeployed}
            deployedGameScoreAddress={gameScoreAddress}
          />
          
          <DeployGameScore onDeployed={handleGameScoreDeployed} />
        </div>
      </div>
    </main>
  )
}
