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
import { DollarSign, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAccount, useWaitForTransactionReceipt, useBlockNumber } from 'wagmi'
import { formatEther, zeroAddress } from 'viem'
import { useOharaAi } from '@ohara-ai/sdk'

interface PendingFees {
  token: `0x${string}`
  amount: bigint
  tokenSymbol: string
}

export function FeeWithdrawal() {
  const { address } = useAccount()
  const { game } = useOharaAi()
  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [pendingFees, setPendingFees] = useState<PendingFees[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [feeRecipients, setFeeRecipients] = useState<`0x${string}`[]>([])
  const [isRecipient, setIsRecipient] = useState(false)

  const [withdrawHash, setWithdrawHash] = useState<`0x${string}` | undefined>()
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<Error | null>(null)
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({ hash: withdrawHash })

  // Fetch fee configuration to check if user is a recipient
  useEffect(() => {
    if (!game.match?.operations || !address) return

    const checkFeeRecipient = async () => {
      try {
        const feeConfig = await game.match.operations!.getFeeConfiguration()
        const recipients = Array.from(feeConfig.recipients)
        setFeeRecipients(recipients)
        setIsRecipient(
          recipients.some((r) => r.toLowerCase() === address.toLowerCase()),
        )
      } catch (error) {
        console.error('[FeeWithdrawal] Error checking fee recipient:', error)
      }
    }

    checkFeeRecipient()
  }, [game.match?.operations, address, blockNumber])

  // Fetch pending fees for the connected wallet
  useEffect(() => {
    if (!game.match?.operations || !address || !isRecipient) {
      setPendingFees([])
      return
    }

    const fetchPendingFees = async () => {
      setIsLoading(true)
      try {
        // Check native token (ETH) fees using SDK
        const nativeFees = await game.match.operations!.getPendingFees(
          address,
          zeroAddress,
        )

        const fees: PendingFees[] = []

        if (nativeFees > 0n) {
          fees.push({
            token: zeroAddress,
            amount: nativeFees,
            tokenSymbol: 'ETH',
          })
        }

        // TODO: Add support for ERC20 token fees if needed
        // You would need to track which tokens have been used in matches

        setPendingFees(fees)
      } catch (error) {
        console.error('[FeeWithdrawal] Error fetching pending fees:', error)
        setPendingFees([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingFees()
  }, [
    game.match?.operations,
    address,
    isRecipient,
    blockNumber,
    isWithdrawSuccess,
  ])

  const handleWithdrawFees = async (token: `0x${string}`) => {
    if (!game.match?.operations || !address) return

    try {
      setIsWithdrawing(true)
      setWithdrawError(null)

      // Call withdrawFees using SDK
      const hash = await game.match.operations.withdrawFees(token)
      setWithdrawHash(hash)
    } catch (err) {
      console.error('[FeeWithdrawal] Error withdrawing fees:', err)
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

  const totalPendingEth = pendingFees.reduce(
    (sum, fee) => (fee.token === zeroAddress ? sum + fee.amount : sum),
    0n,
  )
  const hasPendingFees = pendingFees.some((fee) => fee.amount > 0n)

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">
                Fee Withdrawal
              </CardTitle>
              <CardDescription className="text-xs">
                Withdraw your accumulated fees
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-purple-100 text-purple-700 border-purple-300"
          >
            Recipient
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Loading pending fees...</p>
          </div>
        ) : !hasPendingFees ? (
          <div className="text-center py-4 bg-white/60 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600">No fees to withdraw</p>
            <p className="text-xs text-gray-500 mt-1">
              Fees will appear here after matches are finalized
            </p>
          </div>
        ) : (
          <>
            {/* Pending Fees Display */}
            <div className="space-y-3">
              {pendingFees.map((fee, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      {fee.tokenSymbol}
                    </span>
                    <span className="text-lg font-bold text-purple-600">
                      {formatEther(fee.amount)} {fee.tokenSymbol}
                    </span>
                  </div>
                  <Button
                    onClick={() => handleWithdrawFees(fee.token)}
                    disabled={
                      isWithdrawing || isWithdrawConfirming || fee.amount === 0n
                    }
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isWithdrawing
                      ? 'Confirming...'
                      : isWithdrawConfirming
                        ? 'Withdrawing...'
                        : `Withdraw ${fee.tokenSymbol}`}
                  </Button>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            {totalPendingEth > 0n && (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 border border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    Total Pending
                  </span>
                  <span className="text-lg font-bold text-purple-700">
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
                Fees withdrawn successfully!
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
        <div className="pt-3 border-t border-purple-200">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> Fees are accumulated from finalized matches.
            You need to manually withdraw your fees using the button above.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
