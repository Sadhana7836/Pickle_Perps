"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { tradeEventService, TradeEvent, PriceUpdate } from "@/lib/tradeEventService";

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades?: number;  // Optional to support historical data
}

interface UseRealtimeChartOptions {
  tokenAddress: string;
  interval?: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  initialCandles?: CandleData[];
}

// Convert interval string to milliseconds
const intervalToMs = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

/**
 * Hook for real-time chart data with event-based updates
 * Combines historical data with live trades
 */
export function useRealtimeChart({
  tokenAddress,
  interval = "1h",
  initialCandles = [],
}: UseRealtimeChartOptions) {
  const [candles, setCandles] = useState<CandleData[]>(initialCandles);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastTrade, setLastTrade] = useState<TradeEvent | null>(null);

  const intervalMs = intervalToMs[interval];
  const candlesRef = useRef<CandleData[]>(candles);
  const initializedRef = useRef(false);

  // Sync with initialCandles when they load (only once when they first become available)
  useEffect(() => {
    if (initialCandles.length > 0 && !initializedRef.current) {
      console.log(`[Chart] Initializing with ${initialCandles.length} historical candles`);
      setCandles(initialCandles);
      initializedRef.current = true;
      setIsLoading(false);

      // Set current price from last candle
      const lastCandle = initialCandles[initialCandles.length - 1];
      if (lastCandle) {
        setCurrentPrice(lastCandle.close);
      }
    }
  }, [initialCandles]);

  // Reset when token changes
  useEffect(() => {
    initializedRef.current = false;
    setCandles([]);
    setCurrentPrice(0);
    setIsLoading(true);
  }, [tokenAddress]);

  // Keep ref in sync
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  // Initialize trade event service
  useEffect(() => {
    tradeEventService.initialize();
  }, []);

  // Get candle timestamp for a given time
  const getCandleTime = useCallback(
    (timestamp: number) => {
      return Math.floor(timestamp / intervalMs) * intervalMs;
    },
    [intervalMs]
  );

  // Update or create candle with new trade
  const updateCandleWithTrade = useCallback(
    (trade: TradeEvent) => {
      const price = parseFloat(trade.newPrice);
      const volume = parseFloat(trade.ethAmount);
      const candleTime = getCandleTime(trade.timestamp);

      setCandles((prevCandles) => {
        const newCandles = [...prevCandles];
        const lastCandleIndex = newCandles.length - 1;
        const lastCandle = newCandles[lastCandleIndex];

        if (lastCandle && lastCandle.time === candleTime) {
          // Update existing candle
          newCandles[lastCandleIndex] = {
            ...lastCandle,
            high: Math.max(lastCandle.high, price),
            low: Math.min(lastCandle.low, price),
            close: price,
            volume: lastCandle.volume + volume,
            trades: (lastCandle.trades || 0) + 1,
          };
        } else if (!lastCandle || candleTime > lastCandle.time) {
          // Create new candle
          const openPrice = lastCandle ? lastCandle.close : price;
          newCandles.push({
            time: candleTime,
            open: openPrice,
            high: Math.max(openPrice, price),
            low: Math.min(openPrice, price),
            close: price,
            volume: volume,
            trades: 1,
          });

          // Limit candles to prevent memory issues
          if (newCandles.length > 500) {
            newCandles.shift();
          }
        }

        return newCandles;
      });

      setCurrentPrice(price);
      setLastTrade(trade);
    },
    [getCandleTime]
  );

  // Subscribe to real-time trades
  useEffect(() => {
    if (!tokenAddress) return;

    console.log(`[Chart] Subscribing to trades for ${tokenAddress.slice(0, 10)}...`);

    const unsubscribe = tradeEventService.subscribeToToken(
      tokenAddress,
      (trade) => {
        console.log(`[Chart] New trade: ${trade.type} at ${trade.newPrice}`);
        updateCandleWithTrade(trade);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tokenAddress, updateCandleWithTrade]);

  // Subscribe to price updates
  useEffect(() => {
    if (!tokenAddress) return;

    const unsubscribe = tradeEventService.subscribeToPriceUpdates(
      tokenAddress,
      (update: PriceUpdate) => {
        setCurrentPrice(parseFloat(update.price));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tokenAddress]);

  // Fetch historical trades and build initial candles
  const fetchHistoricalData = useCallback(async () => {
    if (!tokenAddress) return;

    setIsLoading(true);

    try {
      // Fetch recent trades from Soroban events
      const fromLedger = 0;

      const trades = await tradeEventService.fetchRecentTradesFromChain(
        tokenAddress,
        fromLedger,
        "latest"
      );

      if (trades.length === 0) {
        setIsLoading(false);
        return;
      }

      // Build candles from trades
      const candleMap = new Map<number, CandleData>();

      // Process trades oldest to newest
      [...trades].reverse().forEach((trade) => {
        const price = parseFloat(trade.newPrice);
        const volume = parseFloat(trade.ethAmount);
        const candleTime = getCandleTime(trade.timestamp);

        const existing = candleMap.get(candleTime);

        if (existing) {
          candleMap.set(candleTime, {
            ...existing,
            high: Math.max(existing.high, price),
            low: Math.min(existing.low, price),
            close: price,
            volume: existing.volume + volume,
            trades: (existing.trades || 0) + 1,
          });
        } else {
          // Find previous candle for open price
          const candleTimes = Array.from(candleMap.keys()).sort((a, b) => b - a);
          const prevCandleTime = candleTimes.find((t) => t < candleTime);
          const prevCandle = prevCandleTime ? candleMap.get(prevCandleTime) : null;
          const openPrice = prevCandle ? prevCandle.close : price;

          candleMap.set(candleTime, {
            time: candleTime,
            open: openPrice,
            high: Math.max(openPrice, price),
            low: Math.min(openPrice, price),
            close: price,
            volume: volume,
            trades: 1,
          });
        }
      });

      // Convert to sorted array
      const sortedCandles = Array.from(candleMap.values()).sort(
        (a, b) => a.time - b.time
      );

      setCandles(sortedCandles);

      // Set current price from latest trade
      if (trades.length > 0) {
        setCurrentPrice(parseFloat(trades[0].newPrice));
      }
    } catch (error) {
      console.error("[Chart] Failed to fetch historical data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, getCandleTime]);

  // Initial data fetch
  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  // Listen for trade confirmation events and refetch
  useEffect(() => {
    if (!tokenAddress || typeof window === "undefined") return;

    const handleTradeConfirmed = (event: CustomEvent<{ tokenAddress: string }>) => {
      if (event.detail.tokenAddress?.toLowerCase() === tokenAddress.toLowerCase()) {
        console.log("[Chart] Trade confirmed, refetching data...");
        // Small delay to allow blockchain to process
        setTimeout(() => {
          fetchHistoricalData();
        }, 500);
      }
    };

    window.addEventListener("tradeConfirmed", handleTradeConfirmed as EventListener);
    return () => {
      window.removeEventListener("tradeConfirmed", handleTradeConfirmed as EventListener);
    };
  }, [tokenAddress, fetchHistoricalData]);

  // Add optimistic candle (for user's own trades)
  const addOptimisticTrade = useCallback(
    (type: "BUY" | "SELL", ethAmount: string, estimatedPrice: number) => {
      const optimisticTrade: TradeEvent = {
        type,
        token: tokenAddress,
        trader: "",
        ethAmount,
        tokenAmount: "0",
        newPrice: estimatedPrice.toString(),
        timestamp: Date.now(),
        txHash: "",
        blockNumber: BigInt(0),
      };

      updateCandleWithTrade(optimisticTrade);
    },
    [tokenAddress, updateCandleWithTrade]
  );

  return {
    candles,
    currentPrice,
    isLoading,
    lastTrade,
    refetch: fetchHistoricalData,
    addOptimisticTrade,
  };
}

/**
 * Hook for getting real-time price of a token
 */
export function useRealtimePrice(tokenAddress: string | undefined) {
  const [price, setPrice] = useState<string>("0");
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    tradeEventService.initialize();
  }, []);

  useEffect(() => {
    if (!tokenAddress) return;

    // Get cached price first
    const cached = tradeEventService.getLatestPrice(tokenAddress);
    if (cached) {
      setPrice(cached.price);
      setLastUpdate(cached.timestamp);
    }

    // Subscribe to updates
    const unsubscribe = tradeEventService.subscribeToPriceUpdates(
      tokenAddress,
      (update) => {
        setPrice(update.price);
        setLastUpdate(update.timestamp);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tokenAddress]);

  return { price, lastUpdate };
}

/**
 * Hook for real-time trade feed
 */
export function useRealtimeTrades(tokenAddress?: string, limit = 50) {
  const [trades, setTrades] = useState<TradeEvent[]>([]);

  useEffect(() => {
    tradeEventService.initialize();
  }, []);

  useEffect(() => {
    // Get initial trades from memory
    const initialTrades = tradeEventService.getRecentTrades(tokenAddress, limit);
    setTrades(initialTrades);

    // Subscribe to new trades
    const unsubscribe = tokenAddress
      ? tradeEventService.subscribeToToken(tokenAddress, (trade) => {
          setTrades((prev) => [trade, ...prev].slice(0, limit));
        })
      : tradeEventService.subscribeToAllTrades((trade) => {
          setTrades((prev) => [trade, ...prev].slice(0, limit));
        });

    return () => {
      unsubscribe();
    };
  }, [tokenAddress, limit]);

  return trades;
}
