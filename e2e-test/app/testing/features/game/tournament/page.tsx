'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  TournamentContractInformation,
  TournamentBracket,
} from '@/components/features/game/tournament'
import { FeaturePageHeader } from '@/components/features/game/FeaturePageHeader'
import { Brackets, Trophy, Plus, RefreshCw, Loader2 } from 'lucide-react'
import { useAccount, useBlockNumber } from 'wagmi'
import { useOharaAi, TournamentStatus } from '@ohara-ai/sdk'
import type { TournamentView } from '@ohara-ai/sdk'
import { Button } from '@/components/ui/button'

interface TournamentListItem {
  id: bigint
  data: TournamentView
}

export default function TournamentPage() {
  const { isConnected } = useAccount()
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const tournamentOps = game.tournament?.operations
  const tournamentAddress = game.tournament?.address

  const [mounted, setMounted] = useState(false)
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([])
  const [activeTournamentCount, setActiveTournamentCount] = useState<bigint | undefined>()
  const [maxActiveTournaments, setMaxActiveTournaments] = useState<bigint | undefined>()
  const [maxParticipants, setMaxParticipants] = useState<bigint | undefined>()
  const [loading, setLoading] = useState(true)
  const [selectedTournament, setSelectedTournament] = useState<bigint | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      if (!tournamentOps) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const [activeCount, maxActive, maxPart] = await Promise.all([
          tournamentOps.getActiveTournamentCount(),
          tournamentOps.getMaxActiveTournaments(),
          tournamentOps.getMaxParticipants(),
        ])

        setActiveTournamentCount(activeCount)
        setMaxActiveTournaments(maxActive)
        setMaxParticipants(maxPart)

        // Fetch first few tournaments (we'll fetch up to 10)
        const tournamentList: TournamentListItem[] = []
        for (let i = 1n; i <= 10n; i++) {
          try {
            const tournamentData = await tournamentOps.getTournament(i)
            if (tournamentData.createdAt > 0n) {
              tournamentList.push({ id: i, data: tournamentData })
            }
          } catch {
            // Tournament doesn't exist, stop fetching
            break
          }
        }
        setTournaments(tournamentList)

        // Select first tournament if none selected
        if (tournamentList.length > 0 && selectedTournament === null) {
          setSelectedTournament(tournamentList[0].id)
        }
      } catch (error) {
        console.error('Error fetching tournament data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [tournamentOps, blockNumber, selectedTournament])

  const getStatusColor = (status: TournamentStatus) => {
    switch (status) {
      case TournamentStatus.Pending:
        return 'bg-yellow-100 text-yellow-800'
      case TournamentStatus.Active:
        return 'bg-green-100 text-green-800'
      case TournamentStatus.Finalized:
        return 'bg-blue-100 text-blue-800'
      case TournamentStatus.Cancelled:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: TournamentStatus) => {
    switch (status) {
      case TournamentStatus.Pending:
        return 'Pending'
      case TournamentStatus.Active:
        return 'Active'
      case TournamentStatus.Finalized:
        return 'Finalized'
      case TournamentStatus.Cancelled:
        return 'Cancelled'
      default:
        return 'Unknown'
    }
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header Section */}
      <FeaturePageHeader
        title="Tournament"
        description="Bracket-based elimination tournaments with seeding"
        icon={<Brackets className="w-5 h-5 text-rose-600" />}
        iconBg="bg-rose-100"
        contractAddress={tournamentAddress}
        configItems={[
          {
            label: 'Active Tournaments',
            value: activeTournamentCount?.toString(),
            highlight: true,
          },
          {
            label: 'Max Active',
            value: maxActiveTournaments?.toString(),
          },
          {
            label: 'Max Participants',
            value: maxParticipants?.toString(),
            highlight: true,
          },
        ]}
        additionalContracts={[
          {
            label: 'Score Contract',
            address: game.scores?.address,
            icon: <Trophy className="w-3 h-3 text-amber-600" />,
            iconBg: 'bg-amber-50',
          },
        ]}
      />

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
                Please connect your wallet to view Tournament data
              </CardDescription>
            </CardHeader>
          </Card>
        ) : !tournamentAddress ? (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Tournament Not Deployed</CardTitle>
              <CardDescription className="text-gray-600">
                Deploy the Tournament contract from the main page to use this feature
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main content - Bracket or placeholder */}
            <div className="lg:col-span-3">
              {loading ? (
                <Card className="border-2 border-gray-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <CardTitle className="text-gray-900">Loading tournaments...</CardTitle>
                    </div>
                  </CardHeader>
                </Card>
              ) : selectedTournament !== null ? (
                <TournamentBracket tournamentId={selectedTournament} />
              ) : (
                <Card className="border-2 border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900">No Tournaments</CardTitle>
                    <CardDescription className="text-gray-600">
                      No tournaments have been created yet. Create one to get started.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Tournament List */}
              <Card className="border-2 border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Tournaments</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLoading(true)}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <div className="px-4 pb-4">
                  {tournaments.length === 0 ? (
                    <p className="text-xs text-gray-500">No tournaments found</p>
                  ) : (
                    <div className="space-y-2">
                      {tournaments.map((t) => (
                        <button
                          key={t.id.toString()}
                          onClick={() => setSelectedTournament(t.id)}
                          className={`w-full text-left p-2 rounded-lg border transition-colors ${
                            selectedTournament === t.id
                              ? 'border-rose-300 bg-rose-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Tournament #{t.id.toString()}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusColor(t.data.status)}`}>
                              {getStatusLabel(t.data.status)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {t.data.participantCount.toString()} participants
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Contract Information */}
              <TournamentContractInformation />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
