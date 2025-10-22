'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ContractInformation } from '@/components/features/ContractInformation'
import { ConnectWallet } from '@/components/ConnectWallet'
import { ContractStats, PlayerStats, Leaderboard } from '@/components/features/game-score'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { useOharaAi } from '@/sdk/src/context/OharaAiProvider'
import { ContractType } from '@/sdk/src'

export default function GameScorePage() {
  const { isConnected, address: userAddress } = useAccount()
  const { game } = useOharaAi()
  const contractAddress = game.scores.address
  
  const [mounted, setMounted] = useState(false)
  const [showContractInfo, setShowContractInfo] = useState(false)
  const [totalMatches, setTotalMatches] = useState<bigint>()
  const [totalPlayers, setTotalPlayers] = useState<bigint>()
  const [playerScore, setPlayerScore] = useState<readonly [bigint, bigint, bigint, bigint]>()
  const [topPlayersByWins, setTopPlayersByWins] = useState<readonly [readonly `0x${string}`[], readonly bigint[], readonly bigint[]]>()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch data from operations
  useEffect(() => {
    const fetchData = async () => {
      if (!game.scores.operations) return
      
      try {
        const [matches, players, top] = await Promise.all([
          game.scores.operations.getTotalMatches(),
          game.scores.operations.getTotalPlayers(),
          game.scores.operations.getTopPlayersByWins(10),
        ])
        
        setTotalMatches(matches)
        setTotalPlayers(players)
        setTopPlayersByWins([top.players, top.wins, top.prizes])
        
        // Fetch player score if user is connected
        if (userAddress) {
          const score = await game.scores.operations.getPlayerScore(userAddress)
          setPlayerScore([score.totalWins, score.totalPrize, score.lastMatchId, score.lastWinTimestamp])
        }
      } catch (error) {
        console.error('Error fetching score data:', error)
      }
    }
    
    fetchData()
  }, [game.scores.operations, userAddress])

  return (
    <main className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
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
                Contract Info
                {showContractInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Contract Information */}
          {showContractInfo && (
            <div className="mt-6 animate-in slide-in-from-top duration-200">
              <ContractInformation 
                type={ContractType.GAME_SCORE}
              />
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
            <ContractStats 
              totalMatches={totalMatches} 
              totalPlayers={totalPlayers} 
            />
            
            <PlayerStats playerScore={playerScore} />
            
            <Leaderboard topPlayersByWins={topPlayersByWins} />
          </div>
        )}
      </div>
    </main>
  )
}
