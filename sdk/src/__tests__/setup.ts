/**
 * Test Setup and Global Configuration
 *
 * This file sets up the testing environment for the SDK
 */

import { beforeAll, afterAll, vi } from 'vitest'

// Mock environment variables
beforeAll(() => {
  process.env.NEXT_PUBLIC_GAME_MATCH_FACTORY =
    '0x1234567890123456789012345678901234567890'
  process.env.NEXT_PUBLIC_GAME_SCORE_FACTORY =
    '0x0987654321098765432109876543210987654321'
  process.env.PRIVATE_KEY =
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  process.env.CONTROLLER_PRIVATE_KEY =
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
})

afterAll(() => {
  vi.clearAllMocks()
})
