"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { callContract, toScVal, formatAmount, decodeSorobanEvent } from "@/lib/soroban"
import { server, CONTRACT_IDS } from "@/lib/stellar"
import { getIntervalMs } from "@/lib/utils"

export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  trades?: number
}

export interface SubgraphTrade {
  id: string
  isBuy: boolean
  ethAmount: string
  tokenAmount: string
  price: string
  timestamp: string
  txHash: string
  trader?: string
}

// Dummy address used for read-only contract calls
const DUMMY_CALLER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

const PRICE_PRECISION = 1e8

const convertPrice = (price: bigint): number => {
  return Number(formatAmount(price))
}

const createCandles = (
  events: Array<{ price: bigint; timestamp: number; volume: number }>,
  intervalMs: number
): CandleData[] => {
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
        trades: intervalEvents.length,
      }
    })
}

export function useSubgraphPriceHistory(
  tokenAddress: string | null,
  timeframe: string = "1D",
  pollingInterval: number = 10000
) {
  const [candleData, setCandleData] = useState<CandleData[]>([])
  const [recentTrades] = useState<SubgraphTrade[]>([])
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPriceData = useCallback(async (isInitial = false) => {
    if (!tokenAddress) {
      setCurrentPrice(0)
      setCandleData([])
      setIsLoading(false)
      return
    }

    if (isInitial) {
      setIsLoading(true)
    }

    try {
      const bondingCurveId = CONTRACT_IDS.bondingCurve
      if (!bondingCurveId) {
        setIsLoading(false)
        return
      }

      // Fetch current spot price
      try {
        const price = await callContract(
          bondingCurveId,
          "get_current_price",
          [toScVal(tokenAddress, 'address')],
          DUMMY_CALLER
        )
        if (price && Number(price) > 0) {
          setCurrentPrice(Number(price) / PRICE_PRECISION)
        }
      } catch {
        // Price fetch failed, continue to try events
      }

      // Fetch trade events from Soroban to build candles
      let startLedger = 0
      try {
        const latest = await server.getLatestLedger()
        startLedger = Math.max(0, latest.sequence - 5000)
      } catch {
        setIsLoading(false)
        setLastUpdate(Date.now())
        return
      }

      const events = await server.getEvents({
        startLedger,
        filters: [
          {
            type: 'contract',
            contractIds: [bondingCurveId],
          },
        ],
        limit: 100,
      })

      const tradeEvents: Array<{ price: bigint; timestamp: number; volume: number }> = []

      if (events.events) {
        for (const event of events.events) {
          try {
            const { topics, value } = decodeSorobanEvent(event)
            if (!topics.length || !value) continue

            const symbol = String(topics[0])
            if (symbol !== 'bought' && symbol !== 'sold') continue

            const eventToken = String(topics[1] || '')
            if (eventToken.toLowerCase() !== tokenAddress.toLowerCase()) continue

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

            tradeEvents.push({ price: newPrice, timestamp, volume })
          } catch {
            // Skip malformed events
          }
        }
      }

      if (tradeEvents.length > 0) {
        tradeEvents.sort((a, b) => a.timestamp - b.timestamp)
        const intervalMs = getIntervalMs(timeframe)
        const candles = createCandles(tradeEvents, intervalMs)
        setCandleData(candles)
      }

      setLastUpdate(Date.now())
    } catch (error) {
      console.error("[PriceHistory] Error fetching price:", error)
    } finally {
      setIsLoading(false)
    }
  }, [tokenAddress, timeframe])

  // Initial fetch
  useEffect(() => {
    fetchPriceData(true)
  }, [fetchPriceData])

  // Set up polling for live price updates
  useEffect(() => {
    if (!tokenAddress || pollingInterval <= 0) return

    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    pollingRef.current = setInterval(() => {
      fetchPriceData(false)
    }, pollingInterval)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [tokenAddress, pollingInterval, fetchPriceData])

  // Listen for trade confirmation events
  useEffect(() => {
    if (!tokenAddress || typeof window === "undefined") return

    const handleTradeConfirmed = (event: CustomEvent<{ tokenAddress: string }>) => {
      if (event.detail.tokenAddress?.toLowerCase() === tokenAddress.toLowerCase()) {
        setTimeout(() => {
          fetchPriceData(false)
        }, 2000)
      }
    }

    window.addEventListener("tradeConfirmed", handleTradeConfirmed as EventListener)
    return () => {
      window.removeEventListener("tradeConfirmed", handleTradeConfirmed as EventListener)
    }
  }, [tokenAddress, fetchPriceData])

  return {
    candleData,
    recentTrades,
    currentPrice,
    isLoading,
    lastUpdate,
    refetch: () => fetchPriceData(false),
  }
}

// Hook for fetching only recent trades - not available without an indexer
export function useSubgraphTrades(_tokenAddress?: string, _limit = 50, _pollingInterval = 5000) {
  const [trades] = useState<SubgraphTrade[]>([])
  const [isLoading] = useState(false)

  return { trades, isLoading, refetch: () => {} }
}
