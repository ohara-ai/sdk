'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ArrowRight, Trophy, Swords } from 'lucide-react'
import Link from 'next/link'
import { DeploymentPlanBox } from '@/components/features/DeploymentPlanBox'
import { OnchainKitWallet } from '@/components/OnchainKitWallet'
import { Button } from '@/components/ui/button'
import { AddressesInfo } from '@/components/AddressesInfo'

export default function Home() {
  const [showFactoryInfo, setShowFactoryDetails] = useState(false)

  return (
    <main className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                OharaAI SDK
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Deploy and test on-chain gaming contracts.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <OnchainKitWallet />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFactoryDetails(!showFactoryInfo)}
                className="flex items-center gap-1.5"
              >
                Addresses
                {showFactoryInfo ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Contract Addresses Info */}
          {showFactoryInfo && (
            <div className="mt-8">
              <AddressesInfo />
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <DeploymentPlanBox />

          {/* Feature Pages */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Feature Testing Pages</h2>
            <div className="space-y-3">
              <Link
                href="/testing/features/game/score"
                className="group flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Game Score</p>
                  <p className="text-sm text-gray-500">Player scores and leaderboards</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                href="/testing/features/game/match"
                className="group flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Swords className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Game Match</p>
                  <p className="text-sm text-gray-500">Match escrow and staking</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
