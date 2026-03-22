"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { pythWS, PythPrice } from "@/lib/pythWebSocket"

export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  trades?: number
}

interface PricePoint {
  price: number
  timestamp: number
}

// Pyth Benchmarks API base URL for historical data
const PYTH_BENCHMARKS_URL = "https://benchmarks.pyth.network/v1/shims/tradingview"

// Map asset symbols to Pyth Benchmarks symbol format
const getPythBenchmarkSymbol = (symbol: string): string => {
  // Commodities
  if (symbol === "XAU/USD") return "Metal.XAU/USD"
  if (symbol === "XAG/USD") return "Metal.XAG/USD"
  if (symbol === "WTI/USD") return "Commodity.WTI/USD"

  // Forex
  if (symbol === "EUR/USD") return "FX.EUR/USD"
  if (symbol === "GBP/USD") return "FX.GBP/USD"
  if (symbol === "JPY/USD") return "FX.USD/JPY"
  if (symbol === "AUD/USD") return "FX.AUD/USD"
  if (symbol === "CHF/USD") return "FX.USD/CHF"

  // Equities
  if (symbol === "NVDA/USD") return "Equity.US.NVDA/USD"
  if (symbol === "TSLA/USD") return "Equity.US.TSLA/USD"
  if (symbol === "AAPL/USD") return "Equity.US.AAPL/USD"
  if (symbol === "AMZN/USD") return "Equity.US.AMZN/USD"
  if (symbol === "GOOGL/USD") return "Equity.US.GOOGL/USD"
  if (symbol === "MSFT/USD") return "Equity.US.MSFT/USD"

  // Default - try as-is
  return symbol
}

// Get resolution string for Pyth Benchmarks API
const getPythResolution = (timeframe: string): string => {
  switch (timeframe) {
    case "1m": return "1"
    case "5m": return "5"
    case "15m": return "15"
    case "1H": return "60"
    case "4H": return "240"
    case "1D": return "1D"
    case "1W": return "1W"
    default: return "1"
  }
}

// Get interval in milliseconds based on timeframe
const getIntervalMs = (timeframe: string): number => {
  switch (timeframe) {
    case "1m":
      return 60 * 1000
    case "5m":
      return 5 * 60 * 1000
    case "15m":
      return 15 * 60 * 1000
    case "1H":
      return 60 * 60 * 1000
    case "4H":
      return 4 * 60 * 60 * 1000
    case "1D":
      return 24 * 60 * 60 * 1000
    case "1W":
      return 7 * 24 * 60 * 60 * 1000
    default:
      return 60 * 1000 // Default to 1m for RWA (fast updates)
  }
}

// Get time range in seconds for historical data
const getHistoricalRange = (timeframe: string): number => {
  switch (timeframe) {
    case "1m":
    case "5m":
      return 24 * 60 * 60 // 1 day
    case "15m":
      return 3 * 24 * 60 * 60 // 3 days
    case "1H":
      return 7 * 24 * 60 * 60 // 7 days
    case "4H":
      return 30 * 24 * 60 * 60 // 30 days
    case "1D":
      return 90 * 24 * 60 * 60 // 90 days
    case "1W":
      return 365 * 24 * 60 * 60 // 1 year
    default:
      return 24 * 60 * 60
  }
}

// Build candles from price points
const buildCandlesFromPrices = (
  priceHistory: PricePoint[],
  intervalMs: number,
  maxCandles: number = 100
): CandleData[] => {
  if (priceHistory.length === 0) return []

  const candleMap = new Map<number, CandleData>()

  priceHistory.forEach(point => {
    const candleTime = Math.floor(point.timestamp / intervalMs) * intervalMs
    const existing = candleMap.get(candleTime)

    if (existing) {
      candleMap.set(candleTime, {
        ...existing,
        high: Math.max(existing.high, point.price),
        low: Math.min(existing.low, point.price),
        close: point.price,
        trades: (existing.trades || 0) + 1,
      })
    } else {
      // Get previous candle's close for open price
      const candleTimes = Array.from(candleMap.keys()).sort((a, b) => b - a)
      const prevTime = candleTimes.find(t => t < candleTime)
      const prevCandle = prevTime ? candleMap.get(prevTime) : null
      const openPrice = prevCandle ? prevCandle.close : point.price

      candleMap.set(candleTime, {
        time: candleTime,
        open: openPrice,
        high: Math.max(openPrice, point.price),
        low: Math.min(openPrice, point.price),
        close: point.price,
        volume: 0, // Pyth doesn't provide volume
        trades: 1,
      })
    }
  })

  // Sort and limit candles
  const sortedCandles = Array.from(candleMap.values())
    .sort((a, b) => a.time - b.time)
    .slice(-maxCandles)

  return sortedCandles
}

