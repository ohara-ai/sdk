'use client'

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useMemo,
} from 'react'
import { PublicClient, WalletClient, Address } from 'viem'
import { createClientMatchOperations } from '../core/game/match'
import { createClientScoreOperations as createClientScoreOperations } from '../core/game/scores'
import { createClientPrizeOperations } from '../core/game/prize'
import { createClientPredictionOperations } from '../core/game/prediction'
import { createClientLeagueOperations } from '../core/game/league'
import {
  OharaAiContext,
  GameContext,
  AppContext,
  OharaContext,
  InternalContext,
} from './OharaAiContext'

const OharaAiContextInstance = createContext<OharaAiContext | undefined>(
  undefined,
)

interface OharaAiProviderProps {
  children: ReactNode
  /** Public client for reading blockchain data */
  publicClient?: PublicClient
  /** Wallet client for write operations (optional) */
  walletClient?: WalletClient
  /** Environment variables to use for address resolution (defaults to process.env) */
  env?: Record<string, string | undefined>
  /** Chain ID for localStorage keys (optional, will try to detect from window) */
  chainId?: number
}

/**
 * Provider that manages on-chain operations and contract coordination
 *
 * Exposes functional primitives (Match, Scores, App) for building on-chain applications
 * without dealing with blockchain complexity directly.
 *
 * @example
 * ```tsx
 * <OharaAiProvider publicClient={publicClient} walletClient={walletClient}>
 *   <YourApp />
 * </OharaAiProvider>
 * ```
 */
