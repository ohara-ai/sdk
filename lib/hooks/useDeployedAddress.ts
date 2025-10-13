'use client'

import { useState, useEffect } from 'react'
import { usePublicClient, useChainId } from 'wagmi'

const STORAGE_KEY_PREFIX = 'deployed_game_match_'

/**
 * Hook to manage deployed contract addresses with localStorage persistence
 * Gracefully handles chain resets by validating the address still exists
 */
export function useDeployedGameMatchAddress() {
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const [address, setAddressState] = useState<`0x${string}` | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [envAddress, setEnvAddress] = useState<`0x${string}` | null>(null)

  // Get the storage key for the current chain
  const getStorageKey = () => `${STORAGE_KEY_PREFIX}${chainId}`

  // Load address from ENV or localStorage on mount
  useEffect(() => {
    const loadAddress = async () => {
      setIsValidating(true)

      // First check ENV variable
      const envAddr = process.env.NEXT_PUBLIC_GAME_MATCH_INSTANCE
      if (envAddr && envAddr !== '...') {
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
  }, [chainId, publicClient])

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
