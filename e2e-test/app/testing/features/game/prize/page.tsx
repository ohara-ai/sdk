'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useAccount, useBlockNumber } from 'wagmi'
import { Gift, Trophy, Swords } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOharaAi } from '@ohara-ai/sdk'
import { FeaturePageHeader } from '@/components/features/game/FeaturePageHeader'
import { CurrentPool, ClaimPrize } from '@/components/features/game/prize'

export default function GamePrizePage() {
  const { isConnected, address: userAddress } = useAccount()
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [mounted, setMounted] = useState(false)

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

  useEffect(() => {
    setMounted(true)
  }, [])

  const hasPrize = !!game.prize?.address
  const ops = game.prize?.operations

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

  const canClaimCurrent = useMemo(() => {
    if (!userAddress) return false
    if (!poolInfo) return false
    if (!poolInfo.finalized) return false
    if (poolInfo.prizeClaimed) return false
    return poolInfo.winner.toLowerCase() === userAddress.toLowerCase()
  }, [poolInfo, userAddress])

  const handleClaim = async (poolId: bigint): Promise<`0x${string}`> => {
    if (!ops) throw new Error('Prize operations not available')
    return await ops.claimPrize(poolId)
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header Section */}
      <FeaturePageHeader
        title="Game Prize"
        description="Prize pools, winners, and claims"
        icon={<Gift className="w-5 h-5 text-emerald-600" />}
        iconBg="bg-emerald-100"
        contractAddress={game.prize?.address}
        configItems={[
          { label: 'Current Pool', value: currentPoolId?.toString(), highlight: true },
          { label: 'Matches/Pool', value: matchesPerPool?.toString() },
          { label: 'Pool Finalized', value: poolInfo?.finalized ? 'Yes' : 'No' },
          { label: 'Prize Claimed', value: poolInfo?.prizeClaimed ? 'Yes' : 'No' },
        ]}
        additionalContracts={[
          {
            label: 'Match Contract',
            address: game.match?.address,
            icon: <Swords className="w-3 h-3 text-purple-600" />,
            iconBg: 'bg-purple-50',
          },
          {
            label: 'Score Contract',
            address: game.scores?.address,
            icon: <Trophy className="w-3 h-3 text-amber-600" />,
            iconBg: 'bg-amber-50',
          },
        ]}
      />

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
            <div className="lg:col-span-2">
              <CurrentPool
                currentPoolId={currentPoolId}
                matchesPerPool={matchesPerPool}
                poolInfo={poolInfo}
              />
            </div>
            <div className="lg:col-span-1">
              <ClaimPrize
                claimablePools={claimablePools}
                canClaimCurrent={canClaimCurrent}
                currentPoolId={currentPoolId}
                onClaim={handleClaim}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
