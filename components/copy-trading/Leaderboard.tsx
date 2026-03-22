"use client"

import { useState } from "react"
import { Trophy, TrendingUp, Users, BarChart3, Filter, RefreshCw } from "lucide-react"
import { useLeaderboard, SortBy, LeaderWithStats } from "@/hooks/useLeaderboard"
import { LeaderCard } from "./LeaderCard"

interface LeaderboardProps {
  onLeaderClick?: (leader: LeaderWithStats) => void
  onSubscribe?: (leader: LeaderWithStats) => void
  subscribedLeaders?: Set<string>
  compact?: boolean
  limit?: number
  onlyRegisteredLeaders?: boolean
}

const sortOptions: { value: SortBy; label: string; icon: React.ReactNode }[] = [
  { value: "pnl", label: "PnL", icon: <TrendingUp className="w-4 h-4" /> },
  { value: "trades", label: "Trades", icon: <BarChart3 className="w-4 h-4" /> },
  { value: "winRate", label: "Win Rate", icon: <Trophy className="w-4 h-4" /> },
  { value: "volume", label: "Volume", icon: <Users className="w-4 h-4" /> },
]

export function Leaderboard({
  onLeaderClick,
  onSubscribe,
  subscribedLeaders = new Set(),
  compact = false,
  limit,
  onlyRegisteredLeaders = false,
}: LeaderboardProps) {
  const {
    leaders,
    isLoading,
    isDeployed,
    filters,
    stats,
    setSortBy,
    setOnlyActive,
    refetch,
  } = useLeaderboard({ onlyRegisteredLeaders })

  const [showFilters, setShowFilters] = useState(false)

  const displayedLeaders = limit ? leaders.slice(0, limit) : leaders

  if (!isDeployed) {
    return (
      <div className="bg-[var(--background)] border border-[var(--card-bg)] rounded-lg p-8 text-center">
        <Trophy className="w-12 h-12 mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Copy Trading Coming Soon</h3>
        <p className="text-sm text-gray-400">
          The copy trading contract is not yet deployed. Check back soon!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-white">
            {onlyRegisteredLeaders ? "Copy Leaders" : "Top Traders"}
          </h2>
          <span className="text-xs text-gray-500 bg-[var(--card-bg)] px-2 py-0.5 rounded">
            {stats.totalLeaders} {onlyRegisteredLeaders ? "leaders" : "traders"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded transition-colors ${
              showFilters ? "bg-[var(--card-bg)] text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-[var(--background)] border border-[var(--card-bg)] rounded-lg p-4 space-y-4">
          {/* Sort Options */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Sort By</label>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                    filters.sortBy === option.value
                      ? "bg-green-600 text-white"
                      : "bg-[var(--card-bg)] text-gray-400 hover:text-white"
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Only Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Show only active leaders</label>
            <button
              onClick={() => setOnlyActive(!filters.onlyActive)}
              className={`w-10 h-5 rounded-full transition-colors ${
                filters.onlyActive ? "bg-green-600" : "bg-[#333]"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  filters.onlyActive ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Leaders List */}
      {isLoading && leaders.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--background)] border border-[var(--card-bg)] rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--card-bg)] rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-[var(--card-bg)] rounded w-24" />
                  <div className="h-3 bg-[var(--card-bg)] rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayedLeaders.length === 0 ? (
        <div className="bg-[var(--background)] border border-[var(--card-bg)] rounded-lg p-6">
          <div className="flex items-start gap-6">
            {/* Left - Empty State */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[var(--card-bg)] rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">No Copy Leaders</h3>
                  <p className="text-sm text-gray-500">Be the first to register as a leader</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">Subgraph syncing... Leaders will appear once indexed</p>
            </div>

            {/* Right - How It Works */}
            <div className="w-72 bg-[var(--sidebar-bg)] border border-[var(--card-bg)] rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3">How It Works</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-600/20 text-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-medium">
                    1
                  </div>
                  <p className="text-xs text-gray-400">Choose a leader based on their performance</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-600/20 text-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-medium">
                    2
                  </div>
                  <p className="text-xs text-gray-400">Set your allocation and risk limits</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-600/20 text-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-medium">
                    3
                  </div>
                  <p className="text-xs text-gray-400">Copy trades automatically or manually approve</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={compact ? "space-y-2" : "grid gap-4 md:grid-cols-2 lg:grid-cols-3"}>
          {displayedLeaders.map((leader) => (
            <LeaderCard
              key={leader.address}
              leader={leader}
              onClick={onLeaderClick}
              onSubscribe={onSubscribe}
              isSubscribed={subscribedLeaders.has(leader.address.toLowerCase())}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* View More */}
      {limit && leaders.length > limit && (
        <button
          onClick={() => onLeaderClick?.(leaders[0])}
          className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          View all {stats.totalLeaders} leaders
        </button>
      )}
    </div>
  )
}

export default Leaderboard
