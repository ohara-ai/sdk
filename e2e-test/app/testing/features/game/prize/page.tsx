'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAccount, useBlockNumber } from 'wagmi'
import { ArrowLeft, ChevronDown, ChevronUp, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OnchainKitWallet } from '@/components/OnchainKitWallet'
import { useOharaAi } from '@ohara-ai/sdk'

export default function GamePrizePage() {
  const { isConnected, address: userAddress } = useAccount()
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [mounted, setMounted] = useState(false)
  const [showContractInfo, setShowContractInfo] = useState(false)

  const [currentPoolId, setCurrentPoolId] = useState<bigint | undefined>()
  const [matchesPerPool, setMatchesPerPool] = useState<bigint | undefined>()
  const [poolInfo, setPoolInfo] = useState<
    | {
        matchesCompleted: bigint
        winner: `0x${string}`
        highestWins: bigint
        finalized: boolean
        prizeClaimed: boolean
      }
    | undefined
  >()
  const [claimablePools, setClaimablePools] = useState<readonly bigint[]>([])
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimTx, setClaimTx] = useState<`0x${string}` | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const hasPrize = !!game.prize?.address
  const ops = game.prize?.operations

  // Fetch core prize info
  useEffect(() => {
    const fetchInfo = async () => {
      if (!ops) return
      try {
        const [poolId, mpp] = await Promise.all([
          ops.getCurrentPoolId(),
          ops.getMatchesPerPool(),
        ])
        setCurrentPoolId(poolId)
        setMatchesPerPool(mpp)

        const pool = await ops.getPool(poolId)
        setPoolInfo({
          matchesCompleted: pool.matchesCompleted,
          winner: pool.winner,
          highestWins: pool.highestWins,
          finalized: pool.finalized,
          prizeClaimed: pool.prizeClaimed,
        })

        if (userAddress) {
          const claimable = await ops.getClaimablePools(userAddress)
          setClaimablePools(claimable)
        } else {
          setClaimablePools([])
        }
      } catch (e) {
        console.error('[GamePrizePage] Error fetching prize data:', e)
      }
    }

    fetchInfo()
  }, [ops, userAddress, blockNumber])

  const canClaim = useMemo(() => {
    if (!userAddress) return false
    if (!poolInfo) return false
    if (!poolInfo.finalized) return false
    if (poolInfo.prizeClaimed) return false
    return true
  }, [poolInfo, userAddress])

  const handleClaim = async (poolId: bigint) => {
    setIsClaiming(true)
    setClaimError(null)
    setClaimTx(null)
    try {
      if (!ops) throw new Error('Prize operations not available')
      const tx = await ops.claimPrize(poolId)
      setClaimTx(tx)
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : 'Claim failed')
    } finally {
      setIsClaiming(false)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                GamePrize
              </h1>
              <p className="text-base text-gray-600">
                Prize pools, winners, and claims
              </p>
            </div>

            <div className="flex items-center gap-3">
              <OnchainKitWallet />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContractInfo(!showContractInfo)}
                className="flex items-center gap-1.5"
              >
                Contract Info
                {showContractInfo ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {showContractInfo && (
            <div className="mt-6 animate-in slide-in-from-top duration-200">
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Contract</CardTitle>
                  <CardDescription className="text-gray-600">
                    Prize contract address from SDK context
                  </CardDescription>
                </CardHeader>
                <div className="px-6 pb-6">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-emerald-600" />
                    <code className="text-xs font-mono break-all">
                      {!mounted ? 'Loading...' : game.prize?.address || 'Not deployed'}
                    </code>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

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
                Please connect your wallet to view and claim prizes
              </CardDescription>
            </CardHeader>
          </Card>
        ) : !hasPrize ? (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Prize not deployed</CardTitle>
              <CardDescription className="text-gray-600">
                Use the Deployment Plan on the homepage and select `Prize`.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-2 border-gray-200 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-gray-900">Current Pool</CardTitle>
                <CardDescription className="text-gray-600">
                  Live view of the current prize pool.
                </CardDescription>
              </CardHeader>
              <div className="px-6 pb-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Pool ID</span>
                  <span className="font-mono font-semibold">
                    {currentPoolId?.toString() ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Matches / Pool</span>
                  <span className="font-mono font-semibold">
                    {matchesPerPool?.toString() ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Matches Completed</span>
                  <span className="font-mono font-semibold">
                    {poolInfo?.matchesCompleted?.toString() ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Winner</span>
                  <span className="font-mono font-semibold">
                    {poolInfo?.winner ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Highest Wins</span>
                  <span className="font-mono font-semibold">
                    {poolInfo?.highestWins?.toString() ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Finalized</span>
                  <span className="font-mono font-semibold">
                    {poolInfo ? (poolInfo.finalized ? 'true' : 'false') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Prize Claimed</span>
                  <span className="font-mono font-semibold">
                    {poolInfo ? (poolInfo.prizeClaimed ? 'true' : 'false') : '—'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Claim</CardTitle>
                <CardDescription className="text-gray-600">
                  Claim from claimable pools.
                </CardDescription>
              </CardHeader>
              <div className="px-6 pb-6 space-y-3">
                <div className="text-xs text-gray-600">
                  Claimable pools for your address:
                </div>
                {claimablePools.length === 0 ? (
                  <div className="text-sm text-gray-500">None</div>
                ) : (
                  <div className="space-y-2">
                    {claimablePools.map((pid) => (
                      <div key={pid.toString()} className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-gray-50 border border-gray-200 px-2 py-1 rounded">
                          {pid.toString()}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClaim(pid)}
                          disabled={isClaiming}
                          className="flex-1"
                        >
                          {isClaiming ? 'Claiming...' : 'Claim'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {canClaim && currentPoolId !== undefined && (
                  <Button
                    size="sm"
                    onClick={() => handleClaim(currentPoolId)}
                    disabled={isClaiming}
                    className="w-full"
                  >
                    {isClaiming ? 'Claiming...' : 'Claim Current Pool'}
                  </Button>
                )}

                {claimTx && (
                  <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2 break-all">
                    Tx: {claimTx}
                  </div>
                )}
                {claimError && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    {claimError}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  )
}
