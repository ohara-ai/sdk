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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contract Information</CardTitle>
        <CardDescription>
          System addresses and configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileCode className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Contract Address</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {!mounted ? 'Loading...' : contractAddress || 'Not deployed'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Factory className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Factory Address</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {!mounted ? 'Loading...' : factoryAddress || 'Not configured'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">App Controller Address (App secret key)</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {!mounted ? 'Loading...' : controllerAddress || 'Not configured'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">System Owner Address (Ohara secret key)</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {!mounted ? 'Loading...' : ownerAddress || 'Not configured'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Percent className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Fee Configuration</p>
              <p className="text-xs text-muted-foreground">
                {!mounted || isFeeLoading ? 'Loading...' : 
                 contractAddress ? 
                   totalFeePercentage > 0 ? `${totalFeePercentage}% total fee` : 'No fees configured' 
                 : 'Contract not deployed'}
              </p>
              {mounted && scoreBoard && scoreBoard !== '0x0000000000000000000000000000000000000000' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Scoreboard: {scoreBoard.slice(0, 10)}...{scoreBoard.slice(-8)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">DEVWORLD Token</p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {!mounted ? 'Loading...' : devWorldTokenAddress || 'Not configured'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
