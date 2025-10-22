'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Shield, FileCode, Factory, Percent, Coins, BarChart3, Database } from 'lucide-react'
import { ContractType } from '@/sdk/src/types/contracts'

/**
 * Reusable contract information component that displays system addresses
 * and configuration for on-chain features
 */
export function ContractInformation({ type }: { type: ContractType }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatLimitDisplay = (current?: bigint | number, max?: bigint | number) => {
    if (current === undefined || max === undefined) return 'Loading...'
    const currentNum = typeof current === 'bigint' ? Number(current) : current
    const maxNum = typeof max === 'bigint' ? Number(max) : max
    return `${currentNum.toLocaleString()} / ${maxNum.toLocaleString()}`
  }

  return (
    <Card className="border-2 border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900">Contract Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
              <FileCode className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">Contract Address</p>
              <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted ? 'Loading...' : contractAddress || 'Not deployed'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">App Controller Address</p>
              <p className="text-xs text-gray-500 mb-1">App secret key</p>
              <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted ? 'Loading...' : controllerAddress || 'Not configured'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
              <Percent className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">Configuration</p>
              <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted || isConfigLoading ? 'Loading...' : configLines || 'Not configured'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
              <Percent className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">Data stats</p>
              <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted || isStatsLoading ? 'Loading...' : statsLines || 'Not configured'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
