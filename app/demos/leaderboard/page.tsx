'use client'

import { useState } from 'react'
import { LeaderBoard } from '@/sdk/src/components/LeaderBoard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { ContractDependencyInfo } from '@/components/ContractDependencyInfo'
import { ProviderStatus } from '@/components/ProviderStatus'

export default function LeaderboardDemoPage() {
  const [sortBy, setSortBy] = useState<'wins' | 'prize'>('wins')
  const [limit, setLimit] = useState(10)
  const [showDeveloperInfo, setShowDeveloperInfo] = useState(false)

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Leaderboard Demo</h1>
              <p className="text-gray-600">
                Explore the LeaderBoard component with different configurations and sorting options.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeveloperInfo(!showDeveloperInfo)}
              className="flex items-center gap-1.5"
            >
              Developer Info
              {showDeveloperInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {showDeveloperInfo && (
          <div className="space-y-4 mb-6 animate-in slide-in-from-top duration-200">
            <ContractDependencyInfo />
            <ProviderStatus />
          </div>
        )}

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant={sortBy === 'wins' ? 'default' : 'outline'}
                      onClick={() => setSortBy('wins')}
                    >
                      Total Wins
                    </Button>
                    <Button
                      variant={sortBy === 'prize' ? 'default' : 'outline'}
                      onClick={() => setSortBy('prize')}
                    >
                      Total Prize
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Limit
                  </label>
                  <div className="flex gap-2">
                    {[5, 10, 20].map((value) => (
                      <Button
                        key={value}
                        variant={limit === value ? 'default' : 'outline'}
                        onClick={() => setLimit(value)}
                      >
                        Top {value}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Address automatically resolved from OharaAiProvider */}
        <LeaderBoard
          limit={limit}
          sortBy={sortBy}
          showStats={true}
        />
 
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Component Props</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
                  {`<LeaderBoard
  limit={${limit}}
  sortBy="${sortBy}"
  showStats={true}
  className="custom-class"
/>`}
                </pre>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p>
                  <strong>scoreBoardAddress:</strong> (Optional) The address of the ScoreBoard contract. 
                  If not provided, automatically resolved from OharaAiProvider context.
                </p>
                <p>
                  <strong>limit:</strong> Maximum number of entries to display (default: 10)
                </p>
                <p>
                  <strong>sortBy:</strong> Sort by 'wins' or 'prize' (default: 'wins')
                </p>
                <p>
                  <strong>showStats:</strong> Display total players and matches (default: true)
                </p>
                <p>
                  <strong>className:</strong> Additional CSS classes for styling
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
