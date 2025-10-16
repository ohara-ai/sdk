'use client'

import { useState, useEffect } from 'react'
import { usePublicClient, useChainId } from 'wagmi'

const STORAGE_KEY_PREFIX_GAME_MATCH = 'deployed_game_match_'
const STORAGE_KEY_PREFIX_SCOREBOARD = 'deployed_scoreboard_'

/**
 * Generic hook to manage deployed contract addresses with localStorage persistence
 * Gracefully handles chain resets by validating the address still exists
 */
function useDeployedAddress(storageKeyPrefix: string, envVarName: string) {
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const [address, setAddressState] = useState<`0x${string}` | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [envAddress, setEnvAddress] = useState<`0x${string}` | null>(null)

  // Get the storage key for the current chain
  const getStorageKey = () => `${storageKeyPrefix}${chainId}`

  // Load address from ENV or localStorage on mount
  useEffect(() => {
    const loadAddress = async () => {
      setIsValidating(true)

      // First check ENV variable
      const envAddr = process.env[envVarName]
      if (envAddr && envAddr !== '...' && envAddr !== '0x0000000000000000000000000000000000000000') {
        setEnvAddress(envAddr as `0x${string}`)
        setAddressState(envAddr as `0x${string}`)
        setIsValidating(false)
        return
      }

      // Then check localStorage
      const stored = localStorage.getItem(getStorageKey())
      if (stored && publicClient) {
        // Validate the address still exists on chain
        try {
          const code = await publicClient.getBytecode({ address: stored as `0x${string}` })
          if (code && code !== '0x') {
            setAddressState(stored as `0x${string}`)
          } else {
            // Address no longer valid (chain was reset), clear it
            localStorage.removeItem(getStorageKey())
            setAddressState(null)
          }
        } catch (error) {
          // If we can't verify, assume it's invalid
          localStorage.removeItem(getStorageKey())
          setAddressState(null)
        }
      }

      setIsValidating(false)
    }

    loadAddress()
  }, [chainId, publicClient, envVarName])

  // Save address to localStorage (but not if it came from ENV)
  const setAddress = (newAddress: `0x${string}` | null) => {
    if (envAddress) {
      // Don't override ENV address
      return
    }

    setAddressState(newAddress)
    if (newAddress) {
      localStorage.setItem(getStorageKey(), newAddress)
    } else {
      localStorage.removeItem(getStorageKey())
    }
  }

  return {
    address,
    setAddress,
    isValidating,
    isFromEnv: !!envAddress,
  }
}

/**
 * Hook to manage deployed GameMatch contract addresses
 */
export function useDeployedGameMatchAddress() {
  return useDeployedAddress(STORAGE_KEY_PREFIX_GAME_MATCH, 'NEXT_PUBLIC_GAME_MATCH_INSTANCE')
}

/**
 * Hook to manage deployed ScoreBoard contract addresses
 */
export function useDeployedScoreBoardAddress() {
  return useDeployedAddress(STORAGE_KEY_PREFIX_SCOREBOARD, 'NEXT_PUBLIC_SCOREBOARD_INSTANCE')
}
