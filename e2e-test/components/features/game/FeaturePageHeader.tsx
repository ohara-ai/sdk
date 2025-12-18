'use client'

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import { formatEther } from 'viem'
import { usePublicClient } from 'wagmi'
import { useOharaAi } from '@ohara-ai/sdk'
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Factory,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OnchainKitWallet } from '@/components/OnchainKitWallet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogClose,
} from '@/components/ui/dialog'

interface ContractInfo {
  label: string
  address: string | undefined
  icon?: ReactNode
  iconBg?: string
}

interface ConfigItem {
  label: string
  value: string | number | undefined
  highlight?: boolean
}

interface FeaturePageHeaderProps {
  title: string
  description: string
  icon: ReactNode
  iconBg: string
  contractAddress: string | undefined
  configItems?: ConfigItem[]
  additionalContracts?: ContractInfo[]
  children?: ReactNode
}

export function FeaturePageHeader({
  title,
  description,
  icon,
  iconBg,
  contractAddress,
  configItems = [],
  additionalContracts = [],
  children,
}: FeaturePageHeaderProps) {
  const { app } = useOharaAi()
  const publicClient = usePublicClient()

  const [mounted, setMounted] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [controllerBalance, setControllerBalance] = useState<string | null>(null)
  const [contractExists, setContractExists] = useState<boolean | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  useEffect(() => {
    const loadBalance = async () => {
      if (!publicClient || !app.controller.address) return
      try {
        const balance = await publicClient.getBalance({
          address: app.controller.address as `0x${string}`,
        })
        setControllerBalance(formatEther(balance))
      } catch {
        setControllerBalance(null)
      }
    }
    loadBalance()
  }, [publicClient, app.controller.address])

  useEffect(() => {
    const validateContract = async () => {
      if (!publicClient || !contractAddress) {
        setContractExists(null)
        return
      }
      try {
        const code = await publicClient.getCode({ address: contractAddress as `0x${string}` })
        setContractExists(code !== undefined && code !== '0x')
      } catch {
        setContractExists(false)
      }
    }
    validateContract()
  }, [publicClient, contractAddress])

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Main Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Feature Icon */}
            <div className={`p-3 rounded-xl ${iconBg} shrink-0`}>
              {icon}
            </div>

            {/* Title & Description */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500 mt-1">{description}</p>

              {/* Contract & Controller Address Row */}
              <div className="mt-3 flex items-center gap-4 flex-wrap">
                {/* Contract Address */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Contract</span>
                  {!mounted ? (
                    <span className="text-xs text-gray-400">Loading...</span>
                  ) : contractAddress ? (
                    <>
                      <code
                        className={`text-xs font-mono px-2 py-1 rounded ${
                          contractExists === true
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : contractExists === false
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {truncateAddress(contractAddress)}
                      </code>
                      {contractExists === false && (
                        <span className="text-xs text-amber-600">Not found on-chain</span>
                      )}
                      {/* Subtle Details Button */}
                      {(configItems.length > 0 || additionalContracts.length > 0 || children) && (
                        <button
                          onClick={() => setShowDetails(true)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="View contract details"
                        >
                          <Info className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">Not deployed</span>
                  )}
                </div>

                {/* Controller Address - Inline */}
                {app.controller.address && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">Controller</span>
                    <code className="text-xs font-mono text-gray-600">
                      {truncateAddress(app.controller.address)}
                    </code>
                    {controllerBalance && (
                      <span className="text-xs text-emerald-600 font-medium">
                        {parseFloat(controllerBalance).toFixed(4)} ETH
                      </span>
                    )}
                    <button
                      onClick={() => copyToClipboard(app.controller.address!)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Copy controller address"
                    >
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Wallet */}
          <div className="flex items-start">
            <OnchainKitWallet />
          </div>
        </div>
      </div>

      {/* Contract Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-xl">
          <DialogClose onClose={() => setShowDetails(false)} />
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${iconBg}`}>
                {icon}
              </div>
              <div>
                <DialogTitle>{title} Details</DialogTitle>
                <DialogDescription>Contract configuration and linked addresses</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-6">
              {/* Configuration Section */}
              {configItems.length > 0 && (
                <div>
                  <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                    {configItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <span
                          className={`text-sm font-semibold ${
                            item.highlight ? 'text-blue-600' : 'text-gray-900'
                          }`}
                        >
                          {item.value ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Contracts Section */}
              {additionalContracts.length > 0 && (
                <div>
                  <div className="space-y-2">
                    {additionalContracts.map((contract, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3"
                      >
                        {contract.icon && (
                          <div className={`p-2 rounded-lg ${contract.iconBg || 'bg-gray-100'}`}>
                            {contract.icon}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{contract.label}</p>
                          <p className="text-xs font-mono text-gray-500 truncate">
                            {contract.address || 'Not configured'}
                          </p>
                        </div>
                        {contract.address && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => copyToClipboard(contract.address!)}
                              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <a
                              href={`https://basescan.org/address/${contract.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Children Content */}
              {children && <div>{children}</div>}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}