// Fetch historical candles from Pyth Benchmarks API
async function fetchHistoricalCandles(
  symbol: string,
  timeframe: string
): Promise<CandleData[]> {
  const benchmarkSymbol = getPythBenchmarkSymbol(symbol)
  const resolution = getPythResolution(timeframe)
  const now = Math.floor(Date.now() / 1000)
  const from = now - getHistoricalRange(timeframe)

  const url = `${PYTH_BENCHMARKS_URL}/history?symbol=${encodeURIComponent(benchmarkSymbol)}&resolution=${resolution}&from=${from}&to=${now}`

  try {
    console.log(`[RWA Price] Fetching historical data: ${url}`)
    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`[RWA Price] Benchmarks API returned ${response.status}`)
      return []
    }

    const data = await response.json()

    // TradingView UDF format: { s: "ok", t: [...], o: [...], h: [...], l: [...], c: [...], v: [...] }
    if (data.s !== "ok" || !data.t || data.t.length === 0) {
      console.warn("[RWA Price] No historical data available:", data.s)
      return []
    }

    const candles: CandleData[] = data.t.map((timestamp: number, i: number) => ({
      time: timestamp * 1000, // Convert to milliseconds
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v?.[i] || 0,
    }))

    console.log(`[RWA Price] Loaded ${candles.length} historical candles`)
    return candles
  } catch (error) {
    console.error("[RWA Price] Failed to fetch historical data:", error)
    return []
  }
}

export function useRWAPriceHistory(
  priceFeedId: string | undefined,
  timeframe: string = "1m",
  symbol: string = "" // Asset symbol for historical API
) {
  const [candleData, setCandleData] = useState<CandleData[]>([])
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<number>(0)

  // Store historical candles in ref to merge with real-time updates
  const historicalCandlesRef = useRef<CandleData[]>([])
  const intervalMs = getIntervalMs(timeframe)

  // Process new price from WebSocket and update/create current candle
  const processPrice = useCallback((pythPrice: PythPrice) => {
    const price = pythPrice.normalizedPrice
    const timestamp = Date.now()
    const candleTime = Math.floor(timestamp / intervalMs) * intervalMs

    setCurrentPrice(price)
    setLastUpdate(timestamp)

    setCandleData(prevCandles => {
      // Make a copy
      const candles = [...prevCandles]

      // Find or create current candle
      const lastCandle = candles[candles.length - 1]

      if (lastCandle && lastCandle.time === candleTime) {
        // Update existing candle
        candles[candles.length - 1] = {
          ...lastCandle,
          high: Math.max(lastCandle.high, price),
          low: Math.min(lastCandle.low, price),
          close: price,
          trades: (lastCandle.trades || 0) + 1,
        }
      } else {
        // Create new candle
        const openPrice = lastCandle ? lastCandle.close : price
        candles.push({
          time: candleTime,
          open: openPrice,
          high: Math.max(openPrice, price),
          low: Math.min(openPrice, price),
          close: price,
          volume: 0,
          trades: 1,
        })

        // Limit total candles
        if (candles.length > 500) {
          candles.shift()
        }
      }

      return candles
    })

    setIsLoading(false)
  }, [intervalMs])

  // Fetch historical data when symbol or timeframe changes
  useEffect(() => {
    if (!symbol) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    historicalCandlesRef.current = []

    fetchHistoricalCandles(symbol, timeframe).then(candles => {
      historicalCandlesRef.current = candles
      setCandleData(candles)
      if (candles.length > 0) {
        setCurrentPrice(candles[candles.length - 1].close)
      }
      setIsLoading(false)
    })
  }, [symbol, timeframe])

  // Subscribe to Pyth WebSocket for real-time updates
  useEffect(() => {
    if (!priceFeedId) {
      return
    }

    // Connect and subscribe
    pythWS.connect().then(() => {
      console.log(`[RWA Price] Subscribing to WebSocket: ${priceFeedId}`)
    }).catch(err => {
      console.error("[RWA Price] Failed to connect:", err)
    })

    const unsubscribe = pythWS.subscribe(priceFeedId, processPrice)

    return () => {
      unsubscribe()
    }
  }, [priceFeedId, processPrice])

  return {
    candleData,
    currentPrice,
    isLoading,
    lastUpdate,
    candleCount: candleData.length,
  }
}
