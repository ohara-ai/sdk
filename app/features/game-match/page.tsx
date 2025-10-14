'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConnectWallet } from '@/components/ConnectWallet'
import { MatchList } from '@/components/features/game-match/MatchList'
import { CreateMatchForm } from '@/components/features/game-match/CreateMatchForm'
import { MatchDetails } from '@/components/features/game-match/MatchDetails'
import { ContractInformation } from '@/components/features/ContractInformation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useContractInfo } from '@/lib/hooks/useContractInfo'

export default function GameMatchPage() {
  const { isConnected } = useAccount()
  const { contractAddress, factoryAddress } = useContractInfo()
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('matches')

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
              <h1 className="text-4xl font-bold mb-2">Game Match</h1>
              <p className="text-xl text-muted-foreground">
                Escrow-based match system with stake management
              </p>
            </div>
            <ConnectWallet />
          </div>
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

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. Create a match by specifying stake amount and max players</p>
              <p>2. Other players join by staking the same amount</p>
              <p>3. App activates the match, locking all stakes</p>
              <p>4. App finalizes match and winner receives all stakes</p>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Smart Contract</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Factory-based deployment for efficiency</p>
              <p>• Controller role for match management</p>
              <p>• Gas-optimized match data cleanup</p>
              <p>• Comprehensive event emissions</p>
            </CardContent>
          </Card>
        </div>

        {/* Contract Information */}
        <div className="mt-12">
          <ContractInformation 
            factoryAddress={factoryAddress}
            contractAddress={contractAddress}
          />
        </div>
      </div>
    </main>
  )
}
