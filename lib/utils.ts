// Shared utility functions

// Debounce function for performance optimization
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), wait)
  }
}

// Throttle function for rate limiting
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Memoize function for caching expensive computations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyResolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()
  return ((...args: Parameters<T>) => {
    const key = keyResolver ? keyResolver(...args) : JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)!
    const result = func(...args)
    cache.set(key, result)
    return result
  }) as T
}

export const formatPrice = (price: number): string => {
  if (price >= 1) return `$${price.toFixed(2)}`
  if (price >= 0.01) return `$${price.toFixed(4)}`
  if (price >= 0.0001) return `$${price.toFixed(6)}`
  return `$${price.toExponential(2)}`
}

export const formatMarketCap = (supply: string): string => {
  const num = parseFloat(supply)
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(0)
}

export const getTimeAgo = (timestamp: number): string => {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (seconds < 60) return `${seconds}s`
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

export const getIntervalMs = (timeframe: string): number => {
  const intervals: Record<string, number> = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1H": 60 * 60 * 1000,
    "4H": 4 * 60 * 60 * 1000,
    "1D": 24 * 60 * 60 * 1000,
    "1W": 7 * 24 * 60 * 60 * 1000,
  }
  return intervals[timeframe] || 24 * 60 * 60 * 1000
}

export const getTimeRange = (timeframe: string): number => {
  const ranges: Record<string, number> = {
    "1m": 60 * 60 * 1000,
    "5m": 5 * 60 * 60 * 1000,
    "15m": 15 * 60 * 60 * 1000,
    "1H": 7 * 24 * 60 * 60 * 1000,
    "4H": 30 * 24 * 60 * 60 * 1000,
    "1D": 90 * 24 * 60 * 60 * 1000,
    "1W": 365 * 24 * 60 * 60 * 1000,
  }
  return ranges[timeframe] || 30 * 24 * 60 * 60 * 1000
}

// Public client type for viem
interface PublicClient {
  getBlock: (params: { blockNumber: bigint }) => Promise<{ timestamp: bigint } | null>
}

// Event log type
interface EventLog {
  blockNumber: bigint
}

// Batch fetch blocks efficiently with timeout and error handling
export const batchFetchBlocks = async (
  publicClient: PublicClient | null | undefined,
  blockNumbers: bigint[]
): Promise<Map<bigint, { timestamp: bigint }>> => {
  if (!blockNumbers.length || !publicClient) {
    return new Map()
  }

  const timeout = 30000 // 30 seconds timeout
  const timeoutPromise = (ms: number) => new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), ms)
  )

  try {
    const blocks = await Promise.race([
      Promise.all(
        blockNumbers.map(blockNum =>
          publicClient.getBlock({ blockNumber: blockNum })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err)
              console.warn(`Failed to fetch block ${blockNum}:`, message)
              return null
            })
        )
      ),
      timeoutPromise(timeout)
    ])

    const blockMap = new Map<bigint, { timestamp: bigint }>()
    blockNumbers.forEach((blockNum, idx) => {
      const block = blocks?.[idx]
      if (block?.timestamp) {
        blockMap.set(blockNum, { timestamp: block.timestamp })
      }
    })
    return blockMap
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Error batch fetching blocks:", message)
    return new Map()
  }
}

// Extract block numbers from events
export const extractBlockNumbers = (events: EventLog[]): Set<bigint> => {
  return new Set(events.map(e => e.blockNumber))
}

// ============ IPFS Image Optimization ============

// IPFS gateways (Pinata first since we upload there, then reliable public gateways)
const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://w3s.link/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://dweb.link/ipfs/",
] as const

/**
 * Get optimized IPFS URL using faster CDN gateways
 * @param hashOrUrl - IPFS hash or full IPFS URL
 * @param gatewayIndex - Which gateway to use (0 = fastest)
 * @returns Optimized IPFS URL
 */
export const getOptimizedIpfsUrl = (hashOrUrl: string | undefined | null, gatewayIndex = 0): string => {
  if (!hashOrUrl) return ""

  // Pass direct HTTPS URLs through as-is (e.g. DiceBear, external CDNs)
  if (hashOrUrl.startsWith("https://") && !hashOrUrl.includes("/ipfs/")) {
    return gatewayIndex === 0 ? hashOrUrl : ""
  }

  // Extract hash from various URL formats
  let hash = hashOrUrl

  // Handle full IPFS URLs
  if (hashOrUrl.includes("ipfs.io/ipfs/")) {
    hash = hashOrUrl.split("ipfs.io/ipfs/")[1]
  } else if (hashOrUrl.includes("gateway.pinata.cloud/ipfs/")) {
    hash = hashOrUrl.split("gateway.pinata.cloud/ipfs/")[1]
  } else if (hashOrUrl.includes("/ipfs/")) {
    hash = hashOrUrl.split("/ipfs/")[1]
  } else if (hashOrUrl.startsWith("ipfs://")) {
    hash = hashOrUrl.replace("ipfs://", "")
  }

  // Clean up hash (remove query params, trailing slashes)
  hash = hash?.split("?")[0]?.replace(/\/+$/, "") || ""

  if (!hash) return ""

  // Use the specified gateway
  const gateway = IPFS_GATEWAYS[Math.min(gatewayIndex, IPFS_GATEWAYS.length - 1)]
  return `${gateway}${hash}`
}

/**
 * Get IPFS URL with fallback chain
 * Returns array of URLs to try in order
 */
export const getIpfsUrlsWithFallbacks = (hashOrUrl: string | undefined | null): string[] => {
  if (!hashOrUrl) return []
  return IPFS_GATEWAYS.map((_, index) => getOptimizedIpfsUrl(hashOrUrl, index)).filter(Boolean)
}