export function OharaAiProvider({
  children,
  publicClient,
  walletClient,
  env = process.env,
  chainId,
}: OharaAiProviderProps) {
  const [gameMatchAddress, setGameMatchAddress] = useState<
    Address | undefined
  >()
  const [gameScoreAddress, setGameScoreAddress] = useState<
    Address | undefined
  >()
  const [gamePrizeAddress, setGamePrizeAddress] = useState<
    Address | undefined
  >()
  const [controllerAddress, setControllerAddress] = useState<
    Address | undefined
  >()
  const [gameMatchFactory, setGameMatchFactory] = useState<
    Address | undefined
  >()
  const [gameScoreFactory, setGameScoreFactory] = useState<
    Address | undefined
  >()
  const [gamePrizeFactory, setGamePrizeFactory] = useState<
    Address | undefined
  >()
  const [predictionAddress, setPredictionAddress] = useState<
    Address | undefined
  >()
  const [predictionFactory, setPredictionFactory] = useState<
    Address | undefined
  >()
  const [leagueAddress, setLeagueAddress] = useState<
    Address | undefined
  >()
  const [leagueFactory, setLeagueFactory] = useState<
    Address | undefined
  >()

  // Use provided clients/chainId (they should be passed as props from parent component)
  const effectivePublicClient = publicClient
  const effectiveWalletClient = walletClient
  const effectiveChainId = chainId

  // Function to load addresses from backend
  const loadAddresses = async () => {
    console.log('[OharaAiProvider] loadAddresses called:', {
      isWindow: typeof window !== 'undefined',
    })
    
    if (typeof window === 'undefined') {
      console.log('[OharaAiProvider] Skipping loadAddresses - not in browser')
      return
    }

    try {
      // Server uses NEXT_PUBLIC_SDK_CHAIN_ID from its config - no need to pass chainId
      const response = await fetch('/api/sdk/addresses')

      if (!response.ok) {
        console.error(
          'Failed to fetch contract addresses:',
          response.statusText,
        )
        setGameMatchAddress(undefined)
        setGameScoreAddress(undefined)
        return
      }

      const data = await response.json()

      // Extract addresses from new hierarchical structure
      const matchAddr = data.addresses?.game?.match
      const scoreAddr = data.addresses?.game?.score
      const prizeAddr = data.addresses?.game?.prize
      const predictionAddr = data.addresses?.game?.prediction
      const leagueAddr = data.addresses?.game?.league
      const ctrlAddr = data.addresses?.app?.controller
      const matchFactory = data.factories?.gameMatch
      const scoreFactory = data.factories?.gameScore
      const prizeFactory = data.factories?.gamePrize
      const predFactory = data.factories?.prediction
      const lgFactory = data.factories?.league

      if (
        matchAddr &&
        matchAddr !== '0x0000000000000000000000000000000000000000'
      ) {
        setGameMatchAddress(matchAddr as Address)
      }

      if (
        scoreAddr &&
        scoreAddr !== '0x0000000000000000000000000000000000000000'
      ) {
        setGameScoreAddress(scoreAddr as Address)
      }

      if (
        prizeAddr &&
        prizeAddr !== '0x0000000000000000000000000000000000000000'
      ) {
        setGamePrizeAddress(prizeAddr as Address)
      }

      if (ctrlAddr) {
        setControllerAddress(ctrlAddr as Address)
      }

      if (matchFactory) {
        setGameMatchFactory(matchFactory as Address)
      }

      if (scoreFactory) {
        setGameScoreFactory(scoreFactory as Address)
      }

      if (prizeFactory) {
        setGamePrizeFactory(prizeFactory as Address)
      }

      if (
        predictionAddr &&
        predictionAddr !== '0x0000000000000000000000000000000000000000'
      ) {
        setPredictionAddress(predictionAddr as Address)
      }

      if (predFactory) {
        setPredictionFactory(predFactory as Address)
      }

      if (
        leagueAddr &&
        leagueAddr !== '0x0000000000000000000000000000000000000000'
      ) {
        setLeagueAddress(leagueAddr as Address)
      }

      if (lgFactory) {
        setLeagueFactory(lgFactory as Address)
      }
    } catch (error) {
      console.error('Error loading contract addresses from backend:', error)
      setGameMatchAddress(undefined)
      setGameScoreAddress(undefined)
      setGamePrizeAddress(undefined)
      setPredictionAddress(undefined)
      setLeagueAddress(undefined)
      setControllerAddress(undefined)
    }
  }

  // Read addresses from backend API (shared across all clients)
  // Server uses its configured chainId from NEXT_PUBLIC_SDK_CHAIN_ID
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return
    
    loadAddresses()

    // Listen for custom events (for immediate updates after deployment)
    const handleCustomEvent = () => loadAddresses()
    window.addEventListener('contractDeployed', handleCustomEvent)

    return () => {
      window.removeEventListener('contractDeployed', handleCustomEvent)
    }
  }, [])

  // Build context structure
  const ohara = useMemo<OharaContext>(
    () => ({
      contracts: {
        token: (typeof window !== 'undefined'
          ? process.env.NEXT_PUBLIC_HELLOWORLD_TOKEN
          : env.NEXT_PUBLIC_HELLOWORLD_TOKEN) as Address | undefined,
      },
    }),
    [env],
  )

  const game = useMemo<GameContext>(
    () => {
      return {
        match: {
          address: gameMatchAddress,
          operations:
            gameMatchAddress && effectivePublicClient
              ? createClientMatchOperations(
                  gameMatchAddress,
                  effectivePublicClient,
                  effectiveWalletClient,
                )
              : undefined,
        },
        scores: {
          address: gameScoreAddress,
          operations:
            gameScoreAddress && effectivePublicClient
              ? createClientScoreOperations(
                  gameScoreAddress,
                  effectivePublicClient,
                )
              : undefined,
        },
        prize: {
          address: gamePrizeAddress,
          operations:
            gamePrizeAddress && effectivePublicClient
              ? createClientPrizeOperations(
                  gamePrizeAddress,
                  effectivePublicClient,
                  effectiveWalletClient,
                )
              : undefined,
        },
        prediction: {
          address: predictionAddress,
          operations:
            predictionAddress && effectivePublicClient
              ? createClientPredictionOperations(
                  predictionAddress,
                  effectivePublicClient,
                  effectiveWalletClient,
                )
              : undefined,
        },
        league: {
          address: leagueAddress,
          operations:
            leagueAddress && effectivePublicClient
              ? createClientLeagueOperations(
                  leagueAddress,
                  effectivePublicClient,
                )
              : undefined,
        },
      }
    },
    [
      gameMatchAddress,
      gameScoreAddress,
      gamePrizeAddress,
      predictionAddress,
      leagueAddress,
      effectivePublicClient,
      effectiveWalletClient,
    ],
  )

  const app = useMemo<AppContext>(
    () => ({
      coin: {
        address: (typeof window !== 'undefined'
          ? process.env.NEXT_PUBLIC_APP_COIN
          : env.NEXT_PUBLIC_APP_COIN) as Address | undefined,
      },
      controller: {
        address: controllerAddress,
      },
      chainId: effectiveChainId,
    }),
    [env, controllerAddress, effectiveChainId],
  )

  const internal = useMemo<InternalContext>(
    () => ({
      factories: {
        gameMatch: gameMatchFactory,
        gameScore: gameScoreFactory,
        gamePrize: gamePrizeFactory,
        prediction: predictionFactory,
        league: leagueFactory,
      },
    }),
    [gameMatchFactory, gameScoreFactory, gamePrizeFactory, predictionFactory, leagueFactory],
  )

  const value: OharaAiContext = {
    ohara,
    game,
    app,
    internal,
    loadAddresses,
  }

  return (
    <OharaAiContextInstance.Provider value={value}>
      {children}
    </OharaAiContextInstance.Provider>
  )
}

/**
 * Hook to access Ohara AI SDK context
 * Provides access to hierarchical context structure
 *
 * @example
 * ```tsx
 * const { game, ohara, app, internal } = useOharaAi()
 *
 * // Create a match
 * if (game.match.operations) {
 *   const hash = await game.match.operations.create({
 *     token: ohara.contracts.token || '0x...',
 *     stakeAmount: parseEther('0.1'),
 *     maxPlayers: 2
 *   })
 * }
 *
 * // Get top scores
 * if (game.scores.operations) {
 *   const topPlayers = await game.scores.operations.getTopPlayersByWins(10)
 * }
 * ```
 */
export function useOharaAi(): OharaAiContext {
  const context = useContext(OharaAiContextInstance)
  if (!context) {
    throw new Error('useOharaAi must be used within OharaAiProvider')
  }
  return context
}
