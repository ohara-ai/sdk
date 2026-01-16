'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, Users, Percent } from 'lucide-react'
import { usePublicClient, useBlockNumber } from 'wagmi'
import { HEAP_ABI } from '@ohara-ai/sdk'

interface HeapContractInformationProps {
  contractAddress: `0x${string}` | undefined
}

export function HeapContractInformation({ contractAddress }: HeapContractInformationProps) {
  const [copied, setCopied] = useState(false)
  const [contractInfo, setContractInfo] = useState<{
    owner: string
    controller: string
    maxActiveHeaps: bigint
    activeHeapCount: bigint
    featureName: string
    version: string
    feeRecipients: readonly string[]
    feeShares: readonly bigint[]
    totalFeeShare: bigint
    shareRecipients: readonly string[]
    shareShares: readonly bigint[]
    totalShareBasisPoints: bigint
  } | null>(null)
  const publicClient = usePublicClient()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  useEffect(() => {
    if (!contractAddress || !publicClient) {
      setContractInfo(null)
      return
    }

    const fetchContractInfo = async () => {
      try {
        const [owner, controller, maxActiveHeaps, activeHeapCount, featureName, version] = await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: HEAP_ABI,
            functionName: 'owner',
          }) as Promise<string>,
          publicClient.readContract({
            address: contractAddress,
            abi: HEAP_ABI,
            functionName: 'controller',
          }) as Promise<string>,
          publicClient.readContract({
            address: contractAddress,
            abi: HEAP_ABI,
            functionName: 'maxActiveHeaps',
          }) as Promise<bigint>,
          publicClient.readContract({
            address: contractAddress,
            abi: HEAP_ABI,
            functionName: 'getActiveHeapCount',
          }) as Promise<bigint>,
          publicClient.readContract({
            address: contractAddress,
            abi: HEAP_ABI,
            functionName: 'featureName',
          }) as Promise<string>,
          publicClient.readContract({
            address: contractAddress,
            abi: HEAP_ABI,
            functionName: 'version',
          }) as Promise<string>,
        ])

        // Fetch fee configuration
        const feeConfig = await publicClient.readContract({
          address: contractAddress,
          abi: HEAP_ABI,
          functionName: 'getFeeConfiguration',
        }) as [readonly string[], readonly bigint[], bigint]

        // Fetch share configuration
        const shareConfig = await publicClient.readContract({
          address: contractAddress,
          abi: HEAP_ABI,
          functionName: 'getShareRecipients',
        }) as [readonly string[], readonly bigint[]]

        const totalShareBasisPoints = await publicClient.readContract({
          address: contractAddress,
          abi: HEAP_ABI,
          functionName: 'totalShareBasisPoints',
        }) as bigint

        setContractInfo({
          owner,
          controller,
          maxActiveHeaps,
          activeHeapCount,
          featureName,
          version,
          feeRecipients: feeConfig[0],
          feeShares: feeConfig[1],
          totalFeeShare: feeConfig[2],
          shareRecipients: shareConfig[0],
          shareShares: shareConfig[1],
          totalShareBasisPoints,
        })
      } catch (err) {
        console.error('[HeapContractInformation] Error fetching contract info:', err)
        setContractInfo(null)
      }
    }

    fetchContractInfo()
  }, [contractAddress, publicClient, blockNumber])

  const copyToClipboard = async () => {
    if (!contractAddress) return
    await navigator.clipboard.writeText(contractAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!contractAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract Information</CardTitle>
          <CardDescription>
            Contract not deployed on this network
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Information</CardTitle>
        <CardDescription>
          Heap contract details and configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Contract Address</span>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
            </code>
            <button
              onClick={copyToClipboard}
              className="p-1 hover:bg-muted rounded"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {contractInfo && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Feature Name</span>
              <Badge variant="outline">{contractInfo.featureName}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <Badge variant="secondary">{contractInfo.version}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Owner</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {contractInfo.owner.slice(0, 6)}...{contractInfo.owner.slice(-4)}
              </code>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Controller</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {contractInfo.controller.slice(0, 6)}...{contractInfo.controller.slice(-4)}
              </code>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Heaps</span>
              <span className="font-semibold">
                {contractInfo.activeHeapCount.toString()} / {contractInfo.maxActiveHeaps.toString()}
              </span>
            </div>

            {/* Fee Configuration */}
            {contractInfo.feeRecipients.length > 0 && (
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold">Fee Configuration</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total Fee:</span>
                    <span className="font-semibold">{(Number(contractInfo.totalFeeShare) / 100).toFixed(2)}%</span>
                  </div>
                  {contractInfo.feeRecipients.map((recipient, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <code className="text-muted-foreground">
                        {recipient.slice(0, 6)}...{recipient.slice(-4)}
                      </code>
                      <span>{(Number(contractInfo.feeShares[idx]) / 100).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share Configuration */}
            {contractInfo.shareRecipients.length > 0 && (
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold">Share Recipients</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Total Share:</span>
                    <span className="font-semibold">{(Number(contractInfo.totalShareBasisPoints) / 100).toFixed(2)}%</span>
                  </div>
                  {contractInfo.shareRecipients.map((recipient, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <code className="text-muted-foreground">
                        {recipient.slice(0, 6)}...{recipient.slice(-4)}
                      </code>
                      <span>{(Number(contractInfo.shareShares[idx]) / 100).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
