'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DeployContract as DeployGameMatch } from '@/components/features/game/match/DeployContract'
import { DeployContract as DeployGameScore } from '@/components/features/game/score/DeployContract'
import { ConnectWallet } from '@/components/ConnectWallet'
import { Button } from '@/components/ui/button'
import { AddressesInfo } from '@/components/AddressesInfo'

export default function Home() {
  const [showFactoryInfo, setShowFactoryDetails] = useState(false)

  const handleContractDeployed = (address: `0x${string}`) => {
    console.log('Contract deployed at:', address)
    // The OharaAiProvider will automatically refresh addresses
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
                onClick={() => setShowFactoryDetails(!showFactoryInfo)}
                className="flex items-center gap-1.5"
              >
                Addresses
                {showFactoryInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          {/* Contract Addresses Info */}
          {showFactoryInfo && (
            <div className="mt-8">
              <AddressesInfo />
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DeployGameMatch onDeployed={handleContractDeployed} />
          
          <DeployGameScore onDeployed={handleContractDeployed} />
        </div>
      </div>
    </main>
  )
}
