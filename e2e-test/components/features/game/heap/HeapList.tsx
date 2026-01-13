'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Trophy, RefreshCw, Coins, Banknote } from 'lucide-react'
import { useBlockNumber, usePublicClient } from 'wagmi'
import { formatEther, zeroAddress } from 'viem'
import { HEAP_ABI } from '@ohara-ai/sdk'

interface HeapListProps {
  contractAddress: `0x${string}` | undefined
  onSelectHeap: (heapId: number) => void
  selectedHeapId: number | null
}

interface HeapData {
  id: number
  contributionAmount: string
  maxContributions: number
  currentContributors: number
  status: string
  token: string
  tokenAddress: string
  isNativeToken: boolean
  winner?: string
}

export function HeapList({ contractAddress, onSelectHeap, selectedHeapId }: HeapListProps) {
  const [heaps, setHeaps] = useState<HeapData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const publicClient = usePublicClient()

  const { data: blockNumber } = useBlockNumber({ watch: true })

  // Fetch heap details
  useEffect(() => {
    if (!contractAddress || !publicClient) {
      setHeaps([])
      return
    }

    const fetchHeaps = async () => {
      setIsLoading(true)
      const fetchedHeaps: HeapData[] = []

      try {
        console.log('[HeapList] Fetching active heap IDs')

        // Get active heap count
        const activeCount = await publicClient.readContract({
          address: contractAddress,
          abi: HEAP_ABI,
          functionName: 'getActiveHeapCount',
        }) as bigint

        // Get all active heap IDs
        const activeHeapIds = await publicClient.readContract({
          address: contractAddress,
          abi: HEAP_ABI,
          functionName: 'getActiveHeapIds',
          args: [0n, activeCount],
        }) as bigint[]

        console.log('[HeapList] Fetching heaps for IDs:', activeHeapIds)

        // Fetch details for each heap
        for (const heapId of activeHeapIds) {
          try {
            const heap = await publicClient.readContract({
              address: contractAddress,
              abi: HEAP_ABI,
              functionName: 'getHeap',
              args: [heapId],
            }) as [string, bigint, bigint, string[], number, string, bigint]

            const [token, contributionAmount, maxContributions, contributors, status, winner] = heap

            console.log(
              `[HeapList] Found heap ${heapId.toString()} with ${contributors.length} contributors, status: ${status}`,
            )
            const isNativeToken = token === zeroAddress
            fetchedHeaps.push({
              id: Number(heapId),
              contributionAmount: formatEther(contributionAmount),
              maxContributions: Number(maxContributions),
              currentContributors: contributors.length,
              status: ['Open', 'Active', 'Finalized', 'Cancelled'][status] || 'Unknown',
              token: isNativeToken
                ? 'ETH'
                : `${token.slice(0, 6)}...${token.slice(-4)}`,
              tokenAddress: token,
              isNativeToken,
              winner:
                winner !== zeroAddress
                  ? `${winner.slice(0, 6)}...${winner.slice(-4)}`
                  : undefined,
            })
          } catch (err) {
            console.error(
              `[HeapList] Error reading heap ${heapId.toString()}:`,
              err,
            )
            continue
          }
        }

        console.log(`[HeapList] Total heaps found: ${fetchedHeaps.length}`)
        setHeaps(fetchedHeaps)
      } catch (error) {
        console.error('[HeapList] Error fetching heaps:', error)
        setHeaps([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchHeaps()
  }, [contractAddress, publicClient, blockNumber, refreshTrigger])

  if (!contractAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Available Heaps</CardTitle>
          <CardDescription>
            Contract not deployed on this network
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          Please switch to a supported network
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
      case 'Cancelled':
        return 'bg-red-500/10 text-red-500'
      default:
        return 'bg-gray-500/10 text-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Heaps</CardTitle>
              <CardDescription>
                Select a heap to view details and interact
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshTrigger((prev) => prev + 1)
              }}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {isLoading && heaps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading heaps...
          </CardContent>
        </Card>
      ) : heaps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No heaps available. Create one to get started!
          </CardContent>
        </Card>
      ) : (
        heaps.map((heap: HeapData) => (
          <Card
            key={heap.id}
            className={`cursor-pointer transition-colors ${
              selectedHeapId === heap.id
                ? 'border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => {
              console.log(`[HeapList] Selected heap: ${heap.id}`)
              onSelectHeap(heap.id)
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Heap #{heap.id}</CardTitle>
                  {heap.isNativeToken ? (
                    <Badge
                      variant="outline"
                      className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                    >
                      <Banknote className="w-3 h-3 mr-1" />
                      ETH
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 text-purple-500 border-purple-500/20"
                    >
                      <Coins className="w-3 h-3 mr-1" />
                      ERC20
                    </Badge>
                  )}
                </div>
                <Badge className={getStatusColor(heap.status)}>
                  {heap.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Contribution Amount</p>
                  <div className="flex items-center gap-1">
                    {heap.isNativeToken ? (
                      <Banknote className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Coins className="w-4 h-4 text-purple-500" />
                    )}
                    <p className="font-semibold">
                      {heap.contributionAmount} {heap.token}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Contributors</p>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <p className="font-semibold">
                      {heap.currentContributors}/{heap.maxContributions}
                    </p>
                  </div>
                </div>
                {heap.winner && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Winner</p>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <p className="font-semibold">{heap.winner}</p>
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
