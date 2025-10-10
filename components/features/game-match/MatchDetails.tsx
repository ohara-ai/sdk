'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Trophy, Clock } from 'lucide-react'

interface MatchDetailsProps {
  matchId: number | null
}

// Mock data for demonstration
const mockMatchDetails = {
  0: {
    id: 0,
    stakeAmount: '0.01',
    maxPlayers: 3,
    status: 'Open',
    token: 'ETH',
    players: ['0x1234...5678', '0xabcd...ef01'],
    canJoin: true,
    canWithdraw: false,
    isPlayer: false,
  },
  1: {
    id: 1,
    stakeAmount: '0.05',
    maxPlayers: 2,
    status: 'Active',
    token: 'ETH',
    players: ['0x1234...5678', '0xabcd...ef01'],
    canJoin: false,
    canWithdraw: false,
    isPlayer: true,
  },
  2: {
    id: 2,
    stakeAmount: '0.02',
    maxPlayers: 4,
    status: 'Finalized',
    token: 'ETH',
    players: ['0x1234...5678', '0xabcd...ef01', '0x9876...5432', '0xfedc...ba98'],
    winner: '0x1234...5678',
    prize: '0.08',
    canJoin: false,
    canWithdraw: false,
    isPlayer: false,
  },
}

export function MatchDetails({ matchId }: MatchDetailsProps) {
  if (matchId === null) {
    return (
      <Card className="h-fit sticky top-8">
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
          <CardDescription>
            Select a match to view details
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No match selected
        </CardContent>
      </Card>
    )
  }

  const match = mockMatchDetails[matchId as keyof typeof mockMatchDetails]

  if (!match) {
    return (
      <Card className="h-fit sticky top-8">
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          Match not found
        </CardContent>
      </Card>
    )
  }

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
    <Card className="h-fit sticky top-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Match #{match.id}</CardTitle>
          <Badge className={getStatusColor(match.status)}>
            {match.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Stake Amount</span>
            <span className="font-semibold">{match.stakeAmount} {match.token}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Prize</span>
            <span className="font-semibold">
              {(parseFloat(match.stakeAmount) * match.players.length).toFixed(4)} {match.token}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Players</span>
            <span className="font-semibold">
              {match.players.length}/{match.maxPlayers}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Players</h4>
          <div className="space-y-2">
            {match.players.map((player, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50"
              >
                <span className="text-sm font-mono">{player}</span>
                {match.winner === player && (
                  <Trophy className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {match.winner && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h4 className="font-semibold text-yellow-500">Winner</h4>
            </div>
            <p className="text-sm font-mono">{match.winner}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Prize: {match.prize} {match.token}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {match.canJoin && (
            <Button className="w-full">
              Join Match
            </Button>
          )}
          {match.canWithdraw && match.isPlayer && (
            <Button variant="outline" className="w-full">
              Withdraw Stake
            </Button>
          )}
          {match.status === 'Open' && !match.canJoin && !match.isPlayer && (
            <p className="text-xs text-center text-muted-foreground">
              Match is full or you're already a player
            </p>
          )}
          {match.status === 'Active' && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <p className="text-sm text-blue-500">
                  Match is active. Waiting for controller to finalize.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
