'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Trophy } from 'lucide-react'

interface MatchListProps {
  onSelectMatch: (matchId: number) => void
  selectedMatchId: number | null
}

// Mock data for demonstration
const mockMatches = [
  {
    id: 0,
    stakeAmount: '0.01',
    maxPlayers: 3,
    currentPlayers: 2,
    status: 'Open',
    token: 'ETH',
  },
  {
    id: 1,
    stakeAmount: '0.05',
    maxPlayers: 2,
    currentPlayers: 2,
    status: 'Active',
    token: 'ETH',
  },
  {
    id: 2,
    stakeAmount: '0.02',
    maxPlayers: 4,
    currentPlayers: 4,
    status: 'Finalized',
    token: 'ETH',
    winner: '0x1234...5678',
  },
]

export function MatchList({ onSelectMatch, selectedMatchId }: MatchListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-green-500/10 text-green-500'
      case 'Active':
        return 'bg-blue-500/10 text-blue-500'
      case 'Finalized':
        return 'bg-gray-500/10 text-gray-500'
      default:
        return 'bg-gray-500/10 text-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Available Matches</CardTitle>
          <CardDescription>
            Select a match to view details and interact
          </CardDescription>
        </CardHeader>
      </Card>

      {mockMatches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No matches available. Create one to get started!
          </CardContent>
        </Card>
      ) : (
        mockMatches.map((match) => (
          <Card
            key={match.id}
            className={`cursor-pointer transition-colors ${
              selectedMatchId === match.id ? 'border-primary' : 'hover:border-primary/50'
            }`}
            onClick={() => onSelectMatch(match.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Match #{match.id}</CardTitle>
                <Badge className={getStatusColor(match.status)}>
                  {match.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Stake Amount</p>
                  <p className="font-semibold">{match.stakeAmount} {match.token}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Players</p>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <p className="font-semibold">
                      {match.currentPlayers}/{match.maxPlayers}
                    </p>
                  </div>
                </div>
                {match.winner && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Winner</p>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <p className="font-semibold">{match.winner}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
