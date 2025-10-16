'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Shield, FileCode, Factory, Percent, Coins } from 'lucide-react'
import { useContractInfo } from '@/lib/hooks/useContractInfo'
import { useFeeConfig } from '@/lib/hooks/useFeeConfig'

interface ContractInformationProps {
  factoryAddress?: `0x${string}` | null
  contractAddress?: `0x${string}` | null
}

/**
 * Reusable contract information component that displays system addresses
 * and configuration for on-chain features
 */
export function ContractInformation({ factoryAddress, contractAddress }: ContractInformationProps) {
  const { ownerAddress, controllerAddress, devWorldTokenAddress } = useContractInfo()
  const { totalFeePercentage, scoreBoard, isLoading: isFeeLoading } = useFeeConfig(contractAddress || undefined)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
            <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
              <Factory className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">Factory Address</p>
              <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted ? 'Loading...' : factoryAddress || 'Not configured'}
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
            <div className="p-2 bg-orange-50 rounded-lg flex-shrink-0">
              <User className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">Instance Owner</p>
              <p className="text-xs text-gray-500 mb-1">Managed by Factory</p>
              <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted ? 'Loading...' : ownerAddress || 'Factory owner'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
              <Percent className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">Fee Configuration</p>
              <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted || isFeeLoading ? 'Loading...' : 
                 contractAddress ? 
                   totalFeePercentage > 0 ? `${totalFeePercentage}% total fee` : 'No fees configured' 
                 : 'Contract not deployed'}
              </p>
              {mounted && scoreBoard && scoreBoard !== '0x0000000000000000000000000000000000000000' && (
                <p className="text-xs text-gray-600 mt-2 font-mono bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                  Scoreboard: {scoreBoard.slice(0, 10)}...{scoreBoard.slice(-8)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg flex-shrink-0">
              <Coins className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1.5">DEVWORLD Token</p>
              <p className="text-xs text-gray-600 font-mono break-all bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                {!mounted ? 'Loading...' : devWorldTokenAddress || 'Not configured'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
