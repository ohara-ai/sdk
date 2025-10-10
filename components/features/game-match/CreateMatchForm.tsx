'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseEther } from 'viem'

export function CreateMatchForm() {
  const [stakeAmount, setStakeAmount] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('2')
  const [tokenAddress, setTokenAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateMatch = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement contract interaction
      console.log('Creating match:', { stakeAmount, maxPlayers, tokenAddress })
      alert('Match creation will be implemented with contract integration')
    } catch (error) {
      console.error('Error creating match:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Match</CardTitle>
        <CardDescription>
          Set up a new match for players to join
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="stakeAmount">Stake Amount (ETH)</Label>
          <Input
            id="stakeAmount"
            type="number"
            step="0.001"
            placeholder="0.01"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Amount each player must stake to join
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxPlayers">Maximum Players</Label>
          <Input
            id="maxPlayers"
            type="number"
            min="2"
            placeholder="2"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Minimum 2 players required
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokenAddress">Token Address (Optional)</Label>
          <Input
            id="tokenAddress"
            placeholder="0x... (leave empty for ETH)"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use native ETH, or specify ERC20 token address
          </p>
        </div>

        <Button 
          onClick={handleCreateMatch} 
          disabled={!stakeAmount || !maxPlayers || isLoading}
          className="w-full"
        >
          {isLoading ? 'Creating...' : 'Create Match'}
        </Button>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> You will automatically join the match as the first player
            and your stake will be locked immediately.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
