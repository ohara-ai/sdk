'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConnectWallet } from '@/components/ConnectWallet'
import { MatchList } from '@/components/features/game-match/MatchList'
import { CreateMatchForm } from '@/components/features/game-match/CreateMatchForm'
import { MatchDetails } from '@/components/features/game-match/MatchDetails'
import { ContractInformation } from '@/components/features/ContractInformation'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { useAccount, useReadContract } from 'wagmi'
import { useContractInfo } from '@/lib/hooks/useContractInfo'
import { Button } from '@/components/ui/button'
import { GAME_MATCH_ABI } from '@/lib/contracts/gameMatch'

export default function GameMatchPage() {
  const { isConnected } = useAccount()
  const { contractAddress, factoryAddress } = useContractInfo()
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('matches')
  const [showDetails, setShowDetails] = useState(false)
  const [showContractInfo, setShowContractInfo] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: maxActiveMatches } = useReadContract({
    address: contractAddress,
    abi: GAME_MATCH_ABI,
    functionName: 'maxActiveMatches',
  })

  const { data: currentActiveMatches } = useReadContract({
    address: contractAddress,
    abi: GAME_MATCH_ABI,
    functionName: 'getActiveMatchCount',
  })

  const limits = contractAddress ? {
    maxActiveMatches,
    currentActiveMatches,
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
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Game Match</h1>
              <p className="text-base text-gray-600">
                Escrow-based match system with stake management
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
                    <p>Create a match by specifying stake amount and max players, optionally using any ERC20 token</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-900 min-w-[20px]">2.</span>
                    <p>Other players join by staking the same amount used to create the match</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-900 min-w-[20px]">3.</span>
                    <p>App activates the match, locking all stakes</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-900 min-w-[20px]">4.</span>
                    <p>Players play the game following the rules set out by the app</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-semibold text-gray-900 min-w-[20px]">5.</span>
                    <p>App finalizes match (deciding who wins) and winner receives all stakes</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900">Features</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2.5">
                  <div className="flex gap-3">
                    <span className="text-blue-500">•</span>
                    <p>Create/join matches with any ERC20 or native token</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-blue-500">•</span>
                    <p>Withdraw stakes before match activation</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-blue-500">•</span>
                    <p>Optional scoreboard integration</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-blue-500">•</span>
                    <p>Optional fee distribution to recipients</p>
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
                Please connect your wallet to interact with the Game Match feature
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1">
                  <TabsTrigger value="matches" className="data-[state=active]:bg-white">Matches</TabsTrigger>
                  <TabsTrigger value="create" className="data-[state=active]:bg-white">Create Match</TabsTrigger>
                </TabsList>
                <TabsContent value="matches" className="mt-6">
                  <MatchList 
                    onSelectMatch={setSelectedMatchId}
                    selectedMatchId={selectedMatchId}
                  />
                </TabsContent>
                <TabsContent value="create" className="mt-6">
                  <CreateMatchForm 
                    onMatchCreated={(matchId) => {
                      console.log('[GameMatchPage] Match created, selecting match:', matchId)
                      setSelectedMatchId(matchId)
                      setActiveTab('matches')
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="lg:col-span-1">
              <MatchDetails 
                matchId={selectedMatchId} 
                onMatchDeleted={() => setSelectedMatchId(null)}
              />
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
