'use client'

import { useEffect, useState } from 'react'
import { formatEther } from 'viem'
import { usePublicClient } from 'wagmi'
import { useOharaAi } from '@/sdk/src/context/OharaAiProvider'
import { Copy, ExternalLink, Factory, Wallet } from 'lucide-react'
import { MATCH_FACTORY_ABI } from '@/sdk/src/abis/game/matchFactory'
import { SCORE_FACTORY_ABI } from '@/sdk/src/abis/game/scoreFactory'

interface FactoryConfig {
  defaultMaxActiveMatches?: bigint
  feeRecipients?: string[]
  feeShares?: bigint[]
  maxLosersPerMatch?: bigint
  maxTotalPlayers?: bigint
  maxTotalMatches?: bigint
}

interface AddressInfo {
  label: string
  address?: string
  balance?: string
  config?: FactoryConfig
}

export function AddressesInfo() {
  const { internal, app } = useOharaAi()
  const publicClient = usePublicClient()
  const [addresses, setAddresses] = useState<AddressInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAddressesWithBalances = async () => {
      if (!publicClient) return

      const addressesToLoad: AddressInfo[] = []

      // Add factory addresses
      if (internal.factories?.gameMatch) {
        addressesToLoad.push({
          label: 'GameMatch Factory',
          address: internal.factories.gameMatch,
        })
      }

      if (internal.factories?.gameScore) {
        addressesToLoad.push({
          label: 'GameScore Factory',
          address: internal.factories.gameScore,
        })
      }

      // Add controller address
      if (app.controller.address) {
        addressesToLoad.push({
          label: 'App Controller',
          address: app.controller.address,
        })
      }

      // Load balances and configurations for all addresses
      const addressesWithBalances = await Promise.all(
        addressesToLoad.map(async (info) => {
          if (!info.address) return info

          try {
            // Get balance
            const balance = await publicClient.getBalance({
              address: info.address as `0x${string}`,
            })
            
            const result: AddressInfo = {
              ...info,
              balance: formatEther(balance),
            }

            // Get factory configuration
            if (info.label === 'GameMatch Factory') {
              try {
                const [defaultMaxActiveMatches, fees] = await Promise.all([
                  publicClient.readContract({
                    address: info.address as `0x${string}`,
                    abi: MATCH_FACTORY_ABI,
                    functionName: 'defaultMaxActiveMatches',
                  }),
                  publicClient.readContract({
                    address: info.address as `0x${string}`,
                    abi: MATCH_FACTORY_ABI,
                    functionName: 'getDefaultFees',
                  }) as Promise<readonly [readonly `0x${string}`[], readonly bigint[]]>,
                ])
                
                result.config = {
                  defaultMaxActiveMatches: defaultMaxActiveMatches as bigint,
                  feeRecipients: fees[0] as string[],
                  feeShares: fees[1] as bigint[],
                }
              } catch (error) {
                console.error('Error loading GameMatch factory config:', error)
              }
            } else if (info.label === 'GameScore Factory') {
              try {
                const [maxLosersPerMatch, maxTotalPlayers, maxTotalMatches] = await Promise.all([
                  publicClient.readContract({
                    address: info.address as `0x${string}`,
                    abi: SCORE_FACTORY_ABI,
                    functionName: 'maxLosersPerMatch',
                  }),
                  publicClient.readContract({
                    address: info.address as `0x${string}`,
                    abi: SCORE_FACTORY_ABI,
                    functionName: 'maxTotalPlayers',
                  }),
                  publicClient.readContract({
                    address: info.address as `0x${string}`,
                    abi: SCORE_FACTORY_ABI,
                    functionName: 'maxTotalMatches',
                  }),
                ])
                
                result.config = {
                  maxLosersPerMatch: maxLosersPerMatch as bigint,
                  maxTotalPlayers: maxTotalPlayers as bigint,
                  maxTotalMatches: maxTotalMatches as bigint,
                }
              } catch (error) {
                console.error('Error loading GameScore factory config:', error)
              }
            }

            return result
          } catch (error) {
            console.error(`Error loading balance for ${info.label}:`, error)
            return { ...info, balance: '0' }
          }
        })
      )

      setAddresses(addressesWithBalances)
      setIsLoading(false)
    }

    loadAddressesWithBalances()
  }, [internal.factories, app.controller.address, publicClient])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Quick visual feedback
    const btn = document.activeElement as HTMLButtonElement
    if (btn) {
      const original = btn.innerHTML
      btn.innerHTML = '✓'
      setTimeout(() => { btn.innerHTML = original }, 1000)
    }
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (isLoading || addresses.length === 0) return null

  const getIcon = (label: string) => {
    if (label.includes('Factory')) return <Factory className="w-4 h-4" />
    if (label.includes('Controller')) return <Wallet className="w-4 h-4" />
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {addresses.map((info, index) => {
        const hasBalance = info.balance && parseFloat(info.balance) > 0
        const isFactory = info.label.includes('Factory')
        
        return (
          <div
            key={index}
            className="relative group bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200"
          >
            {/* Icon and Label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                {getIcon(info.label)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{info.label}</h3>
              </div>
            </div>

            {/* ETH Balance - Only for non-factories */}
            {!isFactory && (
              <div className="mb-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Balance</span>
                  <span className={`text-lg font-bold ${hasBalance ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {hasBalance ? parseFloat(info.balance!).toFixed(4) : '0.0000'} ETH
                  </span>
                </div>
              </div>
            )}

            {/* Configuration - Only for Factories */}
            {isFactory && info.config && (
              <div className="mb-3 bg-white/70 rounded-lg p-2.5 backdrop-blur-sm space-y-1.5">
                <h4 className="text-xs font-semibold text-gray-700 mb-1.5">Configuration</h4>
                {info.label === 'GameMatch Factory' && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Max Active Matches:</span>
                      <span className="font-mono font-semibold text-blue-700">
                        {info.config.defaultMaxActiveMatches?.toString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Fee Recipients:</span>
                      <span className="font-mono font-semibold text-blue-700">
                        {info.config.feeRecipients?.length || 0}
                      </span>
                    </div>
                    {info.config.feeShares && info.config.feeShares.length > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Total Fee:</span>
                        <span className="font-mono font-semibold text-blue-700">
                          {(info.config.feeShares.reduce((sum, share) => sum + Number(share), 0) / 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </>
                )}
                {info.label === 'GameScore Factory' && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Max Losers/Match:</span>
                      <span className="font-mono font-semibold text-blue-700">
                        {info.config.maxLosersPerMatch?.toString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Max Total Players:</span>
                      <span className="font-mono font-semibold text-blue-700">
                        {info.config.maxTotalPlayers?.toString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Max Total Matches:</span>
                      <span className="font-mono font-semibold text-blue-700">
                        {info.config.maxTotalMatches?.toString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Address */}
            <div className="flex items-center gap-2 bg-white/70 rounded-lg p-2 backdrop-blur-sm">
              <code className="text-xs font-mono text-gray-700 flex-1 truncate">
                {info.address ? truncateAddress(info.address) : '❌ Not deployed'}
              </code>
              {info.address && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => copyToClipboard(info.address!)}
                    className="p-1.5 hover:bg-blue-100 rounded-md transition-colors"
                    title="Copy address"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                  <a
                    href={`https://etherscan.io/address/${info.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-blue-100 rounded-md transition-colors"
                    title="View on Etherscan"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
