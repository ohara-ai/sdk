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

  // Load address from ENV or backend API on mount
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

      // Then check backend API
      try {
        const response = await fetch(`/api/contracts?chainId=${chainId}`)
        if (response.ok) {
          const data = await response.json()
          const contractType = storageKeyPrefix === STORAGE_KEY_PREFIX_GAME_MATCH ? 'gameMatch' : 'scoreboard'
          const stored = data.addresses?.[contractType]
          
          if (stored && publicClient) {
            // Validate the address still exists on chain
            try {
              const code = await publicClient.getBytecode({ address: stored as `0x${string}` })
              if (code && code !== '0x') {
                setAddressState(stored as `0x${string}`)
              } else {
                // Address no longer valid (chain was reset), clear it
                setAddressState(null)
              }
            } catch (error) {
              // If we can't verify, assume it's invalid
              setAddressState(null)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load address from backend:', error)
      }

      setIsValidating(false)
    }

    loadAddress()
  }, [chainId, publicClient, envVarName, storageKeyPrefix])

  // Save address to backend API (but not if it came from ENV)
  const setAddress = (newAddress: `0x${string}` | null) => {
    if (envAddress) {
      // Don't override ENV address
      return
    }

    setAddressState(newAddress)
    
    // Save to backend API (fire and forget - don't block the UI)
    const contractType = storageKeyPrefix === STORAGE_KEY_PREFIX_GAME_MATCH ? 'gameMatch' : 'scoreboard'
    const addresses = { [contractType]: newAddress || undefined }
    
    fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chainId, addresses }),
    }).catch(error => {
      console.error('Failed to save address to backend:', error)
    })
    
    // Dispatch custom event to notify OharaAiProvider of address change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('contractDeployed', {
        detail: { address: newAddress, storageKey: getStorageKey() }
      }))
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
