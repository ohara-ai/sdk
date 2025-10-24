'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseEther, isAddress, zeroAddress } from 'viem'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { useOharaAi, useTokenApproval, GAME_MATCH_ABI } from '@/sdk/src'

interface CreateMatchFormProps {
  onMatchCreated?: (matchId: number) => void
}

export function CreateMatchForm({ onMatchCreated }: CreateMatchFormProps) {
  const [stakeAmount, setStakeAmount] = useState('')
  const [maxPlayers, setMaxPlayers] = useState('2')
  const [tokenAddress, setTokenAddress] = useState('')
  const { address } = useAccount()
  const chainId = useChainId()
  const { game } = useOharaAi()
  const contractAddress = game.match.address
  
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash })

  // Parse token and stake for approval hook
  const token = tokenAddress && isAddress(tokenAddress) ? tokenAddress : zeroAddress
  const stake = stakeAmount ? parseEther(stakeAmount) : 0n

  // Use token approval hook
  const {
    needsApproval,
    isNativeToken,
    approve,
    isApprovePending,
    isApproveConfirming,
    isApproveSuccess,
    approveError,
  } = useTokenApproval({
    tokenAddress: token,
    spenderAddress: contractAddress || zeroAddress,
    amount: stake,
    enabled: !!stakeAmount && !!contractAddress,
  })

  // Extract matchId from transaction logs when match is created successfully
  useEffect(() => {
    if (isSuccess && receipt && onMatchCreated && contractAddress) {
      try {
        // Find the MatchCreated event in the logs from our contract
        const matchCreatedLog = receipt.logs.find(log => 
          log.address.toLowerCase() === contractAddress!.toLowerCase() &&
          log.topics && 
          log.topics.length > 1
        )

        if (matchCreatedLog?.topics?.[1]) {
          // The matchId is the first indexed parameter (topics[1])
          const matchId = Number(BigInt(matchCreatedLog.topics[1]))
          console.log('[CreateMatchForm] New match created with ID:', matchId)
          onMatchCreated(matchId)
        }
      } catch (error) {
        console.error('[CreateMatchForm] Error extracting matchId from logs:', error)
      }
    }
  }, [isSuccess, receipt, onMatchCreated, contractAddress])

  const handleCreateMatch = async () => {
    if (!contractAddress) {
      alert('Contract not deployed on this network')
      return
    }

    try {
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
  const isApprovalLoading = isApprovePending || isApproveConfirming

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
          <Label htmlFor="stakeAmount">Stake Amount</Label>
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

        {/* Show approval status for custom tokens */}
        {!isNativeToken && token !== zeroAddress && (
          <div className="p-3 rounded-lg border space-y-2">
            <div className="flex items-start gap-2">
              {isApproveSuccess || !needsApproval ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {isApproveSuccess || !needsApproval ? 'Token Approved' : 'Token Approval Required'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isApproveSuccess || !needsApproval
                    ? 'You can now create the match'
                    : 'Approve the contract to spend your tokens'}
                </p>
              </div>
            </div>
            {needsApproval && (
              <Button
                onClick={approve}
                disabled={isApprovalLoading}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {isApprovePending ? 'Confirming...' : isApproveConfirming ? 'Approving...' : 'Approve Token'}
              </Button>
            )}
          </div>
        )}

        <Button 
          onClick={handleCreateMatch} 
          disabled={!stakeAmount || !maxPlayers || isLoading || !contractAddress || needsApproval}
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

        {approveError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-500">
              Approval Error: {approveError.message}
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
