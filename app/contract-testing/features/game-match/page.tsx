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
import { useAccount } from 'wagmi'
import { useContractInfo } from '@/lib/hooks/useContractInfo'
import { Button } from '@/components/ui/button'

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

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Features
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">Game Match</h1>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xl text-muted-foreground">
                  Escrow-based match system with stake management
                </p>
              </div>
            </div>
            <div>
              <ConnectWallet />

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContractInfo(!showContractInfo)}
                  className="flex items-center gap-1"
                >
                  Info
                  {showContractInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1"
                >
                  Details
                  {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Contract Information */}
          {showContractInfo && (
            <div className="mt-6">
              <ContractInformation 
                factoryAddress={factoryAddress}
                contractAddress={contractAddress}
              />
            </div>
          )}

          {showDetails && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>1. Create a match by specifying stake amount and max players, optionally using any ERC20 token as the stake in game</p>
                  <p>2. Other players join by staking the same amount used to create the match</p>
                  <p>3. App activates the match, locking all stakes</p>
                  <p>4. Players play the game following the rules set out by the app.</p>
                  <p>5. App finalizes match (deciding who wins) and winner receives all stakes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Features</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>• Create/join matches with any ERC20 or native token</p>
                  <p>• Withdraw stakes before match activation</p>
                  <p>• Optional scoreboard integration</p>
                  <p>• Optional fee distribution to recipients</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {!mounted ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>
                Initializing application
              </CardDescription>
            </CardHeader>
          </Card>
        ) : !isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to interact with the Game Match feature
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="matches">Matches</TabsTrigger>
                  <TabsTrigger value="create">Create Match</TabsTrigger>
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
          </>
        )}

      </div>
    </main>
  )
}
