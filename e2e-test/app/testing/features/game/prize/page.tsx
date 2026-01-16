'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useAccount, useBlockNumber } from 'wagmi'
import { Gift, Trophy, Swords } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOharaAi } from '@ohara-ai/sdk'
import { FeaturePageHeader } from '@/components/features/game/FeaturePageHeader'
import { CurrentPool, ClaimPrize, ConfigPanel, ShareContractsPanel, RecorderAuthPanel, PoolExplorer } from '@/components/features/game/prize'

// Native token address constant
const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000' as const

export default function GamePrizePage() {
  const { isConnected, address: userAddress } = useAccount()
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [mounted, setMounted] = useState(false)

  const [currentPoolId, setCurrentPoolId] = useState<bigint | undefined>()
  const [matchesPerPool, setMatchesPerPool] = useState<bigint | undefined>()
  const [poolInfo, setPoolInfo] = useState<
    | {
        token: `0x${string}`
        matchesCompleted: bigint
        finalized: boolean
        prizeAmount: bigint
      }
    | undefined
  >()
  const [poolWinners, setPoolWinners] = useState<{
    winners: readonly `0x${string}`[]
    winCounts: readonly bigint[]
    claimed: readonly boolean[]
  } | undefined>()
  const [claimablePools, setClaimablePools] = useState<readonly bigint[]>([])
  const [winnersCount, setWinnersCount] = useState<bigint | undefined>()
  const [distributionStrategy, setDistributionStrategy] = useState<number | undefined>()
  const [shareContracts, setShareContracts] = useState<readonly `0x${string}`[]>([])
  const [totalPoolCount, setTotalPoolCount] = useState<bigint | undefined>()
  const [tokens, setTokens] = useState<readonly `0x${string}`[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  const hasPrize = !!game.prize?.address
  const ops = game.prize?.operations

  useEffect(() => {
    const fetchInfo = async () => {
      if (!ops) return
      try {
        const [poolId, mpp, wc, ds, sc, tpc, tkns] = await Promise.all([
          ops.getCurrentPoolId(NATIVE_TOKEN),
          ops.getMatchesPerPool(),
          ops.getWinnersCount(),
          ops.getDistributionStrategy(),
          ops.getShareContracts(),
          ops.getTotalPoolCount(),
          ops.getTokens(),
        ])
        setCurrentPoolId(poolId)
        setMatchesPerPool(mpp)
        setWinnersCount(wc)
        setDistributionStrategy(ds)
        setShareContracts(sc)
        setTotalPoolCount(tpc)
        setTokens(tkns)

        if (poolId > 0n) {
          const [pool, winners] = await Promise.all([
            ops.getPool(poolId),
            ops.getPoolWinners(poolId),
          ])
          setPoolInfo({
            token: pool.token,
            matchesCompleted: pool.matchesCompleted,
            finalized: pool.finalized,
            prizeAmount: pool.prizeAmount,
          })
          setPoolWinners(winners)
        }

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
    if (!poolWinners) return false
    // Check if user is one of the winners and hasn't claimed
    const winnerIndex = poolWinners.winners.findIndex(
      w => w.toLowerCase() === userAddress.toLowerCase()
    )
    if (winnerIndex === -1) return false
    return !poolWinners.claimed[winnerIndex]
  }, [poolInfo, poolWinners, userAddress])

  const handleClaim = async (poolId: bigint): Promise<`0x${string}`> => {
    if (!ops) throw new Error('Prize operations not available')
    return await ops.claimPrize(poolId)
  }

  const handleSetWinnersCount = async (count: bigint): Promise<`0x${string}`> => {
    if (!ops) throw new Error('Prize operations not available')
    return await ops.setWinnersCount(count)
  }

  const handleSetDistributionStrategy = async (strategy: number): Promise<`0x${string}`> => {
    if (!ops) throw new Error('Prize operations not available')
    return await ops.setDistributionStrategy(strategy)
  }

  const handleSetMatchesPerPool = async (matches: bigint): Promise<`0x${string}`> => {
    if (!ops) throw new Error('Prize operations not available')
    return await ops.setMatchesPerPool(matches)
  }

  const handleAddShareContract = async (address: `0x${string}`): Promise<`0x${string}`> => {
    if (!ops) throw new Error('Prize operations not available')
    return await ops.addShareContract(address)
  }

  const handleRemoveShareContract = async (address: `0x${string}`): Promise<`0x${string}`> => {
    if (!ops) throw new Error('Prize operations not available')
    return await ops.removeShareContract(address)
  }

  const handleSetRecorderAuthorization = async (recorder: `0x${string}`, authorized: boolean): Promise<`0x${string}`> => {
    if (!ops) throw new Error('Prize operations not available')
    return await ops.setRecorderAuthorization(recorder, authorized)
  }

  const handleGetPool = async (poolId: bigint) => {
    if (!ops) throw new Error('Prize operations not available')
    return await ops.getPool(poolId)
  }

  const handleGetPoolWinners = async (poolId: bigint) => {
    if (!ops) throw new Error('Prize operations not available')
    return await ops.getPoolWinners(poolId)
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
          { label: 'Winners', value: poolWinners?.winners?.length?.toString() ?? '0' },
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
          <div className="space-y-6">
            {/* Current Pool and Claims */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CurrentPool
                  currentPoolId={currentPoolId}
                  matchesPerPool={matchesPerPool}
                  poolInfo={poolInfo}
                  poolWinners={poolWinners}
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

            {/* Owner Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ConfigPanel
                winnersCount={winnersCount}
                distributionStrategy={distributionStrategy}
                matchesPerPool={matchesPerPool}
                onSetWinnersCount={handleSetWinnersCount}
                onSetDistributionStrategy={handleSetDistributionStrategy}
                onSetMatchesPerPool={handleSetMatchesPerPool}
              />
              <PoolExplorer
                totalPoolCount={totalPoolCount}
                tokens={tokens}
                onGetPool={handleGetPool}
                onGetPoolWinners={handleGetPoolWinners}
              />
            </div>

            {/* Controller Functions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ShareContractsPanel
                shareContracts={shareContracts}
                onAddShareContract={handleAddShareContract}
                onRemoveShareContract={handleRemoveShareContract}
              />
              <RecorderAuthPanel
                onSetRecorderAuthorization={handleSetRecorderAuthorization}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
