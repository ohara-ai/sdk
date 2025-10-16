'use client'

import { useState } from 'react'
import { LeaderBoard } from '@/sdk/src/components/LeaderBoard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function LeaderboardDemoPage() {
  const [sortBy, setSortBy] = useState<'wins' | 'prize'>('wins')
  const [limit, setLimit] = useState(10)

  // Mock scoreboard address - in production, this would come from contract or env
  const scoreBoardAddress = (process.env.NEXT_PUBLIC_SCOREBOARD_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`

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
          <h1 className="text-4xl font-bold mb-2">Leaderboard Demo</h1>
          <p className="text-gray-600">
            Explore the LeaderBoard component with different configurations and sorting options.
          </p>
        </div>

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

        {scoreBoardAddress !== '0x0000000000000000000000000000000000000000' ? (
          <LeaderBoard
            scoreBoardAddress={scoreBoardAddress}
            limit={limit}
            sortBy={sortBy}
            showStats={true}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <p className="mb-4">ScoreBoard contract not configured.</p>
                <p className="text-sm">
                  Set NEXT_PUBLIC_SCOREBOARD_ADDRESS in your environment to enable the leaderboard.
                </p>
                <p className="text-sm mt-4">
                  Visit the{' '}
                  <Link href="/contract-testing" className="text-blue-600 hover:underline">
                    contract testing page
                  </Link>{' '}
                  to deploy and configure contracts.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Component Props</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
                  {`<LeaderBoard
  scoreBoardAddress="${scoreBoardAddress}"
  limit={${limit}}
  sortBy="${sortBy}"
  showStats={true}
  className="custom-class"
/>`}
                </pre>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p>
                  <strong>scoreBoardAddress:</strong> The address of the ScoreBoard contract
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
