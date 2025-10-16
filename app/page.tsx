'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight, Trophy, Gamepad2, Boxes } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Ohara AI Game SDK
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Production-ready UI components for building on-chain gaming applications. 
            Explore our interactive demos below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link href="/demos/tic-tac-toe">
            <Card className="hover:border-blue-500 transition-all hover:shadow-xl cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Gamepad2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <CardTitle className="text-xl">Tic-Tac-Toe</CardTitle>
                <CardDescription className="text-base">
                  Play wagered tic-tac-toe matches with stake management and leaderboard tracking.
                  Showcases WageringBox and LeaderBoard components.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/demos/leaderboard">
            <Card className="hover:border-purple-500 transition-all hover:shadow-xl cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Trophy className="w-6 h-6 text-purple-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <CardTitle className="text-xl">Leaderboard Demo</CardTitle>
                <CardDescription className="text-base">
                  View top players, scores, and statistics. Demonstrates the LeaderBoard component with various configurations.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/contract-testing">
            <Card className="hover:border-green-500 transition-all hover:shadow-xl cursor-pointer h-full border-dashed">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Boxes className="w-6 h-6 text-green-600" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <CardTitle className="text-xl">Contract Testing</CardTitle>
                <CardDescription className="text-base">
                  Internal testing environment for contract deployment and direct interaction.
                  (For development purposes)
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Getting Started with the SDK</h2>
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-4">
              Our SDK provides two main components that you can easily integrate into your gaming applications:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li>
                <strong className="text-gray-900">LeaderBoard:</strong> Display high scores and player rankings 
                from ScoreBoard contracts with customizable sorting and styling.
              </li>
              <li>
                <strong className="text-gray-900">WageringBox:</strong> Enable players to create and join wagered 
                matches with built-in escrow management and transaction handling.
              </li>
            </ul>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <code className="text-sm">npm install @ohara-ai/game-sdk</code>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
