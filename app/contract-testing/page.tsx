'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { useDeployedGameMatchAddress, useDeployedScoreBoardAddress } from '@/lib/hooks/useDeployedAddress'
import { DeployContract as DeployGameMatch } from '@/components/features/game-match/DeployContract'
import { DeployContract as DeployScoreBoard } from '@/components/features/scoreboard/DeployContract'
import { Button } from '@/components/ui/button'

export default function ContractTestingPage() {
  const { 
    address: gameMatchAddress, 
    setAddress: setGameMatchAddress, 
    isValidating: isValidatingGameMatch, 
    isFromEnv: isGameMatchFromEnv 
  } = useDeployedGameMatchAddress()
  
  const { 
    address: scoreBoardAddress, 
    setAddress: setScoreBoardAddress, 
    isValidating: isValidatingScoreBoard, 
    isFromEnv: isScoreBoardFromEnv 
  } = useDeployedScoreBoardAddress()
  
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGameMatchDeployed = (newAddress: `0x${string}`) => {
    setGameMatchAddress(newAddress)
  }

  const handleScoreBoardDeployed = (newAddress: `0x${string}`) => {
    setScoreBoardAddress(newAddress)
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Contract Testing</h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Internal testing environment for contract deployment and direct interaction
            </p>
          </div>
          
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
            <p className="text-sm text-amber-900">
              <span className="font-semibold">Development Only:</span> This environment is for testing purposes
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Game Match Card */}
          <div className="flex flex-col gap-4">
            <Link 
              href="/contract-testing/features/game-match" 
              className={!gameMatchAddress ? 'pointer-events-none opacity-50' : 'group'}
            >
              <Card className="h-full border-2 border-gray-200 hover:border-blue-500 transition-all duration-200 hover:shadow-lg">
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <CardTitle className="text-lg font-semibold text-gray-900">Game Match</CardTitle>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors group-hover:translate-x-1 duration-200" />
                  </div>
                  <CardDescription className="text-sm text-gray-600 leading-relaxed mb-4">
                    Escrow-based match system with stake management and winner selection
                  </CardDescription>
                  <div className="pt-3 border-t border-gray-100">
                    {mounted && !isValidatingGameMatch && gameMatchAddress ? (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-700">Contract Address</div>
                        <code className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200">
                          {formatAddress(gameMatchAddress)}
                        </code>
                        {isGameMatchFromEnv && (
                          <div className="text-xs text-gray-500 mt-1">
                            from .env configuration
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Not Deployed
                      </span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </Link>
            {mounted && !isValidatingGameMatch && (
              <DeployGameMatch 
                onDeployed={handleGameMatchDeployed}
                deployedScoreBoardAddress={scoreBoardAddress}
              />
            )}
          </div>

          {/* ScoreBoard Card */}
          <div className="flex flex-col gap-4">
            <Link 
              href="/contract-testing/features/scoreboard" 
              className={!scoreBoardAddress ? 'pointer-events-none opacity-50' : 'group'}
            >
              <Card className="h-full border-2 border-gray-200 hover:border-purple-500 transition-all duration-200 hover:shadow-lg">
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <CardTitle className="text-lg font-semibold text-gray-900">ScoreBoard</CardTitle>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors group-hover:translate-x-1 duration-200" />
                  </div>
                  <CardDescription className="text-sm text-gray-600 leading-relaxed mb-4">
                    Track player scores, wins, and match history across all games
                  </CardDescription>
                  <div className="pt-3 border-t border-gray-100">
                    {mounted && !isValidatingScoreBoard && scoreBoardAddress ? (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-700">Contract Address</div>
                        <code className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-mono bg-purple-50 text-purple-700 border border-purple-200">
                          {formatAddress(scoreBoardAddress)}
                        </code>
                        {isScoreBoardFromEnv && (
                          <div className="text-xs text-gray-500 mt-1">
                            from .env configuration
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Not Deployed
                      </span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </Link>
            {mounted && !isValidatingScoreBoard && (
              <DeployScoreBoard onDeployed={handleScoreBoardDeployed} />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
