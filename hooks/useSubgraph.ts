"use client"

import { useState, useEffect, useCallback } from "react"
import { callContract, toScVal, formatAmount } from "@/lib/soroban"
import { CONTRACT_IDS } from "@/lib/stellar"

// Dummy address used for read-only contract calls
const DUMMY_CALLER = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

// Types matching Soroban contract data
export interface SubgraphToken {
  id: string
  name: string
  symbol: string
  creator: string
  totalSupply: string
  imageHash: string
  createdAt: string
  isListed: boolean
  currentPrice: string
  curveProgress: string
  holders: string
  totalTransactions: string
  volumeTotal: string
}

export interface SubgraphPosition {
  id: string
  positionId: string
  token: { id: string; name: string; symbol: string; currentPrice: string }
  user: string
  isLong: boolean
  size: string
  margin: string
  leverage: string
  entryPrice: string
  entryTime: string
  isOpen: boolean
  pnl?: string
  isProfit?: boolean
}

export interface SubgraphTrade {
  id: string
  token: { id: string; name: string; symbol: string }
  trader: string
  type: "BUY" | "SELL"
  ethAmount: string
  tokenAmount: string
  price: string
  timestamp: string
  txHash: string
}

export interface SubgraphUser {
  id: string
  totalTrades: string
  totalVolume: string
  totalPositions: string
  openPositions: string
  totalPnl: string
  winCount: string
  lossCount: string
  holdings: Array<{
    token: SubgraphToken
    balance: string
    averageBuyPrice: string
    realizedPnl: string
  }>
  positions: SubgraphPosition[]
  trades: SubgraphTrade[]
}

export interface SubgraphPriceCandle {
  timestamp: string
  open: string
  high: string
  low: string
  close: string
  volume: string
  trades: string
}

// ============ HOOKS ============

// Hook to fetch all tokens from Soroban token factory
export function useSubgraphTokens(first = 100, _skip = 0) {
  const [tokens, setTokens] = useState<SubgraphToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const factoryId = CONTRACT_IDS.tokenFactory
      if (!factoryId) {
        setTokens([])
        setIsLoading(false)
        return
      }

      const allTokenAddresses: string[] = await callContract(
        factoryId,
        "get_all_tokens",
        [],
        DUMMY_CALLER
      ) || []

      const result: SubgraphToken[] = []
      const limit = Math.min(allTokenAddresses.length, first)

      for (let i = 0; i < limit; i++) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const info: any = await callContract(
            factoryId,
            "get_token_info",
            [toScVal(allTokenAddresses[i], 'address')],
            DUMMY_CALLER
          )

          if (info) {
            result.push({
              id: allTokenAddresses[i],
              name: info.name || "Unknown",
              symbol: info.symbol || "UNK",
              creator: info.creator || "",
              totalSupply: info.total_supply?.toString() || "0",
              imageHash: info.image_hash || "",
              createdAt: info.created_at?.toString() || "0",
              isListed: true,
              currentPrice: "0",
              curveProgress: "0",
              holders: "0",
              totalTransactions: "0",
              volumeTotal: "0",
            })
          }
        } catch {
          // Skip tokens that fail to fetch
        }
      }

      setTokens(result)
    } catch (err) {
      console.error("Failed to fetch tokens from contract:", err)
      setError("Failed to fetch tokens")
    }

    setIsLoading(false)
  }, [first])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  return { tokens, isLoading, error, refetch: fetchTokens }
}

// Hook to fetch user portfolio from Soroban contracts
export function useSubgraphPortfolio(address: string | undefined) {
  const [user, setUser] = useState<SubgraphUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPortfolio = useCallback(async () => {
    if (!address) {
      setUser(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch user positions from perpetual trading contract
      const perpetualId = CONTRACT_IDS.perpetualTrading
      const positions: SubgraphPosition[] = []

      if (perpetualId) {
        try {
          const positionIds = await callContract(
            perpetualId,
            "get_user_positions",
            [toScVal(address, 'address')],
            address
          ) || []

          for (const posId of positionIds) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const pos: any = await callContract(
                perpetualId,
                "get_position",
                [toScVal(posId.toString(), 'u64')],
                address
              )
              if (pos?.is_open || pos?.isOpen) {
                positions.push({
                  id: posId.toString(),
                  positionId: posId.toString(),
                  token: { id: pos.token || "", name: "", symbol: "", currentPrice: "0" },
                  user: address,
                  isLong: pos.is_long ?? pos.isLong ?? false,
                  size: pos.size?.toString() || "0",
                  margin: pos.margin?.toString() || "0",
                  leverage: pos.leverage?.toString() || "1",
                  entryPrice: (pos.entry_price || pos.entryPrice)?.toString() || "0",
                  entryTime: (pos.entry_time || pos.openedAt)?.toString() || "0",
                  isOpen: true,
                })
              }
            } catch { /* skip */ }
          }
        } catch { /* no positions */ }
      }

      setUser({
        id: address,
        totalTrades: "0",
        totalVolume: "0",
        totalPositions: positions.length.toString(),
        openPositions: positions.length.toString(),
        totalPnl: "0",
        winCount: "0",
        lossCount: "0",
        holdings: [],
        positions,
        trades: [],
      })
    } catch {
      setUser(null)
    }

    setIsLoading(false)
  }, [address])

  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  return { user, isLoading, error, refetch: fetchPortfolio }
}

