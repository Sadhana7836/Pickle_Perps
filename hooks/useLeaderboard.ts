"use client"

import { useState, useMemo, useCallback } from "react"
import { isCopyTradingDeployed } from "@/lib/copyTrading"
import { formatAmount } from "@/lib/soroban"

// ============ Types ============

export type SortBy = "pnl" | "winRate" | "followers" | "volume" | "trades"
export type Timeframe = "24h" | "7d" | "30d" | "all"
export type AssetFilter = "all" | "meme" | "rwa"

export interface LeaderWithStats {
  address: string
  wallet: string
  totalTrades: bigint
  totalBuys: bigint
  totalSells: bigint
  totalVolumeTraded: bigint
  totalPositions: bigint
  openPositions: bigint
  totalPnl: bigint
  winCount: bigint
  lossCount: bigint
  liquidationCount: bigint
  isRegisteredLeader: boolean
  profitShareBps: bigint
  minFollowAmount: bigint
  totalFollowers: bigint
  totalCopiedVolume: bigint
  totalProfitEarned: bigint
  registeredAt: bigint
  isActive: boolean
  pnlFormatted: string
  volumeFormatted: string
  profitEarnedFormatted: string
  minFollowFormatted: string
  profitSharePercent: string
  winRatePercent: string
  rank: number
}

export interface LeaderboardFilters {
  sortBy: SortBy
  timeframe: Timeframe
  assetFilter: AssetFilter
  minFollowers: number
  minTrades: number
  onlyActive: boolean
  onlyRegisteredLeaders: boolean
}

const defaultFilters: LeaderboardFilters = {
  sortBy: "pnl",
  timeframe: "all",
  assetFilter: "all",
  minFollowers: 0,
  minTrades: 1,
  onlyActive: true,
  onlyRegisteredLeaders: false,
}

// ============ Main Hook ============
// Leaderboard data requires an indexer (no subgraph on Stellar yet)
// Returns empty data until an indexing solution is implemented

export const useLeaderboard = (initialFilters: Partial<LeaderboardFilters> = {}) => {
  const [filters, setFilters] = useState<LeaderboardFilters>({
    ...defaultFilters,
    ...initialFilters,
  })
  const [isLoading] = useState(false)

  const isDeployed = isCopyTradingDeployed()

  const leaders = useMemo((): LeaderWithStats[] => {
    return []
  }, [])

  const setSortBy = useCallback((sortBy: SortBy) => {
    setFilters(f => ({ ...f, sortBy }))
  }, [])

  const setTimeframe = useCallback((timeframe: Timeframe) => {
    setFilters(f => ({ ...f, timeframe }))
  }, [])

  const setAssetFilter = useCallback((assetFilter: AssetFilter) => {
    setFilters(f => ({ ...f, assetFilter }))
  }, [])

  const setMinFollowers = useCallback((minFollowers: number) => {
    setFilters(f => ({ ...f, minFollowers }))
  }, [])

  const setOnlyActive = useCallback((onlyActive: boolean) => {
    setFilters(f => ({ ...f, onlyActive }))
  }, [])

  const updateFilters = useCallback((newFilters: Partial<LeaderboardFilters>) => {
    setFilters(f => ({ ...f, ...newFilters }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  const refetch = useCallback(() => {
    setFilters(f => ({ ...f }))
  }, [])

  const stats = useMemo(() => {
    return {
      totalLeaders: 0,
      activeLeaders: 0,
      displayedLeaders: 0,
    }
  }, [])

  return {
    leaders,
    isLoading,
    isDeployed,
    filters,
    stats,
    setSortBy,
    setTimeframe,
    setAssetFilter,
    setMinFollowers,
    setOnlyActive,
    updateFilters,
    resetFilters,
    refetch,
  }
}

// ============ Top Leaders Hook ============

export const useTopLeaders = (limit: number = 5, sortBy: SortBy = "pnl") => {
  const { leaders, isLoading, isDeployed } = useLeaderboard({
    sortBy,
    onlyActive: true,
  })

  return {
    topLeaders: leaders.slice(0, limit),
    isLoading,
    isDeployed,
  }
}

// ============ Search Leaders Hook ============

export const useSearchLeaders = (searchQuery: string) => {
  const { leaders, isLoading, isDeployed } = useLeaderboard({ onlyActive: false })

  const filteredLeaders = useMemo(() => {
    if (!searchQuery.trim()) return leaders

    const query = searchQuery.toLowerCase()
    return leaders.filter(l =>
      l.address.toLowerCase().includes(query)
    )
  }, [leaders, searchQuery])

  return {
    results: filteredLeaders,
    isLoading,
    isDeployed,
  }
}
