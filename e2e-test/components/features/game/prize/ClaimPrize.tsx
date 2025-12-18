'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface ClaimPrizeProps {
  claimablePools: readonly bigint[]
  canClaimCurrent: boolean
  currentPoolId: bigint | undefined
  onClaim: (poolId: bigint) => Promise<`0x${string}`>
}

export function ClaimPrize({
  claimablePools,
  canClaimCurrent,
  currentPoolId,
  onClaim,
}: ClaimPrizeProps) {
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimingPoolId, setClaimingPoolId] = useState<bigint | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimTx, setClaimTx] = useState<`0x${string}` | null>(null)

  const handleClaim = async (poolId: bigint) => {
    setIsClaiming(true)
    setClaimingPoolId(poolId)
    setClaimError(null)
    setClaimTx(null)
    try {
      const tx = await onClaim(poolId)
      setClaimTx(tx)
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : 'Claim failed')
    } finally {
      setIsClaiming(false)
      setClaimingPoolId(null)
    }
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900">Claim Prize</CardTitle>
        <CardDescription className="text-gray-600">
          Claim from finalized pools where you are the winner
        </CardDescription>
      </CardHeader>
      <div className="px-6 pb-6 space-y-3">
        <div className="text-xs text-gray-600">Claimable pools for your address:</div>

        {claimablePools.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 text-center">
            No claimable pools
          </div>
        ) : (
          <div className="space-y-2">
            {claimablePools.map((pid) => (
              <div
                key={pid.toString()}
                className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
              >
                <code className="text-xs font-mono bg-white border border-gray-200 px-2 py-1 rounded">
                  Pool #{pid.toString()}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClaim(pid)}
                  disabled={isClaiming}
                  className="flex-1"
                >
                  {isClaiming && claimingPoolId === pid ? 'Claiming...' : 'Claim'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {canClaimCurrent && currentPoolId !== undefined && (
          <Button
            size="sm"
            onClick={() => handleClaim(currentPoolId)}
            disabled={isClaiming}
            className="w-full"
          >
            {isClaiming && claimingPoolId === currentPoolId
              ? 'Claiming...'
              : 'Claim Current Pool'}
          </Button>
        )}

        {claimTx && (
          <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Transaction submitted</span>
              <a
                href={`https://basescan.org/tx/${claimTx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-600 hover:text-green-700"
              >
                View <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="font-mono text-xs mt-1 break-all opacity-75">{claimTx}</p>
          </div>
        )}

        {claimError && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <span className="font-medium">Error:</span> {claimError}
          </div>
        )}
      </div>
    </Card>
  )
}
