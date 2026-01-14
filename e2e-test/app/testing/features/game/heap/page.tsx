'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  HeapList,
  CreateHeapForm,
  HeapDetails,
  HeapContractInformation,
} from '@/components/features/game/heap'
import { FeaturePageHeader } from '@/components/features/game/FeaturePageHeader'
import { Coins, Trophy } from 'lucide-react'
import { useAccount, useBlockNumber } from 'wagmi'
import { useOharaAi } from '@ohara-ai/sdk'

export default function HeapPage() {
  const { isConnected } = useAccount()
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const heapOps = game.heap?.operations
  const heapAddress = game.heap?.address

  const [selectedHeapId, setSelectedHeapId] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('heaps')

  const [activeHeapCount, setActiveHeapCount] = useState<bigint | undefined>()
  const [maxActiveHeaps, setMaxActiveHeaps] = useState<bigint | undefined>()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!heapOps) return

    const fetchHeapData = async () => {
      try {
        const [activeCount, maxActive] = await Promise.all([
          heapOps.getActiveHeapCount(),
          heapOps.getMaxActiveHeaps(),
        ])

        setActiveHeapCount(activeCount)
        setMaxActiveHeaps(maxActive)
      } catch (error) {
        console.error('[HeapPage] Error fetching heap data:', error)
      }
    }

    fetchHeapData()
  }, [heapOps, blockNumber])

  return (
    <main className="min-h-screen bg-white">
      {/* Header Section */}
      <FeaturePageHeader
        title="Heap"
        description="Token collection pools with contribution-based entries"
        icon={<Coins className="w-5 h-5 text-orange-600" />}
        iconBg="bg-orange-100"
        contractAddress={heapAddress}
        configItems={[
          { label: 'Active Heaps', value: activeHeapCount?.toString(), highlight: true },
          { label: 'Max Active', value: maxActiveHeaps === 0n ? '∞' : maxActiveHeaps?.toString() },
        ]}
        additionalContracts={[
          {
            label: 'Score Contract',
            address: game.scores?.address,
            icon: <Trophy className="w-3 h-3 text-amber-600" />,
            iconBg: 'bg-amber-50',
          },
        ]}
      />

      {/* Content Section */}
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
                Please connect your wallet to interact with the Heap feature
              </CardDescription>
            </CardHeader>
          </Card>
        ) : !heapAddress ? (
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Heap Not Deployed</CardTitle>
              <CardDescription className="text-gray-600">
                Deploy the Heap contract from the main page to use this feature
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1">
                  <TabsTrigger
                    value="heaps"
                    className="data-[state=active]:bg-white"
                  >
                    Heaps
                  </TabsTrigger>
                  <TabsTrigger
                    value="create"
                    className="data-[state=active]:bg-white"
                  >
                    Create Heap
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="heaps" className="mt-6">
                  <HeapList
                    contractAddress={heapAddress}
                    onSelectHeap={setSelectedHeapId}
                    selectedHeapId={selectedHeapId}
                  />
                </TabsContent>
                <TabsContent value="create" className="mt-6">
                  <CreateHeapForm
                    contractAddress={heapAddress}
                    onHeapCreated={(heapId) => {
                      console.log(
                        '[HeapPage] Heap created, selecting heap:',
                        heapId,
                      )
                      setSelectedHeapId(heapId)
                      setActiveTab('heaps')
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="lg:col-span-1 space-y-6">
              {selectedHeapId !== null && (
                <HeapDetails
                  contractAddress={heapAddress}
                  heapId={selectedHeapId}
                />
              )}
              <HeapContractInformation contractAddress={heapAddress} />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
