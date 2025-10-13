'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseEther, isAddress, zeroAddress } from 'viem'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { GAME_MATCH_ABI, getGameMatchAddress } from '@/lib/contracts/gameMatch'

export function CreateMatchForm() {
  const [stakeAmount, setStakeAmount] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('2')
  const [tokenAddress, setTokenAddress] = useState('')
  const { address } = useAccount()
  
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const contractAddress = getGameMatchAddress()

  const handleCreateMatch = async () => {
    if (!contractAddress) {
      alert('Contract not deployed on this network')
      return
    }

    try {
      const token = tokenAddress && isAddress(tokenAddress) ? tokenAddress : zeroAddress
      const stake = parseEther(stakeAmount)
      const maxPlayersNum = BigInt(maxPlayers)

      writeContract({
        address: contractAddress,
        abi: GAME_MATCH_ABI,
        functionName: 'createMatch',
        args: [token, stake, maxPlayersNum],
        value: token === zeroAddress ? stake : 0n,
      })
    } catch (error) {
      console.error('Error creating match:', error)
    }
  }

  const isLoading = isPending || isConfirming

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
          disabled={!stakeAmount || !maxPlayers || isLoading || !contractAddress}
          className="w-full"
        >
          {isPending ? 'Confirming...' : isConfirming ? 'Creating...' : 'Create Match'}
        </Button>

        {isSuccess && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-green-500">
              Match created successfully! Transaction hash: {hash?.slice(0, 10)}...
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-500">
              Error: {error.message}
            </p>
          </div>
        )}

        {!contractAddress && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-500">
              Contract not deployed on this network. Please switch to a supported network.
            </p>
          </div>
        )}

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