// Hook to fetch positions for a specific token
export function useSubgraphPositions(address: string | undefined, tokenAddress: string) {
  const [positions, setPositions] = useState<SubgraphPosition[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchPositions = useCallback(async () => {
    if (!address || !tokenAddress) {
      setPositions([])
      return
    }

    setIsLoading(true)

    try {
      const perpetualId = CONTRACT_IDS.perpetualTrading
      if (!perpetualId) {
        setPositions([])
        setIsLoading(false)
        return
      }

      const positionIds = await callContract(
        perpetualId,
        "get_user_positions",
        [toScVal(address, 'address')],
        address
      ) || []

      const result: SubgraphPosition[] = []
      for (const posId of positionIds) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pos: any = await callContract(
            perpetualId,
            "get_position",
            [toScVal(posId.toString(), 'u64')],
            address
          )
          if ((pos?.is_open || pos?.isOpen) && pos.token === tokenAddress) {
            result.push({
              id: posId.toString(),
              positionId: posId.toString(),
              token: { id: tokenAddress, name: "", symbol: "", currentPrice: "0" },
              user: address,
              isLong: pos.is_long ?? pos.isLong ?? false,
              size: pos.size?.toString() || "0",
              margin: pos.margin?.toString() || "0",
              leverage: pos.leverage?.toString() || "1",
              entryPrice: (pos.entry_price || pos.entryPrice)?.toString() || "0",
              entryTime: (pos.entry_time || pos.openedAt)?.toString() || "0",
              isOpen: true,
            })
          }
        } catch { /* skip */ }
      }

      setPositions(result)
    } catch {
      setPositions([])
    }

    setIsLoading(false)
  }, [address, tokenAddress])

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  return { positions, isLoading, refetch: fetchPositions }
}

// Hook to fetch price candles - not available without an indexer
export function useSubgraphCandles(
  _tokenAddress: string,
  _interval: "MINUTE_1" | "MINUTE_5" | "MINUTE_15" | "HOUR_1" | "HOUR_4" | "DAY_1" = "HOUR_1",
  _fromTimestamp?: number
) {
  const [candles] = useState<SubgraphPriceCandle[]>([])
  const [isLoading] = useState(false)

  return { candles, isLoading, refetch: () => {} }
}

// Hook to fetch recent trades - not available without an indexer
export function useSubgraphTrades(_tokenAddress?: string, _first = 50) {
  const [trades] = useState<SubgraphTrade[]>([])
  const [isLoading] = useState(false)

  return { trades, isLoading, refetch: () => {} }
}

// Hook for leaderboard - not available without an indexer
export function useSubgraphLeaderboard(_period = "all-time", _first = 100) {
  const [leaderboard] = useState<Array<{
    user: string
    pnl: string
    volume: string
    trades: string
    winRate: string
  }>>([])
  const [isLoading] = useState(false)

  return { leaderboard, isLoading, refetch: () => {} }
}

// Hook for protocol stats
export function useSubgraphProtocolStats() {
  const [stats, setStats] = useState<{
    totalTokens: string
    totalTrades: string
    totalVolume: string
    totalPositions: string
    totalUsers: string
    totalFeesCollected: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)

    try {
      const factoryId = CONTRACT_IDS.tokenFactory
      if (factoryId) {
        const tokenCount = await callContract(
          factoryId,
          "get_token_count",
          [],
          DUMMY_CALLER
        )

        setStats({
          totalTokens: (tokenCount || 0).toString(),
          totalTrades: "0",
          totalVolume: "0",
          totalPositions: "0",
          totalUsers: "0",
          totalFeesCollected: "0",
        })
      }
    } catch {
      setStats(null)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading, refetch: fetchStats }
}
