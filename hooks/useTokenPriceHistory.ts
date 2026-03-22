"use client"

import { useEffect, useState, useCallback } from "react"
import { server } from "@/lib/stellar"
import { CONTRACT_IDS } from "@/lib/stellar"
import { formatAmount, decodeSorobanEvent } from "@/lib/soroban"
import { getIntervalMs, getTimeRange } from "@/lib/utils"

export interface CandleData {
  open: number
  close: number
  high: number
  low: number
  volume: number
  time: number
  trades?: number  // Number of trades in this candle (optional for historical data)
}

const priceHistoryCache = new Map<string, { data: CandleData[], timestamp: number }>()
const CACHE_DURATION = 30000
const MAX_EVENTS = 500
const MAX_CACHE_SIZE = 50 // Maximum cache entries to prevent memory leaks

// Clean up old cache entries when cache gets too large
function cleanupCache() {
  if (priceHistoryCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(priceHistoryCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25)
    for (let i = 0; i < toRemove; i++) {
      priceHistoryCache.delete(entries[i][0])
    }
  }
}

// Convert price from contract format to display format
// Stellar uses 7 decimal precision for amounts
const convertPrice = (price: bigint): number => {
  const priceFormatted = Number(formatAmount(price))
  return priceFormatted
}

const createCandles = (events: Array<{ price: bigint; timestamp: number; volume: number }>, intervalMs: number): CandleData[] => {
  // Filter out events with zero prices
  const validEvents = events.filter(e => e.price > BigInt(0))
  if (validEvents.length === 0) return []

  const grouped = validEvents.reduce((acc, event) => {
    const intervalStart = Math.floor(event.timestamp / intervalMs) * intervalMs
    if (!acc[intervalStart]) acc[intervalStart] = []
    acc[intervalStart].push(event)
    return acc
  }, {} as Record<number, typeof validEvents>)

  return Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b)
    .map(interval => {
      const intervalEvents = grouped[interval]
      const prices = intervalEvents.map(e => convertPrice(e.price))
      return {
        open: prices[0],
        close: prices[prices.length - 1],
        high: Math.max(...prices),
        low: Math.min(...prices),
        volume: intervalEvents.reduce((sum, e) => sum + e.volume, 0),
        time: interval,
      }
    })
}

// Clear cache for a specific token
export const invalidatePriceCache = (tokenAddress: string) => {
  const keysToDelete: string[] = []
  priceHistoryCache.forEach((_, key) => {
    if (key.startsWith(tokenAddress)) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => priceHistoryCache.delete(key))
}

export const useTokenPriceHistory = (tokenAddress: string | null, timeframe: string = "1D") => {
  const [candleData, setCandleData] = useState<CandleData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPriceHistory = useCallback(async () => {
    if (!tokenAddress) {
      setIsLoading(false)
      return
    }

    const cacheKey = `${tokenAddress}-${timeframe}`
    const cached = priceHistoryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setCandleData(cached.data)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      const contractId = CONTRACT_IDS.bondingCurve
      if (!contractId) {
        setCandleData([])
        setIsLoading(false)
        return
      }

      // Get a recent starting ledger
      let startLedger = 0
      try {
        const latest = await server.getLatestLedger()
        startLedger = Math.max(0, latest.sequence - 5000)
      } catch {
        setCandleData([])
        setIsLoading(false)
        return
      }

      const events = await server.getEvents({
        startLedger,
        filters: [
          {
            type: 'contract',
            contractIds: [contractId],
          },
        ],
        limit: 100,
      })

      const allEvents: Array<{ price: bigint; timestamp: number; volume: number }> = []

      if (events.events) {
        for (const event of events.events) {
          try {
            const { topics, value } = decodeSorobanEvent(event)
            if (!topics.length || !value) continue

            const symbol = String(topics[0])
            if (symbol !== 'bought' && symbol !== 'sold') continue

            // topics[1] is the token address
            const eventToken = String(topics[1] || '')
            if (eventToken.toLowerCase() !== tokenAddress.toLowerCase()) continue

            // value: bought=(xlm_amount, tokens, new_price, fee), sold=(token_amount, xlm_out, new_price, fee)
            const vals = Array.isArray(value) ? value : [value]
            const newPrice = BigInt(vals[2] || 0)
            if (newPrice <= BigInt(0)) continue

            const isBuy = symbol === 'bought'
            const xlmAmount = isBuy ? BigInt(vals[0] || 0) : BigInt(vals[1] || 0)
            const volume = Number(formatAmount(xlmAmount))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const timestamp = (event as any).ledgerClosedAt
              ? new Date((event as any).ledgerClosedAt).getTime()
              : Date.now()

            allEvents.push({ price: newPrice, timestamp, volume })
          } catch {
            // Skip malformed events
          }
        }
      }

      allEvents.sort((a, b) => a.timestamp - b.timestamp)

      const validEvents = allEvents.filter(e => e.price > BigInt(0))
      const limitedEvents = validEvents.length > MAX_EVENTS ? validEvents.slice(-MAX_EVENTS) : validEvents

      if (limitedEvents.length === 0) {
        setCandleData([])
        setIsLoading(false)
        return
      }

      const intervalMs = getIntervalMs(timeframe)
      const candles = createCandles(limitedEvents, intervalMs)

      setCandleData(candles)

      cleanupCache()
      priceHistoryCache.set(cacheKey, { data: candles, timestamp: Date.now() })
    } catch (error: any) {
      console.warn("Failed to fetch price history:", error?.message || error)
      const cached = priceHistoryCache.get(cacheKey)
      setCandleData(cached?.data || [])
    } finally {
      setIsLoading(false)
    }
  }, [tokenAddress, timeframe])

  useEffect(() => {
    fetchPriceHistory()
  }, [fetchPriceHistory])

  // Listen for trade confirmation events and refetch
  useEffect(() => {
    if (!tokenAddress || typeof window === "undefined") return

    const handleTradeConfirmed = (event: CustomEvent<{ tokenAddress: string; action: string }>) => {
      if (event.detail.tokenAddress?.toLowerCase() === tokenAddress.toLowerCase()) {
        // Invalidate cache and refetch
        invalidatePriceCache(tokenAddress)
        // Small delay to allow blockchain to process
        setTimeout(() => {
          fetchPriceHistory()
        }, 1000)
      }
    }

    window.addEventListener("tradeConfirmed", handleTradeConfirmed as EventListener)
    return () => {
      window.removeEventListener("tradeConfirmed", handleTradeConfirmed as EventListener)
    }
  }, [tokenAddress, fetchPriceHistory])

  return { candleData, isLoading, refetch: fetchPriceHistory }
}
