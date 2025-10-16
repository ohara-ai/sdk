import { formatEther } from 'viem'

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatTokenAmount(amount: bigint, decimals = 18): string {
  if (decimals === 18) {
    return formatEther(amount)
  }
  const divisor = BigInt(10 ** decimals)
  const result = Number(amount) / Number(divisor)
  return result.toFixed(4)
}
