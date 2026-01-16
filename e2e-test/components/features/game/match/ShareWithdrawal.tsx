'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Share2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAccount, useWaitForTransactionReceipt, useBlockNumber, useWalletClient } from 'wagmi'
import { formatEther, zeroAddress } from 'viem'
import { useOharaAi } from '@ohara-ai/sdk'

interface PendingShares {
  token: `0x${string}`
  amount: bigint
  tokenSymbol: string
}

export function ShareWithdrawal() {
  const { address } = useAccount()
  const { status: walletStatus } = useWalletClient()
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  
  const isWalletReady = walletStatus === 'success'

  const [pendingShares, setPendingShares] = useState<PendingShares[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRecipient, setIsRecipient] = useState(false)

  const [withdrawHash, setWithdrawHash] = useState<`0x${string}` | undefined>()
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<Error | null>(null)
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash })

  // Fetch share configuration to check if user is a recipient
  useEffect(() => {
    if (!game.match?.operations || !address) return

    const checkShareRecipient = async () => {
      try {
        const shareConfig = await game.match.operations!.getShareConfiguration()
        const recipients = Array.from(shareConfig.recipients)
        setIsRecipient(
          recipients.some((r) => r.toLowerCase() === address.toLowerCase()),
        )
      } catch (error) {
        console.error('[ShareWithdrawal] Error checking share recipient:', error)
      }
    }

    checkShareRecipient()
  }, [game.match?.operations, address, blockNumber])

  // Fetch pending shares for the connected wallet
  useEffect(() => {
    if (!game.match?.operations || !address || !isRecipient) {
      setPendingShares([])
      return
    }

    const fetchPendingShares = async () => {
      setIsLoading(true)
      try {
        // Check native token (ETH) shares using SDK
        const nativeShares = await game.match.operations!.getPendingShares(
          address,
          zeroAddress,
        )

        const shares: PendingShares[] = []

        if (nativeShares > 0n) {
          shares.push({
            token: zeroAddress,
            amount: nativeShares,
            tokenSymbol: 'ETH',
          })
        }

        // TODO: Add support for ERC20 token shares if needed
        // You would need to track which tokens have been used in matches

        setPendingShares(shares)
      } catch (error) {
        console.error('[ShareWithdrawal] Error fetching pending shares:', error)
        setPendingShares([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingShares()
  }, [
    game.match?.operations,
    address,
    isRecipient,
    blockNumber,
    isWithdrawSuccess,
  ])

  const handleClaimShares = async (token: `0x${string}`) => {
    if (!game.match?.operations || !address) return

    try {
      setIsWithdrawing(true)
      setWithdrawError(null)

      // Call claimShares using SDK
      const hash = await game.match.operations.claimShares(token)
      setWithdrawHash(hash)
    } catch (err) {
      console.error('[ShareWithdrawal] Error claiming shares:', err)
      setWithdrawError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsWithdrawing(false)
    }
  }

  // Reset success state after some time
  useEffect(() => {
    if (isWithdrawSuccess) {
      const timer = setTimeout(() => {
        setWithdrawHash(undefined)
        setWithdrawError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isWithdrawSuccess])

  if (!address) {
    return null
  }

  if (!isRecipient) {
    return null
  }

  const totalPendingEth = pendingShares.reduce(
    (sum, share) => (share.token === zeroAddress ? sum + share.amount : sum),
    0n,
  )
  const hasPendingShares = pendingShares.some((share) => share.amount > 0n)

  return (
    <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Share2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">
                Share Withdrawal
              </CardTitle>
              <CardDescription className="text-xs">
                Claim your accumulated shares
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-emerald-100 text-emerald-700 border-emerald-300"
          >
            Share Recipient
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Loading pending shares...</p>
          </div>
        ) : !hasPendingShares ? (
          <div className="text-center py-4 bg-white/60 rounded-lg border border-emerald-200">
            <p className="text-sm text-gray-600">No shares to claim</p>
            <p className="text-xs text-gray-500 mt-1">
              Shares will appear here after matches are finalized
            </p>
          </div>
        ) : (
          <>
            {/* Pending Shares Display */}
            <div className="space-y-3">
              {pendingShares.map((share, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-4 border-2 border-emerald-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      {share.tokenSymbol}
                    </span>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatEther(share.amount)} {share.tokenSymbol}
                    </span>
                  </div>
                  <Button
                    onClick={() => handleClaimShares(share.token)}
                    disabled={
                      isWithdrawing || isWithdrawConfirming || share.amount === 0n || !isWalletReady
                    }
                    variant="user"
                    className="w-full"
                  >
                    {isWithdrawing
                      ? 'Confirming...'
                      : isWithdrawConfirming
                        ? 'Claiming...'
                        : `Claim ${share.tokenSymbol}`}
                  </Button>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            {totalPendingEth > 0n && (
              <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg p-3 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    Total Pending
                  </span>
                  <span className="text-lg font-bold text-emerald-700">
                    {formatEther(totalPendingEth)} ETH
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Success Message */}
        {isWithdrawSuccess && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-500 font-medium">
                Shares claimed successfully!
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {withdrawError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-500">
                Error: {withdrawError.message}
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="pt-3 border-t border-emerald-200">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> Shares are accumulated from finalized matches
            based on your registered share percentage. You need to manually claim
            your shares using the button above.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
