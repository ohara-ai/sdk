'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConnectWallet } from '@/components/ConnectWallet'
import { ContractInformation } from '@/components/features/ContractInformation'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { useAccount, useReadContract } from 'wagmi'
import { Button } from '@/components/ui/button'
import { useOharaAi } from '@/sdk/src/context/OnchainContext'
import { ContractType } from '@/sdk/src/types/contracts'
import { getGameScoreFactoryAddress, GAMESCORE_ABI } from '@/lib/contracts/gameScore'

export default function GameScorePage() {
  const { isConnected, address: userAddress } = useAccount()
  const { getContractAddress } = useOharaAi()
  const contractAddress = getContractAddress(ContractType.GAMESCORE)
  const factoryAddress = getGameScoreFactoryAddress()
  
  const [mounted, setMounted] = useState(false)
  const [showContractInfo, setShowContractInfo] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Read contract data
  const { data: totalMatches } = useReadContract({
    address: contractAddress,
    abi: GAMESCORE_ABI,
    functionName: 'getTotalMatches',
  })

  const { data: totalPlayers } = useReadContract({
    address: contractAddress,
    abi: GAMESCORE_ABI,
    functionName: 'getTotalPlayers',
  })

  const { data: owner } = useReadContract({
    address: contractAddress,
    abi: GAMESCORE_ABI,
    functionName: 'owner',
  })

  const { data: playerScore } = useReadContract({
    address: contractAddress,
    abi: GAMESCORE_ABI,
    functionName: 'getPlayerScore',
    args: userAddress ? [userAddress] : undefined,
  })

  const { data: topPlayersByWins } = useReadContract({
    address: contractAddress,
    abi: GAMESCORE_ABI,
    functionName: 'getTopPlayersByWins',
    args: [BigInt(10)],
  })

  const { data: maxLosersPerMatch } = useReadContract({
    address: contractAddress,
    abi: GAMESCORE_ABI,
    functionName: 'maxLosersPerMatch',
  })

  const { data: maxTotalPlayers } = useReadContract({
    address: contractAddress,
    abi: GAMESCORE_ABI,
    functionName: 'maxTotalPlayers',
  })

  const { data: maxTotalMatches } = useReadContract({
    address: contractAddress,
    abi: GAMESCORE_ABI,
    functionName: 'maxTotalMatches',
  })

  const limits = contractAddress ? {
    maxLosersPerMatch,
    maxTotalPlayers,
    maxTotalMatches,
    currentTotalPlayers: totalPlayers,
    currentTotalMatches: totalMatches,
  } : undefined

  return (
    <main className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/contract-testing">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contract Testing
            </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">GameScore</h1>
              <p className="text-base text-gray-600">
                Track player scores, wins, and match history
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ConnectWallet />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContractInfo(!showContractInfo)}
                className="flex items-center gap-1.5"
              >
                Info
                {showContractInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1.5"
              >
                Details
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Contract Information */}
          {showContractInfo && (
            <div className="mt-6 animate-in slide-in-from-top duration-200">
              <ContractInformation 
                factoryAddress={factoryAddress}
                contractAddress={contractAddress}
                limits={limits}
              />
            </div>
          )}

          {showDetails && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top duration-200">
              <Card className="border-2 border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2.5">
                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-900 min-w-[20px]">1.</span>
                    <p>GameMatch contracts record match results when finalized</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-900 min-w-[20px]">2.</span>
                    <p>GameScore tracks total wins, prizes, and participation for each player</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-900 min-w-[20px]">3.</span>
                    <p>Only authorized recorders (GameMatch contracts) can record results</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-900 min-w-[20px]">4.</span>
                    <p>Query leaderboards and individual player statistics</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-900 min-w-[20px]">5.</span>
                    <p>Each match is recorded once with winner and loser information</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900">Features</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2.5">
                  <div className="flex gap-3">
                    <span className="text-purple-500">•</span>
                    <p>Track wins and prizes for all players</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-purple-500">•</span>
                    <p>Query top players by wins or prize amount</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-purple-500">•</span>
                    <p>View detailed match records</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-purple-500">•</span>
                    <p>Authorization system for recording contracts</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!mounted ? (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Loading...</CardTitle>
              <CardDescription className="text-gray-600">
                Initializing application
              </CardDescription>
            </CardHeader>
          </Card>
        ) : !isConnected ? (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Connect Wallet</CardTitle>
              <CardDescription className="text-gray-600">
                Please connect your wallet to view GameScore data
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contract Stats */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Contract Statistics</CardTitle>
                <CardDescription className="text-gray-600">
                  Overall GameScore metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="text-sm font-medium text-gray-700">Total Matches Recorded</span>
                  <span className="text-lg font-bold text-purple-700">
                    {totalMatches !== undefined ? totalMatches.toString() : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-gray-700">Total Players</span>
                  <span className="text-lg font-bold text-blue-700">
                    {totalPlayers !== undefined ? totalPlayers.toString() : '-'}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">Owner Address</div>
                  <code className="text-xs font-mono text-gray-900 break-all">
                    {owner || 'Loading...'}
                  </code>
                </div>
              </CardContent>
            </Card>

            {/* Your Stats */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Your Statistics</CardTitle>
                <CardDescription className="text-gray-600">
                  Your personal performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {playerScore && playerScore[0] > 0n ? (
                  <>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-sm font-medium text-gray-700">Total Wins</span>
                      <span className="text-lg font-bold text-green-700">
                        {playerScore[0].toString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="text-sm font-medium text-gray-700">Total Prize</span>
                      <span className="text-lg font-bold text-yellow-700">
                        {playerScore[1].toString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-sm font-medium text-gray-700">Last Match ID</span>
                      <span className="text-lg font-bold text-gray-700">
                        {playerScore[2].toString()}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No wins recorded yet</p>
                    <p className="text-xs mt-2">Play matches to appear on the leaderboard!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card className="border-2 border-gray-200 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Top Players</CardTitle>
                <CardDescription className="text-gray-600">
                  Ranked by total wins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topPlayersByWins && topPlayersByWins[0].length > 0 ? (
                  <div className="space-y-2">
                    {topPlayersByWins[0].map((player, index) => (
                      <div 
                        key={player} 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-400 w-8">
                            #{index + 1}
                          </span>
                          <code className="text-xs font-mono text-gray-700">
                            {player.slice(0, 6)}...{player.slice(-4)}
                          </code>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Wins</div>
                            <div className="text-sm font-bold text-gray-900">
                              {topPlayersByWins[1][index].toString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Prize</div>
                            <div className="text-sm font-bold text-gray-900">
                              {topPlayersByWins[2][index].toString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No players yet</p>
                    <p className="text-xs mt-2">Complete matches to populate the leaderboard</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}
